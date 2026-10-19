import { Router, type Request, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import {
  blockPendingPasswordChange,
  requireAuth,
  requireRole,
} from "./middleware.js";

// ---------------------------------------------------------------------------
// Lab 4 (Issue 30) — Actions Taken REST API + backend authorization
// (api-spec.md §1, specification.md FR-01..FR-08, BR-01..BR-07/BR-12/BR-13).
//
//   POST  /api/staff/tickets/:id/actions              create  (IT Staff/Admin)
//   PATCH /api/staff/tickets/:id/actions/:actionId    update  (IT Staff/Admin)
//   GET   /api/tickets/:id/actions                    list    (own / accessible)
//
// Authorization is enforced here, never by hiding UI controls (BR-04): a
// Requester may only read Actions on Tickets they own and can never write; a
// foreign or missing Ticket is a non-disclosing 404 (BR-21). The performer is
// always the authenticated session user (BR-03) — any client-supplied performer
// value is ignored. Creating an Action bumps the Ticket's updatedAt so the
// "recently updated" metrics reflect real work (api-spec.md §1.1).
// ---------------------------------------------------------------------------

export const actionsTakenRouter = Router();

const MAX_TEXT = 2000;
const ACTION_DATE_PAST_DAYS = 30;
const ACTION_DATE_FUTURE_HOURS = 24;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

const PERFORMER_INCLUDE = {
  performedBy: { select: { id: true, name: true, role: true } },
} satisfies Prisma.ActionTakenInclude;

function validationError(res: Response, fields: Record<string, string>) {
  return res
    .status(400)
    .json({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } });
}

function duplicateAction(res: Response) {
  return res.status(409).json({
    error: {
      code: "DUPLICATE_ACTION",
      message:
        "An identical Action was recorded for this Ticket moments ago. Duplicate submissions are not saved.",
    },
  });
}

function staleUpdate(res: Response, subject: "Action" | "Ticket") {
  return res.status(409).json({
    error: {
      code: "STALE_UPDATE",
      message: `This ${subject.toLowerCase()} was changed by someone else. Reload it and try again.`,
    },
  });
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

function notFoundTicket(res: Response) {
  return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
}

function notFoundAction(res: Response) {
  return res.status(404).json({ error: { code: "NOT_FOUND", message: "Action not found." } });
}

function actionShape(row: {
  id: number;
  ticketId: number;
  actionDateTime: Date;
  actionDescription: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  performedBy: { id: number; name: string; role: string };
}) {
  return {
    id: row.id,
    ticketId: row.ticketId,
    actionDateTime: row.actionDateTime,
    actionDescription: row.actionDescription,
    result: row.result,
    performedBy: { id: row.performedBy.id, name: row.performedBy.name, role: row.performedBy.role },
    followUpRequired: row.followUpRequired,
    followUpNote: row.followUpNote,
    attachmentNotes: row.attachmentNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

interface AccessibleTicket {
  id: number;
  requesterId: number;
  createdAt: Date;
  currentStatus: string;
  updatedAt: Date;
}

// Loads a Ticket and checks the caller may reach it: IT Staff/Admin reach any
// Ticket; a Requester only an owned one. Null when missing or foreign so every
// failure stays non-disclosing (BR-21).
async function resolveAccessibleTicket(
  req: Request,
  rawId: string
): Promise<AccessibleTicket | null> {
  const id = parseId(rawId);
  if (id === null) return null;

  const ticket = await getPrisma().ticket.findUnique({
    where: { id },
    select: {
      id: true,
      requesterId: true,
      createdAt: true,
      currentStatus: true,
      updatedAt: true,
    },
  });
  if (!ticket) return null;

  const user = req.user!;
  if (user.role === "REQUESTER" && ticket.requesterId !== user.id) return null;
  return ticket;
}

// ---------------------------------------------------------------------------
// Field validation (api-spec.md §1.1, §6; BR-05/BR-06/D-6). `input` is the
// merged field set: for create that is the request body; for update it is the
// existing row overlaid with the provided fields (api-spec.md §1.2). Returns
// per-field messages plus the normalized values to persist.
// ---------------------------------------------------------------------------

function optionalText(
  value: unknown,
  name: string,
  fields: Record<string, string>
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    fields[name] = "Must be text.";
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > MAX_TEXT) {
    fields[name] = `Must be ${MAX_TEXT} characters or fewer.`;
    return null;
  }
  return trimmed;
}

interface ActionInput {
  actionDateTime?: unknown;
  actionDescription?: unknown;
  result?: unknown;
  followUpRequired?: unknown;
  followUpNote?: unknown;
  attachmentNotes?: unknown;
}

interface ActionData {
  actionDateTime: Date;
  actionDescription: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

// Validates a full (create) or merged (update) input. BR-05/BR-06/BR-12 and
// specification.md D-6 date bounds.
function validateActionInput(
  body: ActionInput,
  ticketCreatedAt: Date,
  now: Date
): { fields: Record<string, string>; data: ActionData } {
  const fields: Record<string, string> = {};

  const actionDescription =
    typeof body.actionDescription === "string" ? body.actionDescription.trim() : "";
  if (actionDescription === "") {
    fields.actionDescription = "Action Description is required.";
  } else if (actionDescription.length > MAX_TEXT) {
    fields.actionDescription = `Action Description must be ${MAX_TEXT} characters or fewer.`;
  }

  const result = optionalText(body.result, "result", fields);
  const attachmentNotes = optionalText(body.attachmentNotes, "attachmentNotes", fields);

  let followUpRequired = false;
  if (body.followUpRequired !== undefined && body.followUpRequired !== null) {
    if (typeof body.followUpRequired !== "boolean") {
      fields.followUpRequired = "Follow-Up Required must be true or false.";
    } else {
      followUpRequired = body.followUpRequired;
    }
  }
  let followUpNote = optionalText(body.followUpNote, "followUpNote", fields);
  if (followUpRequired && !followUpNote) {
    fields.followUpNote = "A Follow-up Note is required when follow-up is needed.";
  }
  // BR-05 is an "if and only if": with Follow-Up Required No the Note must not
  // exist, so a stale Note is dropped rather than stored alongside a false flag.
  if (!followUpRequired) followUpNote = null;

  let actionDateTime = now;
  if (body.actionDateTime !== undefined && body.actionDateTime !== null) {
    const parsed =
      body.actionDateTime instanceof Date
        ? body.actionDateTime
        : typeof body.actionDateTime === "string"
          ? new Date(body.actionDateTime)
          : new Date(NaN);
    if (Number.isNaN(parsed.getTime())) {
      fields.actionDateTime = "Action Date/Time is invalid.";
    } else {
      const min = new Date(ticketCreatedAt.getTime() - ACTION_DATE_PAST_DAYS * 24 * 3_600_000);
      const max = new Date(now.getTime() + ACTION_DATE_FUTURE_HOURS * 3_600_000);
      if (parsed < min || parsed > max) {
        fields.actionDateTime = `Action Date/Time must be within ${ACTION_DATE_PAST_DAYS} days before the Ticket was created and ${ACTION_DATE_FUTURE_HOURS} hours from now.`;
      } else {
        actionDateTime = parsed;
      }
    }
  }

  return {
    fields,
    data: { actionDateTime, actionDescription, result, followUpRequired, followUpNote, attachmentNotes },
  };
}

// The update contract: only provided fields change; validation runs on the
// merged result (api-spec.md §1.2, e.g. follow-up note required iff the merged
// followUpRequired is true).
function mergeActionInput(body: ActionInput, current: ActionData): ActionInput {
  const hasKey = (key: keyof ActionInput) => Object.prototype.hasOwnProperty.call(body, key);
  return {
    actionDescription: hasKey("actionDescription") ? body.actionDescription : current.actionDescription,
    actionDateTime: hasKey("actionDateTime") ? body.actionDateTime : current.actionDateTime,
    result: hasKey("result") ? body.result : current.result,
    followUpRequired: hasKey("followUpRequired") ? body.followUpRequired : current.followUpRequired,
    followUpNote: hasKey("followUpNote") ? body.followUpNote : current.followUpNote,
    attachmentNotes: hasKey("attachmentNotes") ? body.attachmentNotes : current.attachmentNotes,
  };
}

// ---------------------------------------------------------------------------
// POST /api/staff/tickets/:id/actions — create (FR-02, BR-03/BR-05/BR-06/BR-13).
// ---------------------------------------------------------------------------
actionsTakenRouter.post(
  "/staff/tickets/:id/actions",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const ticketId = parseId(req.params.id);
    if (ticketId === null) return notFoundTicket(res);

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, createdAt: true },
      });
      if (!ticket) return notFoundTicket(res);

      const now = new Date();
      const { fields, data } = validateActionInput((req.body ?? {}) as ActionInput, ticket.createdAt, now);
      if (Object.keys(fields).length > 0) return validationError(res, fields);

      // BR-13 / D-7 — duplicate guard: same actor + Ticket + trimmed Description
      // inside a 5-minute window is rejected without writing (FR-08/AC-10).
      const result = await prisma.$transaction(async (tx) => {
        const duplicate = await tx.actionTaken.findFirst({
          where: {
            ticketId: ticket.id,
            performedById: req.user!.id,
            actionDescription: data.actionDescription,
            createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) },
          },
          select: { id: true },
        });
        if (duplicate) return { duplicate: true as const };

        const created = await tx.actionTaken.create({
          data: {
            ticketId: ticket.id,
            performedById: req.user!.id,
            actionDateTime: data.actionDateTime,
            actionDescription: data.actionDescription,
            result: data.result,
            followUpRequired: data.followUpRequired,
            followUpNote: data.followUpNote,
            attachmentNotes: data.attachmentNotes,
          },
          include: PERFORMER_INCLUDE,
        });

        // Creating an Action is work activity: bump the Ticket recency anchor.
        const updatedTicket = await tx.ticket.update({
          where: { id: ticket.id },
          data: { updatedAt: new Date() },
          select: { id: true, currentStatus: true, updatedAt: true },
        });

        const actionsCount = await tx.actionTaken.count({ where: { ticketId: ticket.id } });
        return { duplicate: false as const, action: created, ticket: { ...updatedTicket, actionsCount } };
      });

      if (result.duplicate) return duplicateAction(res);

      return res.status(201).json({
        action: actionShape(result.action),
        ticket: result.ticket,
      });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to save the action." } });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/staff/tickets/:id/actions/:actionId — update (FR-03, BR-12).
// performedBy is never editable (BR-03/D-4); there is no delete route (D-4).
// ---------------------------------------------------------------------------
actionsTakenRouter.patch(
  "/staff/tickets/:id/actions/:actionId",
  requireAuth,
  blockPendingPasswordChange,
  requireRole("IT_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const ticketId = parseId(req.params.id);
    const actionId = parseId(req.params.actionId);
    if (ticketId === null || actionId === null) return notFoundAction(res);

    const body = (req.body ?? {}) as ActionInput & { expectedUpdatedAt?: unknown };

    // Missing/invalid expectedUpdatedAt is a 400 (api-spec.md §0/§1.2).
    if (typeof body.expectedUpdatedAt !== "string" || body.expectedUpdatedAt.trim() === "") {
      return validationError(res, { expectedUpdatedAt: "expectedUpdatedAt is required." });
    }
    const expected = new Date(body.expectedUpdatedAt);
    if (Number.isNaN(expected.getTime())) {
      return validationError(res, { expectedUpdatedAt: "expectedUpdatedAt must be a valid timestamp." });
    }

    try {
      const prisma = getPrisma();
      const action = await prisma.actionTaken.findFirst({
        where: { id: actionId, ticketId },
        select: {
          id: true,
          actionDateTime: true,
          actionDescription: true,
          result: true,
          followUpRequired: true,
          followUpNote: true,
          attachmentNotes: true,
          updatedAt: true,
          ticket: { select: { createdAt: true } },
        },
      });
      if (!action) return notFoundAction(res);

      // BR-12 / D-1 — the client must base its edit on the last-read row.
      if (action.updatedAt.getTime() !== expected.getTime()) return staleUpdate(res, "Action");

      const now = new Date();
      const merged = mergeActionInput(body, {
        actionDateTime: action.actionDateTime,
        actionDescription: action.actionDescription,
        result: action.result,
        followUpRequired: action.followUpRequired,
        followUpNote: action.followUpNote,
        attachmentNotes: action.attachmentNotes,
      });
      const { fields, data } = validateActionInput(merged, action.ticket.createdAt, now);
      if (Object.keys(fields).length > 0) return validationError(res, fields);

      const updated = await prisma.actionTaken.update({
        where: { id: action.id },
        data: {
          actionDateTime: data.actionDateTime,
          actionDescription: data.actionDescription,
          result: data.result,
          followUpRequired: data.followUpRequired,
          followUpNote: data.followUpNote,
          attachmentNotes: data.attachmentNotes,
        },
        include: PERFORMER_INCLUDE,
      });

      return res.status(200).json({ action: actionShape(updated) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to update the action." } });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tickets/:id/actions — ordered list (FR-04, BR-04/BR-07).
// Newest Action Date/Time first, ties by id descending. An empty Ticket returns
// 200 with an empty list (zero-record behavior, BR-17/spirit of §1.3).
// ---------------------------------------------------------------------------
actionsTakenRouter.get(
  "/tickets/:id/actions",
  requireAuth,
  blockPendingPasswordChange,
  async (req: Request, res: Response) => {
    try {
      const ticket = await resolveAccessibleTicket(req, req.params.id);
      if (!ticket) return notFoundTicket(res);

      const rows = await getPrisma().actionTaken.findMany({
        where: { ticketId: ticket.id },
        orderBy: [{ actionDateTime: "desc" }, { id: "desc" }],
        include: PERFORMER_INCLUDE,
      });

      return res.status(200).json({ items: rows.map(actionShape) });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to load actions." } });
    }
  }
);
