import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { formatTicketNumber } from "../../src/ticketNumber.js";
import {
  resetDatabase,
  seedReferenceAndUsers,
  loginRequester,
  REQUESTERS,
  type ApiClient,
} from "../helpers.js";

interface TicketSeed {
  requesterId: number;
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus?: "NEW" | "IN_PROGRESS" | "RESOLVED";
  createdAt?: Date;
  sequence: number;
}

async function seedTicket(prisma: ReturnType<typeof getPrisma>, t: TicketSeed) {
  return prisma.ticket.create({
    data: {
      ticketNumber: formatTicketNumber(t.sequence),
      summary: t.summary,
      description: t.description,
      requesterId: t.requesterId,
      categoryId: t.categoryId,
      relatedSystemId: t.relatedSystemId,
      requestedPriority: t.requestedPriority ?? "MEDIUM",
      currentStatus: t.currentStatus ?? "NEW",
      createdAt: t.createdAt,
    },
    include: { category: true, relatedSystem: true },
  });
}

describe("GET /api/tickets (My Tickets)", () => {
  let aliceUser: { id: number };
  let bobUser: { id: number };
  let alice: ApiClient;
  let bob: ApiClient;
  let hardware: { id: number };
  let software: { id: number };
  let erp: { id: number };

  beforeEach(async () => {
    const prisma = getPrisma();
    await resetDatabase();
    await seedReferenceAndUsers(prisma);

    aliceUser = (await prisma.user.findFirstOrThrow({
      where: { email: REQUESTERS.alice, role: "REQUESTER" },
      select: { id: true },
    }))!;
    bobUser = (await prisma.user.findFirstOrThrow({
      where: { email: REQUESTERS.bob, role: "REQUESTER" },
      select: { id: true },
    }))!;
    hardware = await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } });
    software = await prisma.category.findFirstOrThrow({ where: { name: "Software" } });
    erp = await prisma.relatedSystem.findFirstOrThrow({ where: { name: "ERP System" } });

    alice = await loginRequester(app, REQUESTERS.alice);
    bob = await loginRequester(app, REQUESTERS.bob);
  });

  afterAll(async () => {
    await resetDatabase();
    await seedReferenceAndUsers();
  });

  it("returns only the signed-in requester's tickets (API-04, AC-05, FR-11)", async () => {
    const prisma = getPrisma();
    await seedTicket(prisma, {
      requesterId: aliceUser.id,
      summary: "Laptop battery",
      description: "Battery drains.",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      sequence: 1,
    });
    await seedTicket(prisma, {
      requesterId: bobUser.id,
      summary: "Bob's server",
      description: "Server down.",
      categoryId: software.id,
      relatedSystemId: erp.id,
      sequence: 2,
    });

    const res = await alice.get("/api/tickets");

    expect(res.status).toBe(200);
    const summaries = res.body.items.map((t: { summary: string }) => t.summary);
    expect(summaries).toEqual(["Laptop battery"]);
    expect(summaries).not.toContain("Bob's server");
    expect(res.body.pagination.total).toBe(1);
  });

  it("rejects an unauthenticated request with 401 (no session cookie)", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("paginates and returns page metadata (API-05, AC-07, FR-12)", async () => {
    const prisma = getPrisma();
    for (let i = 1; i <= 5; i++) {
      await seedTicket(prisma, {
        requesterId: aliceUser.id,
        summary: `Ticket number ${i}`,
        description: "Desc",
        categoryId: hardware.id,
        relatedSystemId: erp.id,
        sequence: i,
      });
    }

    const res = await alice.get("/api/tickets").query("page=2&pageSize=2");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.pagination).toEqual({
      page: 2,
      pageSize: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it("narrows results by search and by filters (API-06, AC-07, FR-12)", async () => {
    const prisma = getPrisma();
    await seedTicket(prisma, {
      requesterId: aliceUser.id,
      summary: "Printer offline in room 202",
      description: "Cannot print.",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      sequence: 1,
    });
    await seedTicket(prisma, {
      requesterId: aliceUser.id,
      summary: "Email not green",
      description: "Email sync issue.",
      categoryId: software.id,
      relatedSystemId: erp.id,
      requestedPriority: "HIGH",
      currentStatus: "NEW",
      sequence: 2,
    });
    await seedTicket(prisma, {
      requesterId: aliceUser.id,
      summary: "Laptop fan noise",
      description: "Loud fan.",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "LOW",
      currentStatus: "RESOLVED",
      sequence: 3,
    });

    const searchRes = await alice.get("/api/tickets").query("search=printer");
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Printer offline in room 202",
    ]);
    expect(searchRes.body.filtersApplied.search).toBe("printer");

    // Search by official Ticket Number (review point 1).
    const ticketNumberSearch = await alice.get("/api/tickets").query("search=TK-00");
    expect(ticketNumberSearch.status).toBe(200);
    expect(ticketNumberSearch.body.items).toHaveLength(3);
    expect(
      ticketNumberSearch.body.items.map((t: { ticketNumber: string }) => t.ticketNumber).sort()
    ).toEqual(["TK-000001", "TK-000002", "TK-000003"]);

    const categoryRes = await alice.get("/api/tickets").query(`categoryId=${hardware.id}`);
    expect(categoryRes.status).toBe(200);
    expect(categoryRes.body.items).toHaveLength(2);
    expect(categoryRes.body.filtersApplied.categoryId).toBe(String(hardware.id));

    const statusRes = await alice.get("/api/tickets").query("status=RESOLVED");
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Laptop fan noise",
    ]);

    const priorityRes = await alice.get("/api/tickets").query("requestedPriority=HIGH");
    expect(priorityRes.status).toBe(200);
    expect(priorityRes.body.items).toHaveLength(2);
  });

  it("sorts results as requested (API-07, AC-07, FR-12)", async () => {
    const prisma = getPrisma();
    const seeds = [
      { summary: "Bravo issue", description: "B", sequence: 1 },
      { summary: "Alpha issue", description: "A", sequence: 2 },
      { summary: "Charlie issue", description: "C", sequence: 3 },
    ];
    for (const s of seeds) {
      await seedTicket(prisma, {
        requesterId: aliceUser.id,
        summary: s.summary,
        description: s.description,
        categoryId: hardware.id,
        relatedSystemId: erp.id,
        sequence: s.sequence,
      });
    }

    const asc = await alice.get("/api/tickets").query("sort=summary");
    expect(asc.status).toBe(200);
    expect(asc.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Alpha issue",
      "Bravo issue",
      "Charlie issue",
    ]);

    const desc = await alice.get("/api/tickets").query("sort=-summary");
    expect(desc.status).toBe(200);
    expect(desc.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Charlie issue",
      "Bravo issue",
      "Alpha issue",
    ]);
  });

  it("uses a deterministic secondary sort when sorting by a non-unique column", async () => {
    const prisma = getPrisma();
    const base = Date.UTC(2026, 8, 1, 9, 0, 0);
    await seedTicket(prisma, {
      requesterId: aliceUser.id,
      summary: "Oldest low priority",
      description: "A",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "LOW",
      createdAt: new Date(base),
      sequence: 1,
    });
    await seedTicket(prisma, {
      requesterId: aliceUser.id,
      summary: "Middle low priority",
      description: "B",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "LOW",
      createdAt: new Date(base + 1000),
      sequence: 2,
    });
    await seedTicket(prisma, {
      requesterId: aliceUser.id,
      summary: "Newest low priority",
      description: "C",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "LOW",
      createdAt: new Date(base + 2000),
      sequence: 3,
    });

    const res = await alice.get("/api/tickets").query("sort=requestedPriority");

    expect(res.status).toBe(200);
    expect(res.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Newest low priority",
      "Middle low priority",
      "Oldest low priority",
    ]);
  });

  it("rejects invalid page, size, sort, and filter values with 400 (API-08, BR-10)", async () => {
    const cases = [
      "page=0",
      "page=abc",
      "pageSize=99",
      "pageSize=-1",
      "sort=notacolumn",
      "status=NONSENSE",
      "requestedPriority=WHAT",
      "categoryId=notanumber",
    ];
    for (const q of cases) {
      const res = await alice.get("/api/tickets").query(q);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns an empty list with correct metadata when there are no tickets (empty state)", async () => {
    const res = await alice.get("/api/tickets");

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
  });

  it("does not leak another requester's tickets through filters (BR-06)", async () => {
    const prisma = getPrisma();
    await seedTicket(prisma, {
      requesterId: bobUser.id,
      summary: "Bob private ticket",
      description: "Not visible to Alice.",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      sequence: 1,
    });

    const res = await bob.get("/api/tickets");
    expect(res.status).toBe(200);
    expect(res.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Bob private ticket",
    ]);
  });
});
