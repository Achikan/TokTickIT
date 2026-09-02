import express, { Request, Response } from "express";
import cors from "cors";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { formatTicketNumber } from "./ticketNumber.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// GET /api/categories -> read categories from PostgreSQL via Prisma,
//   returning each { id, name } in predictable (id) order.
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({ orderBy: { id: "asc" } });
    res.status(200).json(categories.map(({ id, name }) => ({ id, name })));
  } catch {
    res.status(500).json({ error: "Unable to load categories" });
  }
});

// ---------------------------------------------------------------------------
// Issue 8 — Related Systems reference data for the Create Ticket form.
// GET /api/related-systems -> only ACTIVE systems, in id order.
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json({
      items: systems.map(({ id, name, type }) => ({ id, name, type })),
    });
  } catch {
    res.status(500).json({ error: "Unable to load related systems" });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Development Requester context (testing-only "login")
// GET /api/development-requesters -> only ACTIVE requesters, in id order.
// The inactive requester must never appear in the selection dropdown.
// ---------------------------------------------------------------------------
app.get("/api/development-requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json({
      items: requesters.map(({ id, name, email }) => ({ id, name, email })),
    });
  } catch {
    res.status(500).json({ error: "Unable to load development requesters" });
  }
});

// ---------------------------------------------------------------------------
// Issue 8 — Create a Ticket
// POST /api/tickets -> validate input, persist, return 201 with the official
// Ticket Number and backend-generated values (api-spec.md §4).
// ---------------------------------------------------------------------------
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

app.post("/api/tickets", async (req: Request, res: Response) => {
  const headerRequesterId = req.header("X-Requester-Id") ?? "";
  if (headerRequesterId === "") {
    return res
      .status(403)
      .json({ error: { code: "FORBIDDEN", message: "Missing X-Requester-Id header" } });
  }

  const { requesterId, summary, description, categoryId, relatedSystemId, requestedPriority } =
    req.body ?? {};

  const fields: Record<string, string> = {};
  const trimSummary = typeof summary === "string" ? summary.trim() : "";
  const trimDescription = typeof description === "string" ? description.trim() : "";

  if (!Number.isInteger(requesterId)) {
    fields.requesterId = "A Development Requester is required.";
  }
  if (trimSummary === "") fields.summary = "Summary is required.";
  if (trimDescription === "") fields.description = "Description is required.";
  if (!Number.isInteger(categoryId)) {
    fields.categoryId = "Category is required.";
  }
  if (!Number.isInteger(relatedSystemId)) {
    fields.relatedSystemId = "Related System is required.";
  }

  let priority: (typeof VALID_PRIORITIES)[number] = "MEDIUM";
  if (requestedPriority !== undefined && requestedPriority !== null && requestedPriority !== "") {
    if (VALID_PRIORITIES.includes(requestedPriority)) {
      priority = requestedPriority;
    } else {
      fields.requestedPriority = "Requested Priority is invalid.";
    }
  }

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } });
  }

  if (headerRequesterId !== String(requesterId)) {
    return res
      .status(403)
      .json({
        error: {
          code: "FORBIDDEN", 
          message: "X-Requester-Id does not match the requester in the request body.",
        },
      });
  }

  try {
    const prisma = getPrisma();

    const requester = await prisma.developmentRequester.findUnique({
      where: { id: requesterId },
    });
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    const system = await prisma.relatedSystem.findUnique({ where: { id: relatedSystemId } });

    if (!requester || !requester.active) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Requester not found." } });
    }
    if (!category || !category.active) {
      fields.categoryId = "Category does not exist or is inactive.";
    }
    if (!system || !system.active) {
      fields.relatedSystemId = "Related System does not exist or is inactive.";
    }
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } });
    }

    const ticketCount = await prisma.ticket.count();
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: formatTicketNumber(ticketCount + 1),
        summary: trimSummary,
        description: trimDescription,
        requesterId: requester.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: priority,
      },
      include: { category: true, relatedSystem: true },
    });

    res.status(201).json({
      ticket: {
        ticketNumber: ticket.ticketNumber,
        id: ticket.id,
        summary: ticket.summary,
        description: ticket.description,
        requesterId: ticket.requesterId,
        category: { id: ticket.category.id, name: ticket.category.name },
        relatedSystem: { id: ticket.relatedSystem.id, name: ticket.relatedSystem.name },
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to create ticket" } });
  }
});

// ---------------------------------------------------------------------------
// Issue 9 — My Tickets (list, requester-scoped)
// GET /api/tickets?search=&categoryId=&relatedSystemId=&status=&requestedPriority=&sort=&page=&pageSize=
//   -> only Tickets owned by X-Requester-Id (BR-04); search/filter/sort/pagination per api-spec.md §5.
//   Invalid page/size/sort/filter values are rejected with 400 (BR-10), never silently ignored.
// ---------------------------------------------------------------------------
const VALID_STATUSES = ["SUBMITTED", "IN_PROGRESS", "RESOLVED"] as const;
const VALID_SORT_COLUMNS = [
  "ticketNumber",
  "summary",
  "requestedPriority",
  "itPriority",
  "currentStatus",
  "createdAt",
  "updatedAt",
] as const;

app.get("/api/tickets", async (req: Request, res: Response) => {
  const headerRequesterId = req.header("X-Requester-Id") ?? "";
  if (headerRequesterId === "") {
    return res
      .status(403)
      .json({ error: { code: "FORBIDDEN", message: "Missing X-Requester-Id header" } });
  }

  const fields: Record<string, string> = {};
  const query = req.query;

  const parseIntParam = (value: unknown, name: string, max?: number): number | null => {
    if (value === undefined) return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || (max !== undefined && n > max)) {
      fields[name] = `${name} must be an integer${max ? ` between 1 and ${max}` : " >= 1"}.`;
      return null;
    }
    return n;
  };

  const page = parseIntParam(query.page, "page") ?? 1;
  const pageSize = parseIntParam(query.pageSize, "pageSize", 50) ?? 10;

  const valueOf = (value: unknown): string | null =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null;

  const search = valueOf(query.search);
  const categoryIdRaw = valueOf(query.categoryId);
  const relatedSystemIdRaw = valueOf(query.relatedSystemId);
  const statusRaw = valueOf(query.status);
  const priorityRaw = valueOf(query.requestedPriority);
  const sortRaw = valueOf(query.sort);

  let categoryId: number | null = null;
  let relatedSystemId: number | null = null;
  let status: (typeof VALID_STATUSES)[number] | null = null;
  let priority: (typeof VALID_PRIORITIES)[number] | null = null;

  if (categoryIdRaw !== null) {
    const n = Number(categoryIdRaw);
    if (!Number.isInteger(n) || n < 1) {
      fields.categoryId = "Category id must be a positive integer.";
    } else {
      categoryId = n;
    }
  }
  if (relatedSystemIdRaw !== null) {
    const n = Number(relatedSystemIdRaw);
    if (!Number.isInteger(n) || n < 1) {
      fields.relatedSystemId = "Related system id must be a positive integer.";
    } else {
      relatedSystemId = n;
    }
  }

  if (statusRaw !== null) {
    if (VALID_STATUSES.includes(statusRaw as (typeof VALID_STATUSES)[number])) {
      status = statusRaw as (typeof VALID_STATUSES)[number];
    } else {
      fields.status = "Status is invalid.";
    }
  }
  if (priorityRaw !== null) {
    if (VALID_PRIORITIES.includes(priorityRaw as (typeof VALID_PRIORITIES)[number])) {
      priority = priorityRaw as (typeof VALID_PRIORITIES)[number];
    } else {
      fields.requestedPriority = "Requested Priority is invalid.";
    }
  }

  // Primary sort (from `sort`), always followed by a deterministic secondary
  // sort on createdAt (desc) and id (asc) so equal-principal rows stay
  // ordered predictably (secondary-sort guideline).
  let orderBy: Prisma.TicketOrderByWithRelationInput[] = [
    { createdAt: "desc" },
    { id: "asc" },
  ];
  if (sortRaw !== null) {
    const match = /^([+-]?)([A-Za-z]+)$/.exec(sortRaw);
    const column = match?.[2] ?? "";
    if (match && (VALID_SORT_COLUMNS as readonly string[]).includes(column)) {
      const dir = match[1] === "-" ? "desc" : "asc";
      orderBy = [
        { [column]: dir } as Prisma.TicketOrderByWithRelationInput,
        ...(column === "createdAt"
          ? []
          : ([{ createdAt: "desc" }] as Prisma.TicketOrderByWithRelationInput[])),
        { id: "asc" },
      ];
    } else {
      fields.sort = "Sort value is invalid.";
    }
  }

  if (Object.keys(fields).length > 0) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid query parameters.", fields } });
  }

  try {
    const prisma = getPrisma();
    const requester = await prisma.developmentRequester.findUnique({
      where: { id: Number(headerRequesterId) },
    });
    if (!requester || !requester.active) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Requester not found." } });
    }

    const where: Record<string, unknown> = { requesterId: requester.id };
    if (search) {
      where.OR = [
        { summary: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { ticketNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId !== null) where.categoryId = categoryId;
    if (relatedSystemId !== null) where.relatedSystemId = relatedSystemId;
    if (status !== null) where.currentStatus = status;
    if (priority !== null) where.requestedPriority = priority;

    const total = await prisma.ticket.count({ where });
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true },
    });

    const filtersApplied: Record<string, unknown> = {};
    if (search) filtersApplied.search = search;
    if (categoryIdRaw !== null) filtersApplied.categoryId = categoryIdRaw;
    if (relatedSystemIdRaw !== null) filtersApplied.relatedSystemId = relatedSystemIdRaw;
    if (statusRaw !== null) filtersApplied.status = statusRaw;
    if (priorityRaw !== null) filtersApplied.requestedPriority = priorityRaw;

    res.status(200).json({
      items: tickets.map((t) => ({
        ticketNumber: t.ticketNumber,
        id: t.id,
        summary: t.summary,
        category: { id: t.category.id, name: t.category.name },
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        updatedAt: t.updatedAt,
      })),
      pagination: { page, pageSize, total, totalPages },
      filtersApplied,
    });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to list tickets" } });
  }
});

export default app;
