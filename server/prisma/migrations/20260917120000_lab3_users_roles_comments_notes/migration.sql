-- Migration: Lab 3 (Issue 17) — real Users, roles, ownership, comments, notes.
-- Evolves DevelopmentRequester -> User without discarding existing Ticket/Attachment
-- data, satisfying specification.md §7 (data changes + migration + defensive status map).

-- 1) Role enum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMIN');

-- 2) Expand Status to the eight required values; defensively map any residual
--    'SUBMITTED' (the pre-Lab-2-release default) to 'NEW' as documented in
--    specification.md §7 Enum Change. This matches PR #34's already-applied
--    SUBMITTED->NEW normalisation and guards environments that still carry it.
CREATE TYPE "Status_new" AS ENUM (
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED'
);
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" TYPE "Status_new" USING (
  CASE
    WHEN "currentStatus"::text = 'SUBMITTED' THEN 'NEW'
    ELSE "currentStatus"::text
  END
)::"Status_new";
ALTER TYPE "Status" RENAME TO "Status_old";
ALTER TYPE "Status_new" RENAME TO "Status";
DROP TYPE "Status_old";
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" SET DEFAULT 'NEW';

-- 3) User table (role-per-user, activation state, password-change state).
--    Passwords are stored only as bcrypt hashes - never plaintext.
CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'REQUESTER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- 4) Migrate DevelopmentRequester -> User preserving ids so every existing
--    Ticket.requesterId stays correct (specification.md §7 Migration Strategy).
--    Each migrated requester keeps role REQUESTER, is marked requiresPasswordChange
--    = true, and receives the documented local-only initial password (bcrypt hash):
--    "LostPass!23" (README). No real credentials are placed in the repository.
INSERT INTO "User" (
  "id", "name", "email", "passwordHash", "role", "active",
  "requiresPasswordChange", "createdAt", "updatedAt"
)
SELECT
  "id",
  "name",
  lower("email"),
  '$2b$10$axFCvViJqnrpYO.QSZEDl.Sh2DvPnjo2ufC9n1IJFMSIVkRMeYAte',
  'REQUESTER',
  "active",
  true,
  "createdAt",
  now()
FROM "DevelopmentRequester";

-- 5) Ticket: primary owner (IT Staff / Administrator, initially unassigned),
--    the Requester "problem appears resolved" indication, and the requester FK
--    repointed to User (ids preserved, so no data changes).
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "requesterIndicatedResolvedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requesterId_fkey";
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");

-- 6) PublicComment and InternalNote (append-only; author + time from the backend).
CREATE TABLE "PublicComment" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "InternalNote" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PublicComment_ticketId_idx" ON "PublicComment"("ticketId");
CREATE INDEX "PublicComment_authorId_idx" ON "PublicComment"("authorId");
CREATE INDEX "InternalNote_ticketId_idx" ON "InternalNote"("ticketId");
CREATE INDEX "InternalNote_authorId_idx" ON "InternalNote"("authorId");
ALTER TABLE "PublicComment"
  ADD CONSTRAINT "PublicComment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicComment"
  ADD CONSTRAINT "PublicComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote"
  ADD CONSTRAINT "InternalNote_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalNote"
  ADD CONSTRAINT "InternalNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7) Drop the temporary Lab 2 testing identity.
DROP TABLE "DevelopmentRequester";