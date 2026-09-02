import express, { Request, Response } from "express";
import cors from "cors";
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

export default app;
