import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { formatTicketNumber } from "../../src/ticketNumber.js";
import {
  seedRequesters,
  seedCategories,
  seedRelatedSystems,
} from "../../prisma/seed.js";

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
  let alice: { id: number };
  let bob: { id: number };
  let evan: { id: number };
  let hardware: { id: number };
  let software: { id: number };
  let erp: { id: number };

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany();
    await seedCategories(prisma);
    await seedRelatedSystems(prisma);
    await seedRequesters(prisma);

    alice = (await prisma.developmentRequester.findFirst({
      where: { email: "alice.anderson@example.com" },
      select: { id: true },
    }))!;
    bob = (await prisma.developmentRequester.findFirst({
      where: { email: "bob.brown@example.com" },
      select: { id: true },
    }))!;
    evan = (await prisma.developmentRequester.findFirst({
      where: { email: "evan.ellis@example.com" },
      select: { id: true },
    }))!;
    hardware = (await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } }));
    software = (await prisma.category.findFirstOrThrow({ where: { name: "Software" } }));
    erp = (await prisma.relatedSystem.findFirstOrThrow({ where: { name: "ERP System" } }));
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany();
    await seedCategories(prisma);
    await seedRelatedSystems(prisma);
    await seedRequesters(prisma);
  });

  it("returns only the selected requester's tickets (API-04, AC-05, FR-11)", async () => {
    const prisma = getPrisma();
    await seedTicket(prisma, {
      requesterId: alice.id,
      summary: "Laptop battery",
      description: "Battery drains.",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      sequence: 1,
    });
    await seedTicket(prisma, {
      requesterId: bob.id,
      summary: "Bob's server",
      description: "Server down.",
      categoryId: software.id,
      relatedSystemId: erp.id,
      sequence: 2,
    });

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id));

    expect(res.status).toBe(200);
    const summaries = res.body.items.map((t: { summary: string }) => t.summary);
    expect(summaries).toEqual(["Laptop battery"]);
    expect(summaries).not.toContain("Bob's server");
    expect(res.body.pagination.total).toBe(1);
  });

  it("rejects a missing X-Requester-Id header with 403", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects an invalid/inactive requester context with 404", async () => {
    const missing = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "999999");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const inactive = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(evan.id));
    expect(inactive.status).toBe(404);
    expect(inactive.body.error.code).toBe("NOT_FOUND");
  });

  it("paginates and returns page metadata (API-05, AC-07, FR-12)", async () => {
    const prisma = getPrisma();
    for (let i = 1; i <= 5; i++) {
      await seedTicket(prisma, {
        requesterId: alice.id,
        summary: `Ticket number ${i}`,
        description: "Desc",
        categoryId: hardware.id,
        relatedSystemId: erp.id,
        sequence: i,
      });
    }

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query("page=2&pageSize=2");

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
      requesterId: alice.id,
      summary: "Printer offline in room 202",
      description: "Cannot print.",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      sequence: 1,
    });
    await seedTicket(prisma, {
      requesterId: alice.id,
      summary: "Email not green",
      description: "Email sync issue.",
      categoryId: software.id,
      relatedSystemId: erp.id,
      requestedPriority: "HIGH",
      currentStatus: "NEW",
      sequence: 2,
    });
    await seedTicket(prisma, {
      requesterId: alice.id,
      summary: "Laptop fan noise",
      description: "Loud fan.",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "LOW",
      currentStatus: "RESOLVED",
      sequence: 3,
    });

    const searchRes = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query("search=printer");
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Printer offline in room 202",
    ]);
    expect(searchRes.body.filtersApplied.search).toBe("printer");

    // Search by official Ticket Number (review point 1).
    const ticketNumberSearch = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query("search=TK-00");
    expect(ticketNumberSearch.status).toBe(200);
    expect(ticketNumberSearch.body.items).toHaveLength(3);
    expect(
      ticketNumberSearch.body.items.map((t: { ticketNumber: string }) => t.ticketNumber).sort()
    ).toEqual(["TK-000001", "TK-000002", "TK-000003"]);

    const categoryRes = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query(`categoryId=${hardware.id}`);
    expect(categoryRes.status).toBe(200);
    expect(categoryRes.body.items).toHaveLength(2);
    expect(categoryRes.body.filtersApplied.categoryId).toBe(String(hardware.id));

    const statusRes = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query("status=RESOLVED");
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Laptop fan noise",
    ]);

    const priorityRes = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query("requestedPriority=HIGH");
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
        requesterId: alice.id,
        summary: s.summary,
        description: s.description,
        categoryId: hardware.id,
        relatedSystemId: erp.id,
        sequence: s.sequence,
      });
    }

    const asc = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query("sort=summary");
    expect(asc.status).toBe(200);
    expect(asc.body.items.map((t: { summary: string }) => t.summary)).toEqual([
      "Alpha issue",
      "Bravo issue",
      "Charlie issue",
    ]);

    const desc = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query("sort=-summary");
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
      requesterId: alice.id,
      summary: "Oldest low priority",
      description: "A",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "LOW",
      createdAt: new Date(base),
      sequence: 1,
    });
    await seedTicket(prisma, {
      requesterId: alice.id,
      summary: "Middle low priority",
      description: "B",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "LOW",
      createdAt: new Date(base + 1000),
      sequence: 2,
    });
    await seedTicket(prisma, {
      requesterId: alice.id,
      summary: "Newest low priority",
      description: "C",
      categoryId: hardware.id,
      relatedSystemId: erp.id,
      requestedPriority: "LOW",
      createdAt: new Date(base + 2000),
      sequence: 3,
    });

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id))
      .query("sort=requestedPriority");

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
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", String(alice.id))
        .query(q);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns an empty list with correct metadata when there are no tickets (empty state)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(alice.id));

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
  });
});