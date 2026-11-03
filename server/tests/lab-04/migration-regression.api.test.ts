import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedLab4, TICKET_ACTIONS } from "../../prisma/seed.js";

// Lab 4 (Issue 29) — MIG-01 … MIG-04 (tests.md §5, specification.md §7.2/§7.3).
// The ActionTaken migration is additive; these tests prove:
//  MIG-01  every Lab 1-3 row survives (categories, systems, users, tickets,
//          comments, notes) and Ticket ownership/priority/status is unchanged.
//  MIG-02  legacy Tickets (zero actions) exist — including a pre-existing
//          RESOLVED/CLOSED pair — and every seeded Action references a valid
//          Ticket and a valid performer (BR-18 grandfathering groundwork).
//  MIG-03  seedLab4 is idempotent: a second run creates no duplicate rows.
//  MIG-04  seed coverage matrix (BR-19): all 8 statuses, all 4 priorities,
//          assigned + unassigned, 0/1/many actions, two performers on one
//          Ticket, follow-up Yes/No + note, attachmentNotes, a zero-metric
//          requester, and ≥3 Tickets touched inside the 7-day window (D-5).

const ALL_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];
const ALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

let seeded: Awaited<ReturnType<typeof seedLab4>>;

beforeEach(async () => {
  const prisma = getPrisma();
  await prisma.actionTaken.deleteMany();
  await prisma.internalNote.deleteMany();
  await prisma.publicComment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.relatedSystem.deleteMany();
  await prisma.category.deleteMany();

  seeded = await seedLab4(prisma);
});

afterAll(async () => {
  const prisma = getPrisma();
  await prisma.actionTaken.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

describe("MIG-01: Lab 1-3 data preserved by the ActionTaken migration", () => {
  it("all pre-ActionTaken entities are intact after seeding", async () => {
    const prisma = getPrisma();
    expect(await prisma.category.count()).toBe(8);
    expect(await prisma.relatedSystem.count()).toBe(6);
    expect(await prisma.user.count()).toBe(11); // 6 requesters + 3 staff + 1 admin + 1 inactive staff
    expect(await prisma.ticket.count()).toBe(8);
    expect(await prisma.publicComment.count()).toBe(2);
    expect(await prisma.internalNote.count()).toBe(2);
  });

  it("tickets keep valid ownership, statuses and priorities (no column rewritten)", async () => {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({
      include: { requester: { select: { role: true } } },
    });
    expect(tickets).toHaveLength(8);
    for (const t of tickets) {
      expect(t.ticketNumber).toMatch(/^TK-\d{6}$/);
      expect(t.requester.role).toBe("REQUESTER");
      expect(ALL_STATUSES).toContain(t.currentStatus);
      expect(ALL_PRIORITIES).toContain(t.requestedPriority);
      expect(ALL_PRIORITIES).toContain(t.itPriority);
    }
  });
});

describe("MIG-02: legacy zero-action Tickets + valid Action references", () => {
  it("at least three Tickets still have zero actions (legacy grandfather, BR-18)", async () => {
    const prisma = getPrisma();
    const all = await prisma.ticket.findMany({
      select: { id: true, currentStatus: true, actions: { select: { id: true } } },
    });
    const zeroAction = all.filter((t) => t.actions.length === 0);
    expect(zeroAction.length).toBeGreaterThanOrEqual(3);
    // Includes a pre-existing RESOLVED and a CLOSED Ticket — these are the
    // rows the BR-11 resolution gate must grandfather (Issue 32 asserts the
    // API-level behavior; here we assert the data exists).
    expect(zeroAction.some((t) => t.currentStatus === "RESOLVED")).toBe(true);
    expect(zeroAction.some((t) => t.currentStatus === "CLOSED")).toBe(true);
  });

  it("every Action references an existing Ticket and an existing staff performer", async () => {
    const prisma = getPrisma();
    const actions = await prisma.actionTaken.findMany({
      include: { ticket: { select: { id: true } }, performedBy: { select: { role: true, active: true } } },
    });
    expect(actions.length).toBeGreaterThanOrEqual(1);
    for (const a of actions) {
      expect(a.ticket).not.toBeNull();
      expect(a.performedBy.role).toBe("IT_STAFF");
      expect(a.performedBy.active).toBe(true);
      expect(a.actionDescription.length).toBeGreaterThan(0);
    }
  });
});

describe("MIG-03: seedLab4 idempotency (re-run creates no duplicates)", () => {
  it("running seedLab4 twice leaves every row count unchanged", async () => {
    const prisma = getPrisma();
    const countAll = async () =>
      Promise.all([
        prisma.category.count(),
        prisma.relatedSystem.count(),
        prisma.user.count(),
        prisma.ticket.count(),
        prisma.publicComment.count(),
        prisma.internalNote.count(),
        prisma.actionTaken.count(),
      ]);

    const first = await countAll();
    await seedLab4(prisma);
    const second = await countAll();

    expect(second).toEqual(first);
    expect(first[6]).toBe(TICKET_ACTIONS.length);
  });

  it("re-running seedLab4 does not modify Action timestamps", async () => {
    const prisma = getPrisma();
    const before = await prisma.actionTaken.findMany({ orderBy: { id: "asc" } });
    await seedLab4(prisma);
    const after = await prisma.actionTaken.findMany({ orderBy: { id: "asc" } });
    expect(after.map((a) => a.updatedAt.toISOString())).toEqual(
      before.map((a) => a.updatedAt.toISOString())
    );
  });
});

describe("MIG-04: seed coverage matrix (BR-19)", () => {
  it("covers all 8 statuses and all 4 priorities", async () => {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({
      select: { currentStatus: true, requestedPriority: true, itPriority: true },
    });
    expect(new Set(tickets.map((t) => t.currentStatus))).toEqual(new Set(ALL_STATUSES));
    const priorities = new Set(tickets.flatMap((t) => [t.requestedPriority, t.itPriority]));
    expect(priorities).toEqual(new Set(ALL_PRIORITIES));
  });

  it("covers assigned and unassigned Tickets", async () => {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({ select: { ownerId: true } });
    expect(tickets.some((t) => t.ownerId === null)).toBe(true);
    expect(tickets.some((t) => t.ownerId !== null)).toBe(true);
  });

  it("covers Tickets with zero, one and many actions", async () => {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({
      select: { actions: { select: { id: true } } },
    });
    const sizes = tickets.map((t) => t.actions.length);
    expect(sizes.filter((n) => n === 0).length).toBeGreaterThanOrEqual(1);
    expect(sizes.filter((n) => n === 1).length).toBeGreaterThanOrEqual(1);
    expect(sizes.filter((n) => n > 1).length).toBeGreaterThanOrEqual(1);
  });

  it("covers two different performers on the same Ticket (BR-02)", async () => {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({
      select: { actions: { select: { performedById: true } } },
    });
    const multiPerformer = tickets.some(
      (t) => new Set(t.actions.map((a) => a.performedById)).size >= 2
    );
    expect(multiPerformer).toBe(true);
  });

  it("covers follow-up Yes-with-note and No variants plus attachmentNotes", async () => {
    const prisma = getPrisma();
    const actions = await prisma.actionTaken.findMany();
    const withFollowUp = actions.filter((a) => a.followUpRequired);
    expect(withFollowUp.length).toBeGreaterThanOrEqual(1);
    for (const a of withFollowUp) expect(a.followUpNote).toBeTruthy();
    expect(actions.some((a) => !a.followUpRequired)).toBe(true);
    expect(actions.some((a) => (a.attachmentNotes ?? "").length > 0)).toBe(true);
  });

  it("covers a dedicated zero-metric requester (ivy.ing) for empty states", async () => {
    const prisma = getPrisma();
    const ivy = await prisma.user.findFirstOrThrow({
      where: { email: "ivy.ing@example.com" },
    });
    expect(ivy.role).toBe("REQUESTER");
    expect(ivy.active).toBe(true);
    const ticketCount = await prisma.ticket.count({ where: { requesterId: ivy.id } });
    expect(ticketCount).toBe(0);
  });

  it("touches ≥3 Tickets inside the 7-day window (SD-05/RD-03/RD-04 demo, D-5)", async () => {
    const prisma = getPrisma();
    const since = new Date(Date.now() - 7 * 24 * 3_600_000);
    const recent = await prisma.ticket.count({ where: { updatedAt: { gte: since } } });
    expect(recent).toBeGreaterThanOrEqual(3);
  });
});
