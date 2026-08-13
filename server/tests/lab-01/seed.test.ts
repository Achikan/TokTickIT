import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedCategories, CATEGORIES } from "../../prisma/seed.js";

describe("category seed", () => {
  it("seeds all four categories", async () => {
    const prisma = getPrisma();
    let assertionError: unknown;
    await prisma.$transaction(async (tx) => {
      await tx.category.deleteMany();
      await seedCategories(tx);
      const seeded = await tx.category.findMany({ select: { name: true } });
      try {
        expect(seeded.map((c) => c.name).sort()).toEqual([...CATEGORIES].sort());
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
      await tx.category.deleteMany();
      await seedCategories(tx);
      await seedCategories(tx);
      const count = await tx.category.count();
      const names = await tx.category.findMany({ select: { name: true } });
      try {
        expect(count).toBe(4);
        expect(new Set(names.map((c) => c.name)).size).toBe(4);
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
