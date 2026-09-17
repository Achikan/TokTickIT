import { describe, it, expect, beforeEach } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import {
  seedRequesters,
  seedCategories,
  seedRelatedSystems,
  seedLab2,
  seedLab3,
} from "../../prisma/seed.js";

describe("seed functions", () => {
  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.internalNote.deleteMany();
    await prisma.publicComment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.user.deleteMany();
    await prisma.relatedSystem.deleteMany();
    await prisma.category.deleteMany();
  });

  // ---------------------------------------------------------------------------
  // Category seed
  // ---------------------------------------------------------------------------
  it("creates all 8 categories (SPEC §7)", async () => {
    const prisma = getPrisma();
    await seedCategories(prisma);

    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    expect(categories).toHaveLength(8);
    expect(categories.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "Account and Access",
        "Hardware",
        "Software",
        "Network",
        "Printing",
        "Email",
        "Data and Backup",
        "Application Support",
      ])
    );
  });

  it("creates categories exactly once when seedCategories is called twice", async () => {
    const prisma = getPrisma();
    await seedCategories(prisma);
    await seedCategories(prisma);

    const count = await prisma.category.count();
    expect(count).toBe(8);
  });

  // ---------------------------------------------------------------------------
  // Related System seed
  // ---------------------------------------------------------------------------
  it("creates all 6 related systems (SPEC §7)", async () => {
    const prisma = getPrisma();
    await seedRelatedSystems(prisma);

    const systems = await prisma.relatedSystem.findMany();
    expect(systems).toHaveLength(6);
    expect(systems.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        "ERP System",
        "HR System",
        "CRM System",
        "Email Server",
        "Network Infrastructure",
        "VPN Gateway",
      ])
    );
  });

  it("creates related systems exactly once when called twice", async () => {
    const prisma = getPrisma();
    await seedRelatedSystems(prisma);
    await seedRelatedSystems(prisma);

    const count = await prisma.relatedSystem.count();
    expect(count).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // User / Requester seed
  // ---------------------------------------------------------------------------
  it("seedRequesters creates exactly 5 User accounts with role REQUESTER (4 active + 1 inactive)", async () => {
    const prisma = getPrisma();
    await seedRequesters(prisma);

    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
    expect(requesters).toHaveLength(5);

    const active = requesters.filter((r) => r.active);
    const inactive = requesters.filter((r) => !r.active);
    expect(active).toHaveLength(4);
    expect(inactive).toHaveLength(1);

    // Inactive must be evan.ellis@example.com (SPEC §7)
    expect(inactive[0].email).toBe("evan.ellis@example.com");
  });

  it("seedRequesters is idempotent (upserts by email without duplicating)", async () => {
    const prisma = getPrisma();
    await seedRequesters(prisma);
    await seedRequesters(prisma);

    const count = await prisma.user.count({ where: { role: "REQUESTER" } });
    expect(count).toBe(5);
  });

  it("seedLab2 creates categories + related systems + requester users together", async () => {
    const prisma = getPrisma();
    await seedLab2(prisma);

    const cats = await prisma.category.count();
    const sys = await prisma.relatedSystem.count();
    const users = await prisma.user.count({ where: { role: "REQUESTER" } });

    expect(cats).toBe(8);
    expect(sys).toBe(6);
    expect(users).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // Lab 3 full seed (Issue 17 / Issue 25)
  // ---------------------------------------------------------------------------
  it("seedLab3 creates all users, tickets and categories", async () => {
    const prisma = getPrisma();
    await seedLab3(prisma);

    const cats = await prisma.category.count();
    const sys = await prisma.relatedSystem.count();
    const users = await prisma.user.count();
    const tickets = await prisma.ticket.count();

    expect(cats).toBe(8);
    expect(sys).toBe(6);
    expect(users).toBe(10); // 5 requesters + 3 staff + 1 admin + 1 inactive staff
    expect(tickets).toBe(8);
  });

  it("seedLab3 is idempotent — running twice does not duplicate records", async () => {
    const prisma = getPrisma();
    await seedLab3(prisma);
    await seedLab3(prisma);

    const counts = await Promise.all([
      prisma.category.count(),
      prisma.relatedSystem.count(),
      prisma.user.count(),
      prisma.ticket.count(),
    ]);
    expect(counts).toEqual([8, 6, 10, 8]);
  });

  it("seeded tickets have valid TK-XXXXXX ticket numbers (SPEC §6)", async () => {
    const prisma = getPrisma();
    await seedLab3(prisma);

    const tickets = await prisma.ticket.findMany();
    for (const t of tickets) {
      expect(t.ticketNumber).toMatch(/^TK-\d{6}$/);
    }

    const numbers = tickets.map((t) => t.ticketNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
