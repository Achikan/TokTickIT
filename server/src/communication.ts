import { Router, type Request, type Response } from "express";
import { getPrisma } from "./prisma.js";
import {
  blockPendingPasswordChange,
  requireAuth,
  requireRole,
} from "./middleware.js";

// ---------------------------------------------------------------------------
// Lab 3 (Issue 20) — Requester communication on a Ticket (api-spec.md §4, §5).
//   POST /api/tickets/:id/comments              (Requester own; IT Staff/Admin)
//   GET  /api/tickets/:id/comments              (same)
//   POST /api/tickets/:id/resolved-indication   (Requester own)
//   POST /api/tickets/:id/notes                 (IT Staff/Admin only)
//   GET  /api/tickets/:id/notes                 (IT Staff/Admin only)
//
// Ownership comes from the authenticated session (BR-06); foreign/missing
// Tickets and notes are non-disclosing (BR-21). Comments/Notes are append-only
// (BR-12).
// ---------------------------------------------------------------------------

export const ticketCommunicationRouter = Router();

const MAX_CONTENT_LENGTH = 2000;

const ticketNotFound = (res: Response) =>
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });

function validationError(res: Response, fields: Record<string, string>) {
  return res
    .status(400)
    .json({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } });
}

function validateContent(value: unknown): Record<string, string> {
  const fields: Record<string, string> = {};
  const content = typeof value === "string" ? value.trim() : "";
  if (content === "") {
    fields.content = "Content is required.";
  } else if (content.length > MAX_CONTENT_LENGTH) {
    fields.content = `Content must be ${MAX_CONTENT_LENGTH} characters or fewer.`;
  }
  return fields;
}

interface AccessibleTicket {
  id: number;
  requesterId: number;
  ticketNumber: string;
  currentStatus: string;
  requesterIndicatedResolvedAt: Date | null;
}

// Loads a ticket and checks the caller may reach it: IT Staff/Admin may reach
// any ticket; a Requester only their own. Returns null when missing or foreign.
async function resolveAccessibleTicket(req: Request, rawId: string): Promise<AccessibleTicket | null> {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return null;

  const ticket = await getPrisma().ticket.findUnique({
    where: { id },
    select: {
      id: true,
      requesterId: true,
      ticketNumber: true,
      currentStatus: true,
      requesterIndicatedResolvedAt: true,
    },
  });
  if (!ticket) return null;

  const user = req.user!;
  if (user.role === "REQUESTER" && ticket.requesterId !== user.id) return null;
  return ticket as AccessibleTicket;
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

// POST /api/tickets/:id/comments — Public Comment (FR-10, FR-17, BR-12).
ticketCommunicationRouter.post(
  "/:id/comments",
  requireAuth,
  blockPendingPasswordChange,
  async (req: Request, res: Response) => {
    try {
      const ticket = await resolveAccessibleTicket(req, req.params.id);
      if (!ticket) return ticketNotFound(res);

      const fields = validateContent(req.body?.content);
      if (Object.keys(fields).length > 0) return validationError(res, fields);

      const comment = await getPrisma().publicComment.create({
        data: {
          ticketId: ticket.id,
          authorId: req.user!.id,
          content: req.body.content.trim(),
        },
        include: { author: { select: { id: true, name: true } } },
      });

      return res.status(201).json({ comment: commentShape(comment) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to post comment." } });
    }
  }
);

// GET /api/tickets/:id/comments — comments visible to all three roles (AC-17).
ticketCommunicationRouter.get(
  "/:id/comments",
  requireAuth,
  blockPendingPasswordChange,
  async (req: Request, res: Response) => {
    try {
      const ticket = await resolveAccessibleTicket(req, req.params.id);
      if (!ticket) return ticketNotFound(res);

      const rows = await getPrisma().publicComment.findMany({
        where: { ticketId: ticket.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: { author: { select: { id: true, name: true } } },
      });

      return res.status(200).json({ items: rows.map(commentShape) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to load comments." } });
    }
  }
);

// POST /api/tickets/:id/resolved-indication — "Problem Appears Resolved"
// (FR-11, BR-11). Idempotent and does not change the status.
ticketCommunicationRouter.post(
  "/:id/resolved-indication",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("REQUESTER"),
  async (req: Request, res: Response) => {
    try {
      const ticket = await resolveAccessibleTicket(req, req.params.id);
      if (!ticket) return ticketNotFound(res);

      const updated = await getPrisma().ticket.update({
        where: { id: ticket.id },
        data:
          ticket.requesterIndicatedResolvedAt === null
            ? { requesterIndicatedResolvedAt: new Date() }
            : {},
        select: {
          id: true,
          ticketNumber: true,
          currentStatus: true,
          requesterIndicatedResolvedAt: true,
        },
      });

      return res.status(200).json({ ticket: updated });
    } catch {
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unable to record your indication." },
      });
    }
  }
);

const noteShape = (row: {
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

// POST /api/tickets/:id/notes — Internal Note (FR-18, BR-10/BR-12). Only
// IT Staff/Admin; a Requester is forbidden without any note data (AC-04).
ticketCommunicationRouter.post(
  "/:id/notes",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const ticket = await resolveAccessibleTicket(req, req.params.id);
      if (!ticket) return ticketNotFound(res);

      const fields = validateContent(req.body?.content);
      if (Object.keys(fields).length > 0) return validationError(res, fields);

      const note = await getPrisma().internalNote.create({
        data: {
          ticketId: ticket.id,
          authorId: req.user!.id,
          content: req.body.content.trim(),
        },
        include: { author: { select: { id: true, name: true } } },
      });

      return res.status(201).json({ note: noteShape(note) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to save note." } });
    }
  }
);

// GET /api/tickets/:id/notes — Internal Notes, IT Staff/Admin only (AC-04).
ticketCommunicationRouter.get(
  "/:id/notes",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const ticket = await resolveAccessibleTicket(req, req.params.id);
      if (!ticket) return ticketNotFound(res);

      const rows = await getPrisma().internalNote.findMany({
        where: { ticketId: ticket.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: { author: { select: { id: true, name: true } } },
      });

      return res.status(200).json({ items: rows.map(noteShape) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to load notes." } });
    }
  }
);
