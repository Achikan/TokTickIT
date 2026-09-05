import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import {
  CATEGORIES,
  RELATED_SYSTEMS,
  REQUESTERS,
  seedCategories,
  seedRelatedSystems,
  seedRequesters,
} from "../../prisma/seed.js";

describe("Lab 2 category seed", () => {
  it("seeds all Lab 2 categories", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.category.deleteMany({ where: { id: { gt: 4 } } });
      await seedCategories(tx);
      const names = await tx.category.findMany({ select: { name: true } });
      try {
        expect(names.map((c) => c.name).sort()).toEqual([...CATEGORIES].sort());
      } catch (err) {
        assertionError = err;
      }
      throw new Error("ROLLBACK");
    }).catch(() => {
      // rollback intentionally - do not persist test data
    });
    if (assertionError) throw assertionError;
  });

  it("is idempotent - running twice creates no duplicates", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.category.deleteMany({ where: { id: { gt: 4 } } });
      await seedCategories(tx);
      await seedCategories(tx);
      const count = await tx.category.count();
      const names = await tx.category.findMany({ select: { name: true } });
      try {
        expect(count).toBe(CATEGORIES.length);
        expect(new Set(names.map((c) => c.name)).size).toBe(CATEGORIES.length);
      } catch (err) {
        assertionError = err;
      }
      throw new Error("ROLLBACK");
    }).catch(() => {
      // rollback intentionally - do not persist test data
    });
    if (assertionError) throw assertionError;
  });

  it("marks seeded categories active", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.category.deleteMany({ where: { id: { gt: 4 } } });
      await seedCategories(tx);
      const inactive = await tx.category.count({ where: { active: false } });
      try {
        expect(inactive).toBe(0);
      } catch (err) {
        assertionError = err;
      }
      throw new Error("ROLLBACK");
    }).catch(() => {
      // rollback intentionally - do not persist test data
    });
    if (assertionError) throw assertionError;
  });
});

describe("Lab 2 related-system seed", () => {
  it("seeds all related systems", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.relatedSystem.deleteMany();
      await seedRelatedSystems(tx);
      const rows = await tx.relatedSystem.findMany({ select: { name: true } });
      try {
        expect(rows.map((r) => r.name).sort()).toEqual(
          [...RELATED_SYSTEMS.map((s) => s.name)].sort()
        );
      } catch (err) {
        assertionError = err;
      }
      throw new Error("ROLLBACK");
    }).catch(() => {
      // rollback intentionally - do not persist test data
    });
    if (assertionError) throw assertionError;
  });

  it("is idempotent - running twice creates no duplicates", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.relatedSystem.deleteMany();
      await seedRelatedSystems(tx);
      await seedRelatedSystems(tx);
      const count = await tx.relatedSystem.count();
      try {
        expect(count).toBe(RELATED_SYSTEMS.length);
      } catch (err) {
        assertionError = err;
      }
      throw new Error("ROLLBACK");
    }).catch(() => {
      // rollback intentionally - do not persist test data
    });
    if (assertionError) throw assertionError;
  });
});

describe("Lab 2 development-requester seed", () => {
  it("seeds all development requesters", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.developmentRequester.deleteMany();
      await seedRequesters(tx);
      const names = await tx.developmentRequester.findMany({ select: { name: true } });
      try {
        expect(names.map((r) => r.name).sort()).toEqual(
          [...REQUESTERS.map((r) => r.name)].sort()
        );
      } catch (err) {
        assertionError = err;
      }
      throw new Error("ROLLBACK");
    }).catch(() => {
      // rollback intentionally - do not persist test data
    });
    if (assertionError) throw assertionError;
  });

  it("seeds at least four active and at least one inactive requester", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.developmentRequester.deleteMany();
      await seedRequesters(tx);
      const active = await tx.developmentRequester.count({ where: { active: true } });
      const inactive = await tx.developmentRequester.count({ where: { active: false } });
      try {
        expect(active).toBeGreaterThanOrEqual(4);
        expect(inactive).toBeGreaterThanOrEqual(1);
      } catch (err) {
        assertionError = err;
      }
      throw new Error("ROLLBACK");
    }).catch(() => {
      // rollback intentionally - do not persist test data
    });
    if (assertionError) throw assertionError;
  });

  it("is idempotent - running twice creates no duplicates", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.developmentRequester.deleteMany();
      await seedRequesters(tx);
      await seedRequesters(tx);
      const count = await tx.developmentRequester.count();
      try {
        expect(count).toBe(REQUESTERS.length);
      } catch (err) {
        assertionError = err;
      }
      throw new Error("ROLLBACK");
    }).catch(() => {
      // rollback intentionally - do not persist test data
    });
    if (assertionError) throw assertionError;
  });
});