import { Router, type Request, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import {
  blockPendingPasswordChange,
  requireAuth,
  requireRole,
} from "./middleware.js";

// ---------------------------------------------------------------------------
// Lab 3 (Issue 21) — IT Staff Ticket Queue (api-spec.md §6.1, labs-sheet §8.3).
//   GET /api/staff/tickets?search=&status=&requestedPriority=&itPriority=
//       &ownerId=&categoryId=&relatedSystemId=&sort=&page=&pageSize=
//
// Search, filters, sorting, pagination, metadata and documented invalid-query
// behavior (FR-12, AC-13). IT Staff and Administrators may view the whole
// queue; a Requester is forbidden with no data (AC-10, BR-10). Invalid query
// parameters always fail with a specific 400 — never silently ignored.
// ---------------------------------------------------------------------------

export const staffQueueRouter = Router();

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const VALID_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;
const VALID_SORT_COLUMNS = [
  "ticketNumber",
  "summary",
  "requestedPriority",
  "itPriority",
  "currentStatus",
  "createdAt",
  "updatedAt",
] as const;

// Owner filter accepts a positive integer id, or "null" / "unassigned" to
// select Tickets with no primary owner (api-spec.md §6.1).
const UNASSIGNED_MARKERS = new Set(["null", "unassigned"]);

function invalidQuery(res: Response, fields: Record<string, string>) {
  return res
    .status(400)
    .json({ error: { code: "VALIDATION_ERROR", message: "Invalid query parameters.", fields } });
}

function valueOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

staffQueueRouter.get(
  "/tickets",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const fields: Record<string, string> = {};
    const query = req.query;

    const parseIntParam = (value: unknown, name: string, max?: number): number | null => {
      if (value === undefined || value === null) return null;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || (max !== undefined && n > max)) {
        fields[name] = `${name} must be an integer${max ? ` between 1 and ${max}` : " >= 1"}.`;
        return null;
      }
      return n;
    };

    const page = parseIntParam(query.page, "page") ?? 1;
    const pageSize = parseIntParam(query.pageSize, "pageSize", 50) ?? 10;

    const search = valueOf(query.search);
    const statusRaw = valueOf(query.status);
    const requestedPriorityRaw = valueOf(query.requestedPriority);
    const itPriorityRaw = valueOf(query.itPriority);
    const ownerIdRaw = valueOf(query.ownerId);
    const categoryIdRaw = valueOf(query.categoryId);
    const relatedSystemIdRaw = valueOf(query.relatedSystemId);
    const sortRaw = valueOf(query.sort);

    let status: (typeof VALID_STATUSES)[number] | null = null;
    let requestedPriority: (typeof VALID_PRIORITIES)[number] | null = null;
    let itPriority: (typeof VALID_PRIORITIES)[number] | null = null;
    let ownerId: number | null | "unassigned" = null;
    let categoryId: number | null = null;
    let relatedSystemId: number | null = null;

    const categoryIdNum = parseIntParam(categoryIdRaw, "categoryId");
    const relatedSystemIdNum = parseIntParam(relatedSystemIdRaw, "relatedSystemId");
    if (categoryIdNum !== null) categoryId = categoryIdNum;
    if (relatedSystemIdNum !== null) relatedSystemId = relatedSystemIdNum;

    if (statusRaw !== null) {
      if (VALID_STATUSES.includes(statusRaw as (typeof VALID_STATUSES)[number])) {
        status = statusRaw as (typeof VALID_STATUSES)[number];
      } else {
        fields.status = "Status is invalid.";
      }
    }
    if (requestedPriorityRaw !== null) {
      if (VALID_PRIORITIES.includes(requestedPriorityRaw as (typeof VALID_PRIORITIES)[number])) {
        requestedPriority = requestedPriorityRaw as (typeof VALID_PRIORITIES)[number];
      } else {
        fields.requestedPriority = "Requested Priority is invalid.";
      }
    }
    if (itPriorityRaw !== null) {
      if (VALID_PRIORITIES.includes(itPriorityRaw as (typeof VALID_PRIORITIES)[number])) {
        itPriority = itPriorityRaw as (typeof VALID_PRIORITIES)[number];
      } else {
        fields.itPriority = "IT Priority is invalid.";
      }
    }
    if (ownerIdRaw !== null) {
      if (UNASSIGNED_MARKERS.has(ownerIdRaw)) {
        ownerId = "unassigned";
      } else {
        const n = Number(ownerIdRaw);
        if (!Number.isInteger(n) || n < 1) {
          fields.ownerId = "Owner id must be a positive integer, 'null' or 'unassigned'.";
        } else {
          ownerId = n;
        }
      }
    }

    // Primary sort (from `sort`), always followed by a deterministic secondary
    // sort on createdAt (desc) and id (asc) so equal rows stay ordered.
    let orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { updatedAt: "desc" },
      { id: "asc" },
    ];
    if (sortRaw !== null) {
      const match = /^([+-]?)([A-Za-z]+)$/.exec(sortRaw);
      const column = match?.[2] ?? "";
      if (match && (VALID_SORT_COLUMNS as readonly string[]).includes(column)) {
        const dir = match[1] === "-" ? "desc" : "asc";
        orderBy = [
          { [column]: dir } as Prisma.TicketOrderByWithRelationInput,
          ...(column === "updatedAt" || column === "createdAt"
            ? []
            : ([{ updatedAt: "desc" }] as Prisma.TicketOrderByWithRelationInput[])),
          { id: "asc" },
        ];
      } else {
        fields.sort = "Sort value is invalid.";
      }
    }

    if (Object.keys(fields).length > 0) return invalidQuery(res, fields);

    try {
      const where: Prisma.TicketWhereInput = {};
      if (search) {
        where.OR = [
          { summary: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { ticketNumber: { contains: search, mode: "insensitive" } },
        ];
      }
      if (status !== null) where.currentStatus = status;
      if (requestedPriority !== null) where.requestedPriority = requestedPriority;
      if (itPriority !== null) where.itPriority = itPriority;
      if (ownerId === "unassigned") where.ownerId = null;
      else if (ownerId !== null) where.ownerId = ownerId;
      if (categoryId !== null) where.categoryId = categoryId;
      if (relatedSystemId !== null) where.relatedSystemId = relatedSystemId;

      const prisma = getPrisma();
      const total = await prisma.ticket.count({ where });
      const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
      const tickets = await prisma.ticket.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: true,
          requester: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
      });

      const filtersApplied: Record<string, unknown> = {};
      if (search) filtersApplied.search = search;
      if (statusRaw !== null) filtersApplied.status = statusRaw;
      if (requestedPriorityRaw !== null) filtersApplied.requestedPriority = requestedPriorityRaw;
      if (itPriorityRaw !== null) filtersApplied.itPriority = itPriorityRaw;
      if (ownerIdRaw !== null) filtersApplied.ownerId = ownerIdRaw;
      if (categoryIdRaw !== null) filtersApplied.categoryId = categoryIdRaw;
      if (relatedSystemIdRaw !== null) filtersApplied.relatedSystemId = relatedSystemIdRaw;

      res.status(200).json({
        items: tickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          id: t.id,
          summary: t.summary,
          category: { id: t.category.id, name: t.category.name },
          requester: t.requester,
          owner: t.owner,
          requestedPriority: t.requestedPriority,
          itPriority: t.itPriority,
          currentStatus: t.currentStatus,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        pagination: { page, pageSize, total, totalPages },
        filtersApplied,
      });
    } catch {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to list tickets" } });
    }
  }
);