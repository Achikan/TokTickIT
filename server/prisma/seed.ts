import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../src/prisma.js";

// ---------------------------------------------------------------------------
// Lab 2 (Issue 6) — idempotent seed data.
// Each seed function upserts by a unique key so re-running is harmless.
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  "Account and Access",
  "Hardware",
  "Software",
  "Network",
  "Printing",
  "Email",
  "Data and Backup",
  "Application Support",
] as const;

export const RELATED_SYSTEMS = [
  { name: "ERP System", type: "Application" },
  { name: "HR System", type: "Application" },
  { name: "CRM System", type: "Application" },
  { name: "Email Server", type: "Infrastructure" },
  { name: "Network Infrastructure", type: "Infrastructure" },
  { name: "VPN Gateway", type: "Infrastructure" },
] as const;

export const REQUESTERS = [
  { name: "Alice Anderson", email: "alice.anderson@example.com", active: true },
  { name: "Bob Brown", email: "bob.brown@example.com", active: true },
  { name: "Carol Chen", email: "carol.chen@example.com", active: true },
  { name: "David Diaz", email: "david.diaz@example.com", active: true },
  { name: "Evan Ellis", email: "evan.ellis@example.com", active: false },
] as const;

type DbClient = Pick<
  PrismaClient,
  "category" | "relatedSystem" | "developmentRequester"
>;

export async function seedCategories(prisma: DbClient): Promise<void> {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }
}

export async function seedRelatedSystems(prisma: DbClient): Promise<void> {
  for (const sys of RELATED_SYSTEMS) {
    // There is no natural unique key on RelatedSystem, so upsert by name.
    const existing = await prisma.relatedSystem.findFirst({
      where: { name: sys.name },
    });
    if (existing) {
      await prisma.relatedSystem.update({
        where: { id: existing.id },
        data: { type: sys.type, active: true },
      });
    } else {
      await prisma.relatedSystem.create({
        data: { name: sys.name, type: sys.type, active: true },
      });
    }
  }
}

export async function seedRequesters(prisma: DbClient): Promise<void> {
  for (const r of REQUESTERS) {
    await prisma.developmentRequester.upsert({
      where: { email: r.email },
      update: { name: r.name, active: r.active },
      create: { name: r.name, email: r.email, active: r.active },
    });
  }
}

export async function seedLab2(prisma: DbClient): Promise<void> {
  await seedCategories(prisma);
  await seedRelatedSystems(prisma);
  await seedRequesters(prisma);
}

async function main() {
  const prisma = getPrisma();
  await seedLab2(prisma);
  console.log(
    `Seeded ${CATEGORIES.length} categories, ${RELATED_SYSTEMS.length} related systems, ${REQUESTERS.length} development requesters.`
  );
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
