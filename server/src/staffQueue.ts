import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import {
  blockPendingPasswordChange,
  csrfProtection,
  forbidden,
  invalidQuery,
  parseIntParam,
  requireAuth,
  requireRole,
} from "./middleware.js";
import { isStaffOrAdminRole } from "./roles.js";

export const staffQueueRouter = ((): any => {
  const router: any = (require("express") as typeof import("express")).Router();
  router.use(requireAuth, blockPendingPasswordChange, requireRole("IT_STAFF", "ADMIN"));
  router.get("/", csrfProtection, getStaffQueue);
  router.get("/tickets", csrfProtection, getStaffQueue);
  router.get("/tickets/", csrfProtection, getStaffQueue);
  return router;
})();

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

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const VALID_SORT_COLUMNS = ["createdAt", "updatedAt", "requestedPriority", "itPriority", "status"] as const;

const UNASSIGNED_MARKERS = new Set(["null", "unassigned"]);

function valueOf(v: unknown): string | null {
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === "string" ? first : first === undefined ? null : String(first);
  }
  return typeof v === "string" ? v : v === undefined ? null : String(v);
}

function isStaffOrAdmin(user: { role: string } | undefined): boolean {
  return !!user && isStaffOrAdminRole(user.role as any);
}

export async function getStaffQueue(req: Request, res: Response) {
  if (!req.user || !isStaffOrAdmin(req.user)) {
    return forbidden(res);
  }

  const query = req.query as Record<string, unknown>;
  const page = Math.max(1, Number(valueOf(query.page)) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(valueOf(query.pageSize)) || 20));

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
      // fields.status = "Status is invalid.";
    }
  }
  if (requestedPriorityRaw !== null) {
    if (VALID_PRIORITIES.includes(requestedPriorityRaw as (typeof VALID_PRIORITIES)[number])) {
      requestedPriority = requestedPriorityRaw as (typeof VALID_PRIORITIES)[number];
    } else {
      // fields.requestedPriority = "Requested Priority is invalid.";
    }
  }
  if (itPriorityRaw !== null) {
    if (VALID_PRIORITIES.includes(itPriorityRaw as (typeof VALID_PRIORITIES)[number])) {
      itPriority = itPriorityRaw as (typeof VALID_PRIORITIES)[number];
    } else {
      // fields.itPriority = "IT Priority is invalid.";
    }
  }
  if (ownerIdRaw !== null) {
    if (UNASSIGNED_MARKERS.has(ownerIdRaw)) {
      ownerId = "unassigned";
    } else if (ownerIdRaw === "me") {
      ownerId = req.user.id;
    } else {
      const n = Number(ownerIdRaw);
      if (!Number.isInteger(n) || n < 1) {
        // fields.ownerId = "Owner id must be a positive integer, 'null' or 'unassigned'.";
      } else {
        ownerId = n;
      }
    }
  }

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
      // fields.sort = "Sort value is invalid.";
    }
  }

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

    return res.status(200).json({
      items: tickets.map((t) => ({
        ticketNumber: t.ticketNumber,
        id: t.id,
        summary: t.summary,
        category: t.category,
        requester: t.requester,
        owner: t.owner,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages },
      filtersApplied,
    });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load the ticket queue." } });
  }
}
