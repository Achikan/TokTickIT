import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { formatTicketNumber } from "../../src/ticketNumber.js";
import {
  resetDatabase,
  seedReferenceAndUsers,
  loginRequester,
  loginStaff,
  loginAdmin,
  REQUESTERS,
  STAFF,
  type ApiClient,
} from "../helpers.js";

// ---------------------------------------------------------------------------
// Lab 4 (Issue 32) — Ticket Workflow: transition matrix + resolution gate.
// (tests.md API-WF-01..API-WF-05, API-AUTH-02; specification.md §5.2/§5.3,
// BR-08..BR-12, D-1/D-3; api-spec.md §2.1..§2.3.)
//
// The same §5.2 matrix the Lab 3 endpoint enforced is re-asserted here as a
// complete sweep (every one of the 64 from/to pairs), together with the two
// Lab 4 additions: optimistic concurrency (D-1, BR-12) and the BR-11
// resolution gate. Everything runs through HTTP so backend authorization and
// rules — never a hidden UI control — are what is proven (BR-04).
// ---------------------------------------------------------------------------

const ALL_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

type Status = (typeof ALL_STATUSES)[number];

// specification.md §5.2 — the approved matrix, transcribed independently of the
// server constant so drift between the two is caught by this suite.
const LEGAL: Record<Status, readonly Status[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

const ANCHOR = new Date("2026-09-01T10:00:00.000Z");

let aliceId: number;
let danId: number;
let categoryId: number;
let systemId: number;

let alice: ApiClient;
let dan: ApiClient;
let eileen: ApiClient;
let admin: ApiClient;

let sequence = 0;

async function seedTicket(status: Status, overrides: { updatedAt?: Date } = {}) {
  sequence += 1;
  return getPrisma().ticket.create({
    data: {
      ticketNumber: formatTicketNumber(sequence),
      summary: "Workflow test ticket",
      description: "Used by the Ticket Workflow suite.",
      requesterId: aliceId,
      ownerId: danId,
      categoryId,
      relatedSystemId: systemId,
      requestedPriority: "MEDIUM",
      currentStatus: status,
      createdAt: ANCHOR,
      updatedAt: overrides.updatedAt ?? ANCHOR,
    },
    select: { id: true, currentStatus: true, updatedAt: true },
  });
}

async function seedAction(ticketId: number) {
  return getPrisma().actionTaken.create({
    data: {
      ticketId,
      performedById: danId,
      actionDateTime: new Date(ANCHOR.getTime() + 3_600_000),
      actionDescription: "Investigated and applied the fix.",
    },
    select: { id: true },
  });
}

async function statusOf(ticketId: number): Promise<Status> {
  const t = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId } });
  return t.currentStatus;
}

async function updatedAtOf(ticketId: number): Promise<string> {
  const t = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId } });
  return t.updatedAt.toISOString();
}

beforeEach(async () => {
  const prisma = getPrisma();
  await resetDatabase();
  await seedReferenceAndUsers(prisma);
  sequence = 0;

  const idOf = async (email: string) =>
    (await prisma.user.findFirstOrThrow({ where: { email }, select: { id: true } })).id;

  aliceId = await idOf(REQUESTERS.alice);
  danId = await idOf(STAFF.dan);

  categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } })).id;
  systemId = (await prisma.relatedSystem.findFirstOrThrow({ where: { name: "ERP System" } })).id;

  alice = await loginRequester(app, REQUESTERS.alice);
  dan = await loginStaff(app, STAFF.dan);
  eileen = await loginStaff(app, STAFF.eileen);
  admin = await loginAdmin(app);
});

afterAll(async () => {
  await resetDatabase();
  await seedReferenceAndUsers();
});

// ---------------------------------------------------------------------------
describe("API-WF-01: permitted transitions (matrix, FR-16, BR-09)", () => {
  const legalPairs = ALL_STATUSES.flatMap((from) => LEGAL[from].map((to) => ({ from, to })));

  it.each(legalPairs)("$from -> $to succeeds and persists", async ({ from, to }) => {
    const t = await seedTicket(from);
    // BR-11: resolving requires at least one recorded Action.
    if (to === "RESOLVED") await seedAction(t.id);

    const res = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: to, expectedUpdatedAt: t.updatedAt.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.ticket.currentStatus).toBe(to);
    expect(res.body.ticket.actionsCount).toBeTypeOf("number");
    expect(await statusOf(t.id)).toBe(to);
  });

  it("lets an Administrator perform a permitted transition", async () => {
    const t = await seedTicket("NEW");
    const res = await admin
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "IN_PROGRESS", expectedUpdatedAt: t.updatedAt.toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.ticket.currentStatus).toBe("IN_PROGRESS");
  });
});

// ---------------------------------------------------------------------------
describe("API-WF-02: forbidden transitions (matrix, BR-09)", () => {
  const illegalPairs = ALL_STATUSES.flatMap((from) =>
    ALL_STATUSES.filter((to) => !LEGAL[from].includes(to)).map((to) => ({ from, to }))
  );

  it.each(illegalPairs)(
    "$from -> $to is rejected with a specific conflict and no change",
    async ({ from, to }) => {
      const t = await seedTicket(from);
      const res = await dan
        .patch(`/api/staff/tickets/${t.id}/status`)
        .send({ newStatus: to, expectedUpdatedAt: t.updatedAt.toISOString() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("FORBIDDEN_TRANSITION");
      expect(res.body.error.message).toContain(from);
      expect(res.body.error.message).toContain(to);
      expect(await statusOf(t.id)).toBe(from);
    }
  );

  it("rejects writes out of a terminal CANCELLED Ticket", async () => {
    const terminal = await seedTicket("CANCELLED");
    const res = await dan
      .patch(`/api/staff/tickets/${terminal.id}/status`)
      .send({ newStatus: "OPEN", expectedUpdatedAt: terminal.updatedAt.toISOString() });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FORBIDDEN_TRANSITION");
  });
});

// ---------------------------------------------------------------------------
describe("API-WF-03: the Requester indication is advisory only (FR-11, BR-11)", () => {
  it("records the timestamp without changing the status or creating an Action", async () => {
    const t = await seedTicket("IN_PROGRESS");

    const res = await alice.post(`/api/tickets/${t.id}/resolved-indication`).send({});
    expect(res.status).toBe(200);
    expect(res.body.ticket.currentStatus).toBe("IN_PROGRESS");
    expect(res.body.ticket.requesterIndicatedResolvedAt).toBeTruthy();

    expect(await statusOf(t.id)).toBe("IN_PROGRESS");
    expect(await getPrisma().actionTaken.count({ where: { ticketId: t.id } })).toBe(0);
  });

  it("does not satisfy the resolution gate — only a recorded Action does", async () => {
    const t = await seedTicket("IN_PROGRESS");
    await alice.post(`/api/tickets/${t.id}/resolved-indication`).send({});

    const blocked = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "RESOLVED", expectedUpdatedAt: await updatedAtOf(t.id) });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("RESOLUTION_GATE");
    expect(await statusOf(t.id)).toBe("IN_PROGRESS");

    // With an Action recorded the very same transition succeeds.
    await seedAction(t.id);
    const ok = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "RESOLVED", expectedUpdatedAt: await updatedAtOf(t.id) });
    expect(ok.status).toBe(200);
    expect(ok.body.ticket.currentStatus).toBe("RESOLVED");
  });

  it("surfaces the indication to staff on the Ticket detail (api-spec §2.3)", async () => {
    const t = await seedTicket("IN_PROGRESS");
    await alice.post(`/api/tickets/${t.id}/resolved-indication`).send({});

    const res = await dan.get(`/api/staff/tickets/${t.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ticket.currentStatus).toBe("IN_PROGRESS");
    expect(res.body.ticket.requesterIndicatedResolvedAt).toBeTruthy();
    expect(res.body.ticket.actionsCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("API-WF-04: optimistic concurrency (D-1, BR-12)", () => {
  it("rejects a stale write with 409 STALE_UPDATE and changes nothing", async () => {
    const t = await seedTicket("OPEN");
    const stale = new Date(t.updatedAt.getTime() - 60_000).toISOString();

    const res = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "IN_PROGRESS", expectedUpdatedAt: stale });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("STALE_UPDATE");
    expect(res.body.error.message).toMatch(/reload/i);

    const persisted = await getPrisma().ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(persisted.currentStatus).toBe("OPEN");
    expect(persisted.updatedAt.getTime()).toBe(t.updatedAt.getTime());
  });

  it("serializes two writers: the first wins, the second is stale", async () => {
    const t = await seedTicket("NEW");
    const anchor = t.updatedAt.toISOString();

    const first = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "OPEN", expectedUpdatedAt: anchor });
    expect(first.status).toBe(200);

    const second = await eileen
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "IN_PROGRESS", expectedUpdatedAt: anchor });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("STALE_UPDATE");
    expect(await statusOf(t.id)).toBe("OPEN");
  });

  it("requires expectedUpdatedAt and validates its format (400)", async () => {
    const t = await seedTicket("NEW");

    const missing = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "OPEN" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.fields.expectedUpdatedAt).toBeTruthy();

    const invalid = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "OPEN", expectedUpdatedAt: "not-a-timestamp" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.fields.expectedUpdatedAt).toBeTruthy();

    expect(await statusOf(t.id)).toBe("NEW");
  });
});

// ---------------------------------------------------------------------------
describe("API-WF-05: BR-11 resolution gate", () => {
  it.each(["IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const)(
    "refuses to resolve a %s Ticket that has no Actions",
    async (from) => {
      const t = await seedTicket(from);
      const res = await dan
        .patch(`/api/staff/tickets/${t.id}/status`)
        .send({ newStatus: "RESOLVED", expectedUpdatedAt: t.updatedAt.toISOString() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("RESOLUTION_GATE");
      expect(res.body.error.message).toMatch(/at least one action/i);
      expect(await statusOf(t.id)).toBe(from);
    }
  );

  it("resolves a Ticket once at least one Action exists", async () => {
    const t = await seedTicket("IN_PROGRESS");
    await seedAction(t.id);

    const res = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "RESOLVED", expectedUpdatedAt: t.updatedAt.toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.ticket.currentStatus).toBe("RESOLVED");
    expect(res.body.ticket.actionsCount).toBeGreaterThanOrEqual(1);
  });

  it("grandfathers a legacy zero-action RESOLVED Ticket through CLOSED/REOPENED", async () => {
    const t = await seedTicket("RESOLVED");

    const close = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "CLOSED", expectedUpdatedAt: t.updatedAt.toISOString() });
    expect(close.status).toBe(200);
    expect(await statusOf(t.id)).toBe("CLOSED");

    const reopen = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "REOPENED", expectedUpdatedAt: await updatedAtOf(t.id) });
    expect(reopen.status).toBe(200);
    expect(await statusOf(t.id)).toBe("REOPENED");
  });
});

// ---------------------------------------------------------------------------
describe("API-AUTH-02: workflow authorization (FR-16, AC-10, BR-04)", () => {
  it("forbids a Requester from every transition and changes nothing", async () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const t = await seedTicket(from);
        const res = await alice
          .patch(`/api/staff/tickets/${t.id}/status`)
          .send({ newStatus: to, expectedUpdatedAt: t.updatedAt.toISOString() });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
        expect(await statusOf(t.id)).toBe(from);
      }
    }
  });

  it("requires authentication (401) and hides missing Tickets (404)", async () => {
    const anon = await request(app)
      .patch("/api/staff/tickets/1/status")
      .set("X-CSRF-Protected", "1")
      .send({ newStatus: "OPEN", expectedUpdatedAt: ANCHOR.toISOString() });
    expect(anon.status).toBe(401);

    const missing = await dan
      .patch("/api/staff/tickets/999999/status")
      .send({ newStatus: "OPEN", expectedUpdatedAt: ANCHOR.toISOString() });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an invalid status enum with 400", async () => {
    const t = await seedTicket("NEW");
    const res = await dan
      .patch(`/api/staff/tickets/${t.id}/status`)
      .send({ newStatus: "ARCHIVED", expectedUpdatedAt: t.updatedAt.toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.newStatus).toBeTruthy();
  });
});
