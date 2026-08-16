import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
export const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"] as const;

type CategoryClient = Pick<PrismaClient, "category">;

// Exported separately from main() so the seed logic can be tested directly.
export async function seedCategories(prisma: CategoryClient): Promise<void> {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

async function main() {
  const prisma = getPrisma();
  await seedCategories(prisma);
  console.log(`Seeded ${CATEGORIES.length} categories.`);
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
