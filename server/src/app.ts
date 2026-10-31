import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { formatTicketNumber } from "./ticketNumber.js";
import { authRouter } from "./auth.js";
import { ticketCommunicationRouter } from "./communication.js";
import { staffQueueRouter } from "./staffQueue.js";
import { staffTicketDetailRouter } from "./staffTicketDetail.js";
import { adminUsersRouter } from "./adminUsers.js";
import { actionsTakenRouter } from "./actionsTaken.js";
import { getStaffDashboard } from "./staffDashboard.js";
import {
  blockPendingPasswordChange,
  csrfProtection,
  requireAuth,
  requireRole,
} from "./middleware.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors({ origin: true, credentials: true })); // Vite dev server + session cookie
app.use(express.json());
app.use(cookieParser());

// Lab 3 (Issue 18) — CSRF guard for mutating requests (api-spec.md §0).
// Runs before every route, including the auth routes.
app.use(csrfProtection);

// Lab 3 (Issue 18) — authentication routes (login/logout/me/change-password).
app.use("/api/auth", authRouter);

// Lab 3 (Issue 20) — Ticket communication: Public Comments, Internal Notes,
// and the Requester "Problem Appears Resolved" indication (api-spec.md §4, §5).
app.use("/api/tickets", ticketCommunicationRouter);

// Lab 3 (Issue 21) — IT Staff Ticket Queue (api-spec.md §6.1, FR-12/AC-13).
app.use("/api/staff", staffQueueRouter);

// Lab 3 (Issue 22) — IT Staff Ticket Detail: retrieve, ownership, IT Priority
// and permitted status transitions (api-spec.md §6.2..§6.5, FR-13..FR-16).
app.use("/api/staff", staffTicketDetailRouter);

// Lab 4 (Issue 34) — IT Staff Dashboard
app.get("/api/staff/dashboard", requireAuth, blockPendingPasswordChange, requireRole("IT_STAFF", "ADMIN"), getStaffDashboard);

// Lab 3 (Issue 23) — Administrator User Management: list/search/filter, create,
// edit and set a new initial password (api-spec.md §7, FR-19..FR-22/AC-18..AC-22).
app.use("/api/admin", adminUsersRouter);

// Lab 4 (Issue 30) — Actions Taken API (api-spec.md §1): create/update under
// /api/staff/tickets/:id/actions, list under /api/tickets/:id/actions.
app.use("/api", actionsTakenRouter);

// ---------------------------------------------------------------------------
// Issue 11 — Attachment upload configuration (BR-07).
// Files are stored on the local filesystem under the configured upload
// directory; the database stores metadata + a generated stored filename.
// ---------------------------------------------------------------------------
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB per file (labsheet §4.5)
export const MAX_ACTIVE_ATTACHMENTS = 5; // max active attachments per ticket (labsheet §4.5)
// Allowed types per labsheet §4.5: JPG/JPEG, PNG, WEBP, and PDF.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function resolveUploadDir(): string {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), "uploads");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE },
});

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});
