import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import {
  resetDatabase,
  seedFullLab3,
  loginStaff,
  loginRequester,
  loginAdmin,
  REQUESTERS,
  STAFF,
  ADMIN,
  type ApiClient,
} from "../helpers.js";

// Lab 3 Issue 22 — IT Staff Ticket Detail (tests.md §2, API-28..API-34).
//   API-28 staff retrieve one Ticket -> full detail incl. comments/notes/attachments
//   API-29 claim / assign / reassign owner -> 200, owner updated
//   API-30 owner eligibility + Requester claim -> 400 / 403
//   API-31 IT Priority updated by Staff/Admin -> 200
//   API-32 IT Priority change by Requester -> 403
//   API-33 permitted status transition (matrix) -> 200
//   API-34 forbidden status transition -> 409 specific conflict message

let staff: ApiClient;
let admin: ApiClient;
let alice: ApiClient;
let danId: number;
let eileenId: number;
let henriId: number;

async function userId(email: string): Promise<number> {
  const user = await getPrisma().user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`seeded user not found: ${email}`);
  return user.id;
}

async function ticket(ticketNumber: string) {
  const row = await getPrisma().ticket.findUnique({
    where: { ticketNumber },
    select: {
      id: true,
      ticketNumber: true,
      currentStatus: true,
      ownerId: true,
      requesterId: true,
      itPriority: true,
      requestedPriority: true,
    },
  });
  if (!row) throw new Error(`seeded ticket not found: ${ticketNumber}`);
  return row;
}

beforeEach(async () => {
  await resetDatabase();
  await seedFullLab3();

  staff = await loginStaff(app);
  admin = await loginAdmin(app);
  alice = await loginRequester(app);

  danId = await userId(STAFF.dan);
  eileenId = await userId(STAFF.eileen);
  henriId = await userId(ADMIN.henri);
});

afterAll(async () => {
  await resetDatabase();
  await seedFullLab3();
});

describe("API-28: staff retrieve one Ticket with full detail (FR-13)", () => {
  it("returns requester, owner, priorities, status, attachments, comments and notes", async () => {
    const t = await ticket("TK-001004"); // WAITING_FOR_REQUESTER, owner Dan
    await getPrisma().attachment.create({
      data: {
        ticketId: t.id,
        originalName: "crm-export.csv",
        storedName: "stored-crm.csv",
        mimeType: "text/csv",
        size: 2048,
      },
    });
    await staff.post(`/api/tickets/${t.id}/comments`).send({ content: "We are investigating." });
    await staff.post(`/api/tickets/${t.id}/notes`).send({ content: "Vendor patch pending." });

    const res = await staff.get(`/api/staff/tickets/${t.id}`);
    expect(res.status).toBe(200);

    const detail = res.body.ticket;
    expect(detail).toMatchObject({
      id: t.id,
      ticketNumber: "TK-001004",
      requester: { id: t.requesterId, name: "David Diaz" },
      owner: { id: danId, name: "Dan Das" },
      category: { id: expect.any(Number), name: "Application Support" },
      relatedSystem: { id: expect.any(Number), name: "CRM System", type: expect.any(String) },
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "WAITING_FOR_REQUESTER",
      requesterIndicatedResolvedAt: null,
    });
    expect(detail.attachments).toHaveLength(1);
    expect(detail.attachments[0]).toMatchObject({
      originalName: "crm-export.csv",
      mimeType: "text/csv",
      size: 2048,
      removedAt: null,
    });
    expect(detail.comments.map((c: { content: string }) => c.content)).toContain(
      "We are investigating."
    );
    expect(detail.notes.map((n: { content: string }) => n.content)).toContain(
      "Vendor patch pending."
    );
    expect(Array.isArray(detail.availableOwners)).toBe(true);
    expect(detail.availableOwners.map((o: { id: number }) => o.id)).toContain(eileenId);
  });

  it("is available to Administrators too", async () => {
    const t = await ticket("TK-001001");
    const res = await admin.get(`/api/staff/tickets/${t.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ticket.ticketNumber).toBe("TK-001001");
  });

  it("returns 404 for a missing Ticket and 403 for a Requester, 401 when unauthenticated", async () => {
    const missing = await staff.get("/api/staff/tickets/999999");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const t = await ticket("TK-001001");
    const forbidden = await alice.get(`/api/staff/tickets/${t.id}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");

    const anon = await request(app).get(`/api/staff/tickets/${t.id}`);
    expect(anon.status).toBe(401);
  });
});

describe("API-29: claim / assign / reassign ownership (AC-14, FR-14)", () => {
  it("claims an unassigned Ticket, then reassigns it to another eligible user", async () => {
    const t = await ticket("TK-001001"); // NEW, unassigned
    expect(t.ownerId).toBeNull();

    const claimed = await staff
      .patch(`/api/staff/tickets/${t.id}/owner`)
      .send({ ownerId: danId });
    expect(claimed.status).toBe(200);
    expect(claimed.body.ticket.owner).toEqual({ id: danId, name: "Dan Das" });

    const reassigned = await staff
      .patch(`/api/staff/tickets/${t.id}/owner`)
      .send({ ownerId: eileenId });
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.ticket.owner.id).toBe(eileenId);

    const persisted = await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(persisted.ownerId).toBe(eileenId);
  });

  it("lets an Administrator own a Ticket as well", async () => {
    const t = await ticket("TK-001001");
    const res = await admin
      .patch(`/api/staff/tickets/${t.id}/owner`)
      .send({ ownerId: henriId });
    expect(res.status).toBe(200);
    expect(res.body.ticket.owner.id).toBe(henriId);
  });
});

describe("API-30: owner eligibility and Requester claim (AC-14, BR-07)", () => {
  it("rejects a Requester as owner target and inactive users with 400", async () => {
    const t = await ticket("TK-001001");
    const aliceId = await userId(REQUESTERS.alice);
    const ginaId = await userId(STAFF.ginaInactive);
    const evanId = await userId(REQUESTERS.evanInactive);

    for (const ownerId of [aliceId, ginaId, evanId, 999999]) {
      const res = await staff
        .patch(`/api/staff/tickets/${t.id}/owner`)
        .send({ ownerId });
      expect(res.status).toBe(400);
      expect(res.body.error.fields.ownerId).toBeTruthy();
    }
  });

  it("rejects missing / non-integer ownerId with 400", async () => {
    const t = await ticket("TK-001001");
    for (const body of [{}, { ownerId: "7" }, { ownerId: 0 }, { ownerId: -3 }]) {
      const res = await staff.patch(`/api/staff/tickets/${t.id}/owner`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.fields.ownerId).toBeTruthy();
    }
  });

  it("forbids a Requester from claiming and returns 404 for a missing Ticket", async () => {
    const t = await ticket("TK-001001");
    const forbidden = await alice
      .patch(`/api/staff/tickets/${t.id}/owner`)
      .send({ ownerId: danId });
    expect(forbidden.status).toBe(403);

    const missing = await staff.patch("/api/staff/tickets/999999/owner").send({ ownerId: danId });
    expect(missing.status).toBe(404);
  });
});

describe("API-31: IT Priority updated by Staff/Admin (AC-15, FR-15)", () => {
  it("updates IT Priority for staff and persists it", async () => {
    const t = await ticket("TK-001001"); // itPriority MEDIUM
    const res = await staff
      .patch(`/api/staff/tickets/${t.id}/priority`)
      .send({ itPriority: "URGENT" });

    expect(res.status).toBe(200);
    expect(res.body.ticket.itPriority).toBe("URGENT");
    expect(res.body.ticket.requestedPriority).toBe("MEDIUM");

    const persisted = await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(persisted.itPriority).toBe("URGENT");
  });

  it("lets an Administrator update IT Priority too", async () => {
    const t = await ticket("TK-001003");
    const res = await admin
      .patch(`/api/staff/tickets/${t.id}/priority`)
      .send({ itPriority: "HIGH" });
    expect(res.status).toBe(200);
    expect(res.body.ticket.itPriority).toBe("HIGH");
  });
});

describe("API-32: IT Priority change by a Requester is rejected (AC-15, BR-08)", () => {
  it("returns 403 for a Requester, 400 for an invalid enum and 404 when missing", async () => {
    const t = await ticket("TK-001001");

    const forbidden = await alice
      .patch(`/api/staff/tickets/${t.id}/priority`)
      .send({ itPriority: "URGENT" });
    expect(forbidden.status).toBe(403);

    const invalid = await staff
      .patch(`/api/staff/tickets/${t.id}/priority`)
      .send({ itPriority: "SUPER_HIGH" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.fields.itPriority).toBeTruthy();

    const missing = await staff
      .patch("/api/staff/tickets/999999/priority")
      .send({ itPriority: "HIGH" });
    expect(missing.status).toBe(404);
  });
});

describe("API-33: permitted status transitions (AC-16, FR-16)", () => {
  it.each([
    { number: "TK-001001", from: "NEW", to: "OPEN" },
    { number: "TK-001002", from: "OPEN", to: "WAITING_FOR_REQUESTER" },
    { number: "TK-001003", from: "IN_PROGRESS", to: "RESOLVED" },
    { number: "TK-001005", from: "RESOLVED", to: "CLOSED" },
    { number: "TK-001006", from: "CLOSED", to: "REOPENED" },
    { number: "TK-001007", from: "REOPENED", to: "CANCELLED" },
  ])("$from -> $to succeeds and persists", async ({ number, to }) => {
    const t = await ticket(number);
    const res = await staff
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: to });

    expect(res.status).toBe(200);
    expect(res.body.ticket.currentStatus).toBe(to);

    const persisted = await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(persisted.currentStatus).toBe(to);
  });

  it("lets an Administrator perform a permitted transition", async () => {
    const t = await ticket("TK-001001");
    const res = await admin
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "IN_PROGRESS" });
    expect(res.status).toBe(200);
    expect(res.body.ticket.currentStatus).toBe("IN_PROGRESS");
  });
});

describe("API-34: forbidden status transitions (AC-16, BR-09)", () => {
  it("rejects transitions outside the matrix with a specific 409", async () => {
    const t = await ticket("TK-001001"); // NEW
    const res = await staff
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "RESOLVED" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
    expect(res.body.error.message).toContain("NEW");
    expect(res.body.error.message).toContain("RESOLVED");
  });

  it("treats the same status and a terminal CANCELLED as forbidden", async () => {
    const t = await ticket("TK-001008"); // CANCELLED (terminal)
    const same = await staff
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "CANCELLED" });
    expect(same.status).toBe(409);

    const reopen = await staff
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "OPEN" });
    expect(reopen.status).toBe(409);
  });

  it("returns 400 for an invalid enum, 403 for a Requester and 404 when missing", async () => {
    const t = await ticket("TK-001001");

    const invalid = await staff
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "ARCHIVED" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.fields.newStatus).toBeTruthy();

    const forbidden = await alice
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "OPEN" });
    expect(forbidden.status).toBe(403);

    const missing = await staff
      .patch("/api/staff/tickets/999999/status")
      .send({ newStatus: "OPEN" });
    expect(missing.status).toBe(404);
  });
});
