import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { formatTicketNumber } from "../../src/ticketNumber.js";
import {
  resetDatabase,
  seedReferenceAndUsers,
  loginRequester,
  loginStaff,
  loginAdmin,
  CSRF_HEADER,
  REQUESTERS,
  type ApiClient,
} from "../helpers.js";

// Lab 3 Issue 20 — Comments and Notes API (tests.md §2, API-19..API-24).
// Public Comments are visible to all three roles; Internal Notes are private to
// IT Staff/Admin. Comments/Notes are append-only with a 2,000-char cap (BR-12).

let aliceId: number;
let bobId: number;
let categoryId: number;
let systemId: number;
let alice: ApiClient;
let bob: ApiClient;
let staff: ApiClient;
let admin: ApiClient;

async function seedTicket(requesterId: number, sequence: number, status: "NEW" | "IN_PROGRESS" = "IN_PROGRESS") {
  const prisma = getPrisma();
  return prisma.ticket.create({
    data: {
      ticketNumber: formatTicketNumber(sequence),
      summary: "Communication test ticket",
      description: "Used by the comments/notes suite.",
      requesterId,
      categoryId,
      relatedSystemId: systemId,
      requestedPriority: "MEDIUM",
      currentStatus: status,
    },
    select: { id: true },
  });
}

beforeEach(async () => {
  const prisma = getPrisma();
  await resetDatabase();
  await seedReferenceAndUsers(prisma);

  aliceId = (
    await prisma.user.findFirstOrThrow({ where: { email: REQUESTERS.alice }, select: { id: true } })
  ).id;
  bobId = (
    await prisma.user.findFirstOrThrow({ where: { email: REQUESTERS.bob }, select: { id: true } })
  ).id;
  categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } })).id;
  systemId = (await prisma.relatedSystem.findFirstOrThrow({ where: { name: "ERP System" } })).id;

  alice = await loginRequester(app, REQUESTERS.alice);
  bob = await loginRequester(app, REQUESTERS.bob);
  staff = await loginStaff(app);
  admin = await loginAdmin(app);
});

afterAll(async () => {
  await resetDatabase();
  await seedReferenceAndUsers();
});

describe("API-19: Requester posts a Public Comment on an owned Ticket (AC-17, FR-10)", () => {
  it("records the comment with author and creation time", async () => {
    const ticket = await seedTicket(aliceId, 1);

    const res = await alice
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "Thanks, I will try the suggested fix." });

    expect(res.status).toBe(201);
    expect(res.body.comment).toMatchObject({
      ticketId: ticket.id,
      content: "Thanks, I will try the suggested fix.",
      author: { id: aliceId, name: "Alice Anderson" },
    });
    expect(res.body.comment.createdAt).toBeTruthy();

    const list = await alice.get(`/api/tickets/${ticket.id}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].content).toBe("Thanks, I will try the suggested fix.");
  });

  it("rejects an anonymous mutating request without the CSRF header", async () => {
    const ticket = await seedTicket(aliceId, 1);
    const res = await alice.agent
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "no csrf" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("API-20: Public Comments are visible to Requester, IT Staff and Admin (AC-17, FR-17)", () => {
  it("returns the comment to all permitted roles and hides it from another Requester", async () => {
    const ticket = await seedTicket(aliceId, 1);
    await alice.post(`/api/tickets/${ticket.id}/comments`).send({ content: "Public note" });

    for (const client of [alice, staff, admin]) {
      const res = await client.get(`/api/tickets/${ticket.id}/comments`);
      expect(res.status).toBe(200);
      expect(res.body.items.map((c: { content: string }) => c.content)).toContain("Public note");
    }

    // Another Requester cannot read or write on Alice's ticket (non-disclosing).
    expect((await bob.get(`/api/tickets/${ticket.id}/comments`)).status).toBe(404);
    expect(
      (await bob.post(`/api/tickets/${ticket.id}/comments`).send({ content: "Intrude" })).status
    ).toBe(404);
  });

  it("lets IT Staff post a Public Comment on any Ticket", async () => {
    const ticket = await seedTicket(aliceId, 1);
    const res = await staff
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "We are looking into it." });
    expect(res.status).toBe(201);
    expect(res.body.comment.author.id).not.toBe(aliceId);
  });
});

describe("API-21: IT Staff/Admin create and list Internal Notes (AC-17, FR-18)", () => {
  it("creates and lists a note for staff and admin", async () => {
    const ticket = await seedTicket(aliceId, 1);

    const created = await staff
      .post(`/api/tickets/${ticket.id}/notes`)
      .send({ content: "Awaiting the vendor patch." });
    expect(created.status).toBe(201);
    expect(created.body.note).toMatchObject({
      ticketId: ticket.id,
      content: "Awaiting the vendor patch.",
    });
    expect(created.body.note.author.name).toBeTruthy();
    expect(created.body.note.createdAt).toBeTruthy();

    const adminList = await admin.get(`/api/tickets/${ticket.id}/notes`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.items.map((n: { content: string }) => n.content)).toContain(
      "Awaiting the vendor patch."
    );
    expect((await staff.get(`/api/tickets/${ticket.id}/notes`)).status).toBe(200);
  });
});

describe("API-22: a Requester cannot reach Internal Notes (AC-04, BR-10)", () => {
  it("returns 403 without any note content for read and write", async () => {
    const ticket = await seedTicket(aliceId, 1);
    await staff.post(`/api/tickets/${ticket.id}/notes`).send({ content: "Secret diagnosis" });

    const read = await alice.get(`/api/tickets/${ticket.id}/notes`);
    expect(read.status).toBe(403);
    expect(read.body.error.code).toBe("FORBIDDEN");
    expect(JSON.stringify(read.body)).not.toContain("Secret diagnosis");

    const write = await alice.post(`/api/tickets/${ticket.id}/notes`).send({ content: "nope" });
    expect(write.status).toBe(403);
  });
});

describe("API-23: empty / whitespace / over-long content is rejected and not saved (BR-12)", () => {
  it("rejects invalid Public Comments", async () => {
    const ticket = await seedTicket(aliceId, 1);
    const long = "x".repeat(2001);

    const empty = await alice.post(`/api/tickets/${ticket.id}/comments`).send({ content: "" });
    expect(empty.status).toBe(400);
    expect(empty.body.error.fields.content).toBeTruthy();

    const whitespace = await alice
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "   " });
    expect(whitespace.status).toBe(400);

    const tooLong = await alice
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: long });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.fields.content).toBeTruthy();

    const count = await getPrisma().publicComment.count({ where: { ticketId: ticket.id } });
    expect(count).toBe(0);
  });

  it("rejects invalid Internal Notes", async () => {
    const ticket = await seedTicket(aliceId, 1);

    const empty = await staff.post(`/api/tickets/${ticket.id}/notes`).send({ content: "  " });
    expect(empty.status).toBe(400);
    expect(empty.body.error.fields.content).toBeTruthy();

    const tooLong = await staff
      .post(`/api/tickets/${ticket.id}/notes`)
      .send({ content: "y".repeat(2001) });
    expect(tooLong.status).toBe(400);

    expect(await getPrisma().internalNote.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
});

describe("API-24: Requester 'Problem Appears Resolved' is idempotent and leaves status unchanged (FR-11, BR-11)", () => {
  it("records the indication once and surfaces it without changing the status", async () => {
    const ticket = await seedTicket(aliceId, 1, "IN_PROGRESS");

    const first = await alice.post(`/api/tickets/${ticket.id}/resolved-indication`);
    expect(first.status).toBe(200);
    expect(first.body.ticket.currentStatus).toBe("IN_PROGRESS");
    expect(first.body.ticket.requesterIndicatedResolvedAt).toBeTruthy();
    const recordedAt = first.body.ticket.requesterIndicatedResolvedAt;

    const second = await alice.post(`/api/tickets/${ticket.id}/resolved-indication`);
    expect(second.status).toBe(200);
    expect(second.body.ticket.requesterIndicatedResolvedAt).toBe(recordedAt);

    const detail = await alice.get(`/api/tickets/${ticket.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.ticket.currentStatus).toBe("IN_PROGRESS");
    expect(detail.body.ticket.requesterIndicatedResolvedAt).toBe(recordedAt);

    const persisted = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(persisted.requesterIndicatedResolvedAt).not.toBeNull();
    expect(persisted.currentStatus).toBe("IN_PROGRESS");
  });

  it("rejects the indication from IT Staff (Requester-only) with 403", async () => {
    const ticket = await seedTicket(aliceId, 1);
    expect((await staff.post(`/api/tickets/${ticket.id}/resolved-indication`)).status).toBe(403);
  });

  it("hides another Requester's ticket behind 404", async () => {
    const ticket = await seedTicket(aliceId, 1);
    expect((await bob.post(`/api/tickets/${ticket.id}/resolved-indication`)).status).toBe(404);
  });
});
