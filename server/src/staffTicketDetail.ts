import { Router, type Request, type Response } from "express";
import type { Prisma, Priority, Status } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import {
  blockPendingPasswordChange,
  requireAuth,
  requireRole,
} from "./middleware.js";

// ---------------------------------------------------------------------------
// Lab 3 (Issue 22) — IT Staff Ticket Detail (api-spec.md §6.2..§6.5, §8.4).
//   GET   /api/staff/tickets/:id          full detail for staff operations
//   PATCH /api/staff/tickets/:id/owner    claim / assign / reassign (BR-07)
//   PATCH /api/staff/tickets/:id/priority update IT Priority (BR-08)
//   PATCH /api/staff/tickets/:id/status   permitted status transitions (BR-09)
//
// Only IT Staff and Administrators may reach these endpoints (AC-10). A
// Requester is forbidden with no data. Every transition is validated
// server-side against the approved matrix in specification.md §5.2.
// ---------------------------------------------------------------------------

export const staffTicketDetailRouter = Router();

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

// specification.md §5.2 — rows in, the statuses each may move to. Any pair not
// listed here is a forbidden transition and is rejected with a safe 409.
const TRANSITIONS: Record<Status, readonly Status[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

const ELIGIBLE_OWNER_ROLES: readonly ("IT_STAFF" | "ADMIN")[] = ["IT_STAFF", "ADMIN"];

function notFound(res: Response) {
  return res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
}

function validationError(res: Response, fields: Record<string, string>) {
  return res
    .status(400)
    .json({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } });
}

function forbiddenTransition(res: Response, from: Status, to: Status) {
  return res.status(409).json({
    error: {
      code: "INVALID_TRANSITION",
      message: `A Ticket cannot move from ${from} to ${to}.`,
    },
  });
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

const SUMMARY_INCLUDE = {
  category: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

type TicketWithSummary = Prisma.TicketGetPayload<{ include: typeof SUMMARY_INCLUDE }>;

// The "Ticket summary" shape returned by the operational PATCH endpoints
// (api-spec.md §6.3..§6.5) so the queue/detail can refresh a row in place.
function summaryShape(t: TicketWithSummary) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    category: { id: t.category.id, name: t.category.name },
    requester: { id: t.requester.id, name: t.requester.name },
    owner: t.owner ? { id: t.owner.id, name: t.owner.name } : null,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    currentStatus: t.currentStatus,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

const commentShape = (row: {
  id: number;
  ticketId: number;
  content: string;
  createdAt: Date;
  author: { id: number; name: string };
}) => ({
  id: row.id,
  ticketId: row.ticketId,
  content: row.content,
  author: { id: row.author.id, name: row.author.name },
  createdAt: row.createdAt,
});

// ---------------------------------------------------------------------------
// GET /api/staff/tickets/:id — full detail for IT Staff/Admin (FR-13, §6.2).
// Includes requester, owner, priorities, status, attachments metadata, Public
// Comments, Internal Notes and the Requester's resolution indication.
// ---------------------------------------------------------------------------
staffTicketDetailRouter.get(
  "/tickets/:id",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    if (id === null) return notFound(res);

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          requester: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true, type: true } },
          attachments: { orderBy: { uploadedAt: "desc" } },
          comments: {
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            include: { author: { select: { id: true, name: true } } },
          },
          notes: {
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            include: { author: { select: { id: true, name: true } } },
          },
        },
      });
      if (!ticket) return notFound(res);

      // Eligible assignment targets so the ownership control can assign or
      // reassign to any active IT Staff or Administrator (BR-07).
      const availableOwners = await prisma.user.findMany({
        where: { active: true, role: { in: [...ELIGIBLE_OWNER_ROLES] } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      return res.status(200).json({
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          summary: ticket.summary,
          description: ticket.description,
          requester: { id: ticket.requester.id, name: ticket.requester.name },
          owner: ticket.owner
            ? { id: ticket.owner.id, name: ticket.owner.name }
            : null,
          category: { id: ticket.category.id, name: ticket.category.name },
          relatedSystem: {
            id: ticket.relatedSystem.id,
            name: ticket.relatedSystem.name,
            type: ticket.relatedSystem.type,
          },
          requestedPriority: ticket.requestedPriority,
          itPriority: ticket.itPriority,
          currentStatus: ticket.currentStatus,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          requesterIndicatedResolvedAt: ticket.requesterIndicatedResolvedAt,
          attachments: ticket.attachments.map((a) => ({
            id: a.id,
            ticketId: a.ticketId,
            originalName: a.originalName,
            mimeType: a.mimeType,
            size: a.size,
            uploadedAt: a.uploadedAt,
            removedAt: a.removedAt,
            removedReason: a.removedReason,
          })),
          comments: ticket.comments.map(commentShape),
          notes: ticket.notes.map(commentShape),
          availableOwners,
        },
      });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to load ticket." } });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/owner — claim / assign / reassign (FR-14, §6.3).
// ownerId must reference an active user whose role is IT Staff or Administrator
// (BR-07); any other target is a 400, and a Requester caller is a 403.
// ---------------------------------------------------------------------------
staffTicketDetailRouter.patch(
  "/tickets/:id/owner",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const ownerId = req.body?.ownerId;
    if (!Number.isInteger(ownerId) || ownerId < 1) {
      return validationError(res, { ownerId: "Owner id must be a positive integer." });
    }

    const id = parseId(req.params.id);
    if (id === null) return notFound(res);

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
      if (!ticket) return notFound(res);

      const target = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, active: true, role: true },
      });
      if (
        !target ||
        !target.active ||
        !ELIGIBLE_OWNER_ROLES.includes(target.role as "IT_STAFF" | "ADMIN")
      ) {
        return validationError(res, {
          ownerId: "Owner must be an active IT Staff or Administrator user.",
        });
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: { ownerId: target.id },
        include: SUMMARY_INCLUDE,
      });

      return res.status(200).json({ ticket: summaryShape(updated) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to update the ticket owner." } });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/priority — update IT Priority (FR-15, §6.4).
// ---------------------------------------------------------------------------
staffTicketDetailRouter.patch(
  "/tickets/:id/priority",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const itPriority = req.body?.itPriority;
    if (
      typeof itPriority !== "string" ||
      !VALID_PRIORITIES.includes(itPriority as (typeof VALID_PRIORITIES)[number])
    ) {
      return validationError(res, { itPriority: "IT Priority is invalid." });
    }

    const id = parseId(req.params.id);
    if (id === null) return notFound(res);

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
      if (!ticket) return notFound(res);

      const updated = await prisma.ticket.update({
        where: { id },
        data: { itPriority: itPriority as Priority },
        include: SUMMARY_INCLUDE,
      });

      return res.status(200).json({ ticket: summaryShape(updated) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to update IT Priority." } });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/status — permitted status transition (FR-16,
// §6.5). Unknown enum values are a 400; transitions outside the §5.2 matrix are
// a specific 409 (BR-09).
// ---------------------------------------------------------------------------
staffTicketDetailRouter.patch(
  "/tickets/:id/status",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const newStatus = req.body?.newStatus;
    if (
      typeof newStatus !== "string" ||
      !VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])
    ) {
      return validationError(res, { newStatus: "Status is invalid." });
    }

    const id = parseId(req.params.id);
    if (id === null) return notFound(res);

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        select: { id: true, currentStatus: true },
      });
      if (!ticket) return notFound(res);

      const from = ticket.currentStatus;
      const to = newStatus as Status;
      if (!TRANSITIONS[from].includes(to)) {
        return forbiddenTransition(res, from, to);
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: { currentStatus: to },
        include: SUMMARY_INCLUDE,
      });

      return res.status(200).json({ ticket: summaryShape(updated) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to update the ticket status." } });
    }
  }
);
