-- Migration: Lab 4 (Issue 29) — Actions Taken work log.
-- Additive-only (specification.md §7.2): creates the ActionTaken table and its
-- indexes. No existing table, column, enum, or row is modified, dropped, or
-- rewritten, so every Lab 1-3 row (Users, Sessions, Tickets, Attachments,
-- Public Comments, Internal Notes, categories/systems/priorities) survives.
--
-- Design decisions (specification.md §7.4 / §11):
--   * "updatedAt" is the optimistic-concurrency anchor for stale-update
--     handling (BR-12, D-1) - no extra version column.
--   * ticketId  : ON DELETE CASCADE (same pattern as PublicComment/InternalNote
--                 - a removed Ticket takes its work log with it; Tickets are
--                 never deleted by the application, only by test cleanup).
--   * performedById : ON DELETE RESTRICT (audit integrity - Users are
--                 deactivated, never deleted, so the performer always
--                 resolves; D-9). Test cleanups already delete Tickets
--                 before Users, which satisfies both constraints.
--   * No Status/Priority enum changes: all eight statuses and four priorities
--                 already exist from Lab 3 (D-2).
--
-- Backfill: none required (§7.2). No Ticket column is derived from Actions.
-- Legacy Tickets simply have zero Actions and behave per BR-18 (empty list,
-- dashboards count them normally, the BR-11 resolution gate applies only to
-- future RESOLVED transitions - existing RESOLVED/CLOSED rows are grandfathered).
--
-- ROLLBACK / RECOVERY PLAN (documented, tested via MIG-03/MIG-04 + seed idempotency):
--   Down step (run only to uninstall Lab 4; loses only ActionTaken rows):
--     DROP INDEX IF EXISTS "ActionTaken_ticketId_actionDateTime_idx";
--     DROP INDEX IF EXISTS "ActionTaken_performedById_idx";
--     DROP INDEX IF EXISTS "ActionTaken_ticketId_idx";
--     DROP TABLE IF EXISTS "ActionTaken";
--   Recovery after an accidental down-migration: restore the pre-migration
--   database backup, re-run "npx prisma migrate deploy", then re-run the
--   idempotent seed ("npm run prisma:seed") which backfills Actions for any
--   Ticket that still has zero (per-ticket zero-count guard - see seed.ts).

CREATE TABLE "ActionTaken" (
  "id"                SERIAL PRIMARY KEY,
  "ticketId"          INTEGER NOT NULL,
  "actionDateTime"    TIMESTAMP(3) NOT NULL,
  "actionDescription" TEXT NOT NULL,
  "result"            TEXT,
  "performedById"     INTEGER NOT NULL,
  "followUpRequired"  BOOLEAN NOT NULL DEFAULT false,
  "followUpNote"      TEXT,
  "attachmentNotes"   TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActionTaken_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ActionTaken_performedById_fkey"
    FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- List of actions per Ticket (BR-07 order: actionDateTime DESC, id DESC).
CREATE INDEX "ActionTaken_ticketId_idx" ON "ActionTaken"("ticketId");

-- Per-actor queries (performed-by dashboards / audits).
CREATE INDEX "ActionTaken_performedById_idx" ON "ActionTaken"("performedById");

-- Canonical ordered-list query on the Ticket Detail (§7.4 decision 4).
CREATE INDEX "ActionTaken_ticketId_actionDateTime_idx" ON "ActionTaken"("ticketId", "actionDateTime");
