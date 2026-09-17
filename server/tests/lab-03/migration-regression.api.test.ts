import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { seedLab3 } from "../../prisma/seed.js";
import { loginRequester, REQUESTERS, type ApiClient } from "../helpers.js";

// MIGR-01 and MIGR-02 (Lab 3 Issue 17 — Database Migration & User Model)
// These tests verify that:
//  - DevelopmentRequester rows were migrated to the new User model (MIGR-01).
//  - Existing Tickets and Attachments remain valid and correctly owned (MIGR-02).
//  - The temporary /api/development-requesters selector endpoint is removed.
// Identity is now resolved from the session cookie (Issue 18).

let alice: { id: number };
let aliceClient: ApiClient;
let allTickets: { id: number; requesterId: number }[];

beforeEach(async () => {
  const prisma = getPrisma();
  await prisma.internalNote.deleteMany();
  await prisma.publicComment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.relatedSystem.deleteMany();
  await prisma.category.deleteMany();

  await seedLab3(prisma);

  alice = await prisma.user.findFirstOrThrow({
    where: { email: REQUESTERS.alice, role: "REQUESTER" },
    select: { id: true },
  });

  allTickets = await prisma.ticket.findMany({ select: { id: true, requesterId: true } });

  aliceClient = await loginRequester(app, REQUESTERS.alice);
});

afterAll(async () => {
  const prisma = getPrisma();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

describe("MIGR-01: Development Requester → User migration", () => {
  it("at least one User with role REQUESTER exists (AC-12, FR-08)", async () => {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
    expect(requesters.length).toBeGreaterThanOrEqual(4);
  });

  it("inactive requester (evan.ellis) exists with active=false and role REQUESTER", async () => {
    const prisma = getPrisma();
    const evan = await prisma.user.findFirstOrThrow({
      where: { email: REQUESTERS.evanInactive },
    });
    expect(evan.role).toBe("REQUESTER");
    expect(evan.active).toBe(false);
    expect(evan.requiresPasswordChange).toBe(true);
  });

  it("GET /api/development-requesters no longer exists and returns 404 (selector removed)", async () => {
    const res = await aliceClient.get("/api/development-requesters");
    expect(res.status).toBe(404);
  });
});

describe("MIGR-02: Tickets/Attachments preserved and correctly owned", () => {
  it("all seeded tickets have a valid requesterId referencing a User with role REQUESTER", async () => {
    const prisma = getPrisma();
    for (const t of allTickets) {
      expect(t.requesterId).toBeDefined();
      const requester = await prisma.user.findFirst({
        where: { id: t.requesterId, role: "REQUESTER" },
      });
      expect(requester).not.toBeNull();
    }
  });

  it("GET /api/tickets returns only Alice's tickets when signed in as Alice (FR-08)", async () => {
    const prisma = getPrisma();
    const aliceTicketIds = await prisma.ticket.findMany({
      where: { requesterId: alice.id },
      select: { id: true },
    });
    expect(aliceTicketIds.length).toBeGreaterThanOrEqual(1);

    const res = await aliceClient.get("/api/tickets");

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const allowedIds = new Set(aliceTicketIds.map((t) => t.id));
    for (const t of res.body.items) {
      expect(allowedIds.has(t.id)).toBe(true);
    }
  });

  it("GET /api/tickets/:id returns ticket detail for an owned ticket (FR-08)", async () => {
    const ownedTicket = allTickets.find((t) => t.requesterId === alice.id);
    if (!ownedTicket) return; // alice should own seeded tickets; skip if none

    const res = await aliceClient.get(`/api/tickets/${ownedTicket.id}`);

    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe(ownedTicket.id);
    expect(res.body.ticket.requesterId).toBe(alice.id);
    expect(res.body.ticket).toHaveProperty("ticketNumber");
  });

  it("attachment upload and retrieval still works with session auth (AC-12)", async () => {
    const ownedTicket = allTickets.find((t) => t.requesterId === alice.id);
    if (!ownedTicket) return;

    const uploadRes = await aliceClient
      .post(`/api/tickets/${ownedTicket.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 migration test"), {
        filename: "migration-test.pdf",
        contentType: "application/pdf",
      });

    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.attachment.id;

    const detailRes = await aliceClient.get(`/api/tickets/${ownedTicket.id}`);

    expect(detailRes.status).toBe(200);
    const found = detailRes.body.ticket.attachments.find((a: { id: number }) => a.id === attachmentId);
    expect(found).toBeDefined();
    expect(found.originalName).toBe("migration-test.pdf");
  });
});
