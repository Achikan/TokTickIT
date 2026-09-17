import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../src/prisma.js";
import { formatTicketNumber } from "../src/ticketNumber.js";

type DbClient = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Lab 3 (Issue 17) — idempotent seed data (specification.md §7 Seed Data).
// Every seed function upserts by a unique key so re-running is harmless.
//
// Local-development credentials (documented in README — never real secrets):
//   - Requester accounts    : initial password "LostPass!23", must change on
//                             first login (requiresPasswordChange = true).
//   - IT Staff / Admin       : "DevPass!23", ready to use.
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

export const REQUESTER_INITIAL_PASSWORD = "LostPass!23";
export const STAFF_ADMIN_PASSWORD = "DevPass!23";

export const USERS = [
  // Requesters: 4 active + 1 inactive (must change their initial password).
  { name: "Alice Anderson", email: "alice.anderson@example.com", role: "REQUESTER", active: true },
  { name: "Bob Brown", email: "bob.brown@example.com", role: "REQUESTER", active: true },
  { name: "Carol Chen", email: "carol.chen@example.com", role: "REQUESTER", active: true },
  { name: "David Diaz", email: "david.diaz@example.com", role: "REQUESTER", active: true },
  { name: "Evan Ellis", email: "evan.ellis@example.com", role: "REQUESTER", active: false },
  // IT Staff: 3 active + 1 inactive.
  { name: "Dan Das", email: "dan.das@example.com", role: "IT_STAFF", active: true },
  { name: "Eileen Ford", email: "eileen.ford@example.com", role: "IT_STAFF", active: true },
  { name: "Frank Gao", email: "frank.gao@example.com", role: "IT_STAFF", active: true },
  { name: "Gina Hale", email: "gina.hale@example.com", role: "IT_STAFF", active: false },
  // Administrator: at least one active account for User Management.
  { name: "Henri Ito", email: "henri.ito@example.com", role: "ADMIN", active: true },
] as const;

interface TicketSeed {
  ticketNumber: string;
  summary: string;
  description: string;
  requesterEmail: string;
  categoryName: string;
  relatedSystemName: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus:
    | "NEW"
    | "OPEN"
    | "IN_PROGRESS"
    | "WAITING_FOR_REQUESTER"
    | "RESOLVED"
    | "CLOSED"
    | "REOPENED"
    | "CANCELLED";
  ownerEmail?: string;
}

export const TICKETS: TicketSeed[] = [
  {
    ticketNumber: formatTicketNumber(1001),
    summary: "Laptop battery drains quickly",
    description: "Battery drops from 100% to 20% within an hour on idle.",
    requesterEmail: "alice.anderson@example.com",
    categoryName: "Hardware",
    relatedSystemName: "ERP System",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
  },
  {
    ticketNumber: formatTicketNumber(1002),
    summary: "Cannot log into VPN from lab",
    description: "VPN gateway rejects the connection with error 813.",
    requesterEmail: "bob.brown@example.com",
    categoryName: "Network",
    relatedSystemName: "VPN Gateway",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "OPEN",
    ownerEmail: "dan.das@example.com",
  },
  {
    ticketNumber: formatTicketNumber(1003),
    summary: "Printer jams on floor 3",
    description: "The shared printer keeps jamming and stops further jobs.",
    requesterEmail: "carol.chen@example.com",
    categoryName: "Printing",
    relatedSystemName: "ERP System",
    requestedPriority: "LOW",
    itPriority: "MEDIUM",
    currentStatus: "IN_PROGRESS",
    ownerEmail: "frank.gao@example.com",
  },
  {
    ticketNumber: formatTicketNumber(1004),
    summary: "CRM export misses rows",
    description: "Monthly export for the finance team omits closed leads.",
    requesterEmail: "david.diaz@example.com",
    categoryName: "Application Support",
    relatedSystemName: "CRM System",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "WAITING_FOR_REQUESTER",
    ownerEmail: "dan.das@example.com",
  },
  {
    ticketNumber: formatTicketNumber(1005),
    summary: "Email sync timeout after upgrade",
    description: "Outlook client times out fetching from the mail server.",
    requesterEmail: "alice.anderson@example.com",
    categoryName: "Email",
    relatedSystemName: "Email Server",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "RESOLVED",
    ownerEmail: "eileen.ford@example.com",
  },
  {
    ticketNumber: formatTicketNumber(1006),
    summary: "Monitor flickers intermittently",
    description: "Display loses sync every few minutes on one workstation.",
    requesterEmail: "bob.brown@example.com",
    categoryName: "Hardware",
    relatedSystemName: "ERP System",
    requestedPriority: "LOW",
    itPriority: "LOW",
    currentStatus: "CLOSED",
    ownerEmail: "frank.gao@example.com",
  },
  {
    ticketNumber: formatTicketNumber(1007),
    summary: "Duplicate invoice reports generated",
    description: "Two identical payroll invoices were produced overnight.",
    requesterEmail: "carol.chen@example.com",
    categoryName: "Software",
    relatedSystemName: "HR System",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "REOPENED",
    ownerEmail: "dan.das@example.com",
  },
  {
    ticketNumber: formatTicketNumber(1008),
    summary: "Network slowness in lab 4",
    description: "Wired connections in lab 4 are heavily degraded.",
    requesterEmail: "david.diaz@example.com",
    categoryName: "Network",
    relatedSystemName: "Network Infrastructure",
    requestedPriority: "URGENT",
    itPriority: "URGENT",
    currentStatus: "CANCELLED",
  },
];

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
    const existing = await prisma.relatedSystem.findFirst({ where: { name: sys.name } });
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

function passwordFor(role: Role): string {
  return role === "REQUESTER" ? REQUESTER_INITIAL_PASSWORD : STAFF_ADMIN_PASSWORD;
}

export async function seedUsers(prisma: DbClient): Promise<void> {
  for (const u of USERS) {
    const role = u.role as Role;
    await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: {
        name: u.name,
        role,
        active: u.active,
        requiresPasswordChange: role === "REQUESTER" ? true : false,
        passwordHash: await bcrypt.hash(passwordFor(role), 10),
      },
      create: {
        name: u.name,
        email: u.email.toLowerCase(),
        role,
        active: u.active,
        requiresPasswordChange: role === "REQUESTER" ? true : false,
        passwordHash: await bcrypt.hash(passwordFor(role), 10),
      },
    });
  }
}

export async function seedRequesters(prisma: DbClient): Promise<void> {
  for (const u of USERS.filter((x) => x.role === "REQUESTER")) {
    await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: { name: u.name, active: u.active, role: "REQUESTER", requiresPasswordChange: true },
      create: {
        name: u.name,
        email: u.email.toLowerCase(),
        role: "REQUESTER",
        active: u.active,
        requiresPasswordChange: true,
        passwordHash: await bcrypt.hash(REQUESTER_INITIAL_PASSWORD, 10),
      },
    });
  }
}

// Creates the realistic ticket set only for ticketNumbers that do not exist yet
// (idempotent). Returns the tickets newly created so comments/notes can attach
// exactly once.
export async function seedTickets(prisma: DbClient): Promise<{ id: number; ticketNumber: string }[]> {
  const created: { id: number; ticketNumber: string }[] = [];
  for (const t of TICKETS) {
    const exists = await prisma.ticket.findUnique({ where: { ticketNumber: t.ticketNumber } });
    if (exists) continue;
    const requester = await prisma.user.findUnique({
      where: { email: t.requesterEmail.toLowerCase() },
    });
    const category = await prisma.category.findUnique({ where: { name: t.categoryName } });
    const system = await prisma.relatedSystem.findFirst({
      where: { name: t.relatedSystemName },
    });
    if (!requester || !category || !system) continue;
    const owner = t.ownerEmail
      ? await prisma.user.findUnique({ where: { email: t.ownerEmail.toLowerCase() } })
      : null;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        requesterId: requester.id,
        ownerId: owner?.id ?? null,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
      },
    });
    created.push({ id: ticket.id, ticketNumber: ticket.ticketNumber });
  }
  return created;
}

// Adds example Public Comments and Internal Notes only to tickets seeded by this
// run (so re-runs never duplicate). Content is generic and exposes no secrets.
export async function seedCommentsNotes(prisma: DbClient, tickets: { id: number; ticketNumber: string }[]) {
  const byNumber = new Map(tickets.map((t) => [t.ticketNumber, t.id]));
  const alice = await prisma.user.findUnique({ where: { email: "alice.anderson@example.com" } });
  const carol = await prisma.user.findUnique({ where: { email: "carol.chen@example.com" } });
  const dan = await prisma.user.findUnique({ where: { email: "dan.das@example.com" } });
  const frank = await prisma.user.findUnique({ where: { email: "frank.gao@example.com" } });

  const samples: {
    ticketNumber: string;
    kind: "comment" | "note";
    author: { id: number } | null;
    content: string;
  }[] = [
    { ticketNumber: formatTicketNumber(1001), kind: "comment", author: alice, content: "Tried reconnecting the battery, no improvement yet." },
    { ticketNumber: formatTicketNumber(1001), kind: "note", author: dan, content: "Vendor L4 case opened, awaiting patch availability." },
    { ticketNumber: formatTicketNumber(1003), kind: "comment", author: carol, content: "Cleaned the rollers, the jam still occurs." },
    { ticketNumber: formatTicketNumber(1003), kind: "note", author: frank, content: "Replacement feeder part requested." },
  ];

  for (const s of samples) {
    const ticketId = byNumber.get(s.ticketNumber);
    if (ticketId === undefined || !s.author) continue;
    if (s.kind === "comment") {
      await prisma.publicComment.create({
        data: { ticketId, authorId: s.author.id, content: s.content },
      });
    } else {
      await prisma.internalNote.create({
        data: { ticketId, authorId: s.author.id, content: s.content },
      });
    }
  }
}

export async function seedLab3(prisma: DbClient): Promise<{ tickets: { id: number; ticketNumber: string }[] }> {
  await seedCategories(prisma);
  await seedRelatedSystems(prisma);
  await seedUsers(prisma);
  const tickets = await seedTickets(prisma);
  await seedCommentsNotes(prisma, tickets);
  return { tickets };
}

// Backwards-compatible alias used by Lab 2 seed callers (categories + systems + requesters).
export async function seedLab2(prisma: DbClient): Promise<void> {
  await seedCategories(prisma);
  await seedRelatedSystems(prisma);
  await seedRequesters(prisma);
}

async function main() {
  const prisma = getPrisma();
  const result = await seedLab3(prisma);
  console.log(
    `Seeded ${CATEGORIES.length} categories, ${RELATED_SYSTEMS.length} related systems, ` +
      `${USERS.length} users (${USERS.filter((u) => u.role === "REQUESTER").length} requesters, ` +
      `${USERS.filter((u) => u.role === "IT_STAFF").length} IT staff, ` +
      `${USERS.filter((u) => u.role === "ADMIN").length} admin), ` +
      `${TICKETS.length} tickets (${result.tickets.length} newly created) + sample comments/notes.`
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