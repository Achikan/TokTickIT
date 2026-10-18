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
  // Requesters: 4 active + 1 inactive (must change their initial password),
  // plus a fresh active requester with zero Tickets so dashboard zero-states
  // can be demonstrated (specification.md §7.3, BR-19).
  { name: "Alice Anderson", email: "alice.anderson@example.com", role: "REQUESTER", active: true },
  { name: "Bob Brown", email: "bob.brown@example.com", role: "REQUESTER", active: true },
  { name: "Carol Chen", email: "carol.chen@example.com", role: "REQUESTER", active: true },
  { name: "David Diaz", email: "david.diaz@example.com", role: "REQUESTER", active: true },
  { name: "Evan Ellis", email: "evan.ellis@example.com", role: "REQUESTER", active: false },
  { name: "Ivy Ing", email: "ivy.ing@example.com", role: "REQUESTER", active: true },
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

// ---------------------------------------------------------------------------
// Lab 4 (Issue 29) — Actions Taken seed (specification.md §7.3, BR-18/BR-19).
//
// Coverage (MIG-04):
//   * zero actions  : 1001 (NEW), 1005 (RESOLVED - grandfathered), 1006 (CLOSED -
//                     grandfathered, also demos "recently resolved" without actions),
//                     1008 (CANCELLED)
//   * one action    : 1002, 1004 (follow-up required + note), 1007 (performer
//                     differs from the Ticket Owner - BR-02)
//   * many actions  : 1003 (three actions across three staff performers)
//   * attachmentNotes example on 1003; follow-up No/Yes both present.
//
// Idempotency + legacy backfill: actions are seeded per ticket only while that
// ticket has ZERO actions, so re-runs are no-ops AND an existing Lab 1-3
// database (Tickets present, no Actions) receives its backfill on the first
// Lab 4 seed (BR-18).
//
// Recency (BR-15, D-5): tickets that carry actions are "touched" to a recent
// updatedAt so SD-05/RD-03/RD-04 have non-zero demo values; the fresh
// requester (Ivy) keeps all metrics at zero for empty-state demos.
// ---------------------------------------------------------------------------

interface ActionSeed {
  ticketNumber: string;
  performerEmail: string;
  actionDateTime: string; // ISO-8601 UTC
  actionDescription: string;
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string;
  attachmentNotes?: string;
  /** hours subtracted from now() for the parent Ticket's updatedAt touch */
  touchTicketUpdatedAtHoursAgo?: number;
}

export const TICKET_ACTIONS: ActionSeed[] = [
  {
    ticketNumber: formatTicketNumber(1002),
    performerEmail: "dan.das@example.com",
    actionDateTime: "2026-10-10T09:15:00.000Z",
    actionDescription: "Reviewed the VPN gateway logs; error 813 traces to an expired lab certificate.",
    result: "New certificate installed on the gateway; asked the requester to reconnect.",
    touchTicketUpdatedAtHoursAgo: 3,
  },
  {
    ticketNumber: formatTicketNumber(1003),
    performerEmail: "frank.gao@example.com",
    actionDateTime: "2026-10-08T14:00:00.000Z",
    actionDescription: "Cleared the paper path and cleaned the rollers of the floor-3 printer.",
    result: "Test print succeeded twice; ordered a spare feeder as prevention.",
    attachmentNotes: "printer-cleanup-photo.jpg - before/after picture of the roller assembly",
    touchTicketUpdatedAtHoursAgo: 26,
  },
  {
    ticketNumber: formatTicketNumber(1003),
    performerEmail: "eileen.ford@example.com",
    actionDateTime: "2026-10-09T10:30:00.000Z",
    actionDescription: "Installed the spare feeder and ran a quick verification pass.",
    result: "Feeder replaced; first pass completed without jams.",
    attachmentNotes: "feeder-verification.txt",
    touchTicketUpdatedAtHoursAgo: 24,
  },
  {
    ticketNumber: formatTicketNumber(1003),
    performerEmail: "dan.das@example.com",
    actionDateTime: "2026-10-12T10:30:00.000Z",
    actionDescription: "Follow-up inspection after the feeder replacement (recorded by a different staff member than the Ticket Owner).",
    result: "No jams observed in a 24-hour soak test.",
    attachmentNotes: "feeder-replacement-log.pdf",
  },
  {
    ticketNumber: formatTicketNumber(1004),
    performerEmail: "dan.das@example.com",
    actionDateTime: "2026-10-14T11:45:00.000Z",
    actionDescription: "Re-ran the CRM export with the finance date range; reproduced the missing-rows defect and opened a vendor ticket.",
    result: "Vendor acknowledged a patch for the next release; waiting for the requester to confirm the export dates.",
    followUpRequired: true,
    followUpNote: "Re-run the export with the requester once the vendor patch is applied (target: next week).",
    touchTicketUpdatedAtHoursAgo: 48,
  },
  {
    ticketNumber: formatTicketNumber(1007),
    performerEmail: "frank.gao@example.com",
    actionDateTime: "2026-10-15T13:10:00.000Z",
    actionDescription: "Traced the duplicate invoice job to a stuck scheduler lock; cleared the lock and re-queued a single run.",
    result: "One clean invoice produced; monitoring the overnight batch after the reopen.",
    touchTicketUpdatedAtHoursAgo: 5,
  },
];

export async function seedActions(prisma: DbClient): Promise<number> {
  let created = 0;
  const checked = new Set<number>();
  const alreadyHasActions = new Set<number>();
  for (const a of TICKET_ACTIONS) {
    const ticket = await prisma.ticket.findUnique({ where: { ticketNumber: a.ticketNumber } });
    if (!ticket) continue;
    // Zero-count guard, evaluated once per ticket: idempotent on re-run, and
    // backfills legacy Lab 1-3 tickets that arrive with no actions (BR-18).
    if (!checked.has(ticket.id)) {
      checked.add(ticket.id);
      const existing = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
      if (existing > 0) alreadyHasActions.add(ticket.id);
    }
    if (alreadyHasActions.has(ticket.id)) continue;
    const performer = await prisma.user.findUnique({
      where: { email: a.performerEmail.toLowerCase() },
    });
    if (!performer) continue;
    await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        actionDateTime: new Date(a.actionDateTime),
        actionDescription: a.actionDescription,
        result: a.result ?? null,
        performedById: performer.id,
        followUpRequired: a.followUpRequired ?? false,
        followUpNote: a.followUpNote ?? null,
        attachmentNotes: a.attachmentNotes ?? null,
      },
    });
    created += 1;
    if (a.touchTicketUpdatedAtHoursAgo !== undefined) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date(Date.now() - a.touchTicketUpdatedAtHoursAgo * 3_600_000) },
      });
    }
  }
  // Legacy-closed demo (RD-04 "recently resolved"): keep 1006 inside the
  // 7-day window without inventing actions for it (it stays zero-action).
  const closed = await prisma.ticket.findUnique({ where: { ticketNumber: formatTicketNumber(1006) } });
  if (closed) {
    await prisma.ticket.update({
      where: { id: closed.id },
      data: { updatedAt: new Date(Date.now() - 6 * 24 * 3_600_000) },
    });
  }
  return created;
}

export async function seedLab4(
  prisma: DbClient
): Promise<{ tickets: { id: number; ticketNumber: string }[]; actionsCreated: number }> {
  const { tickets } = await seedLab3(prisma);
  const actionsCreated = await seedActions(prisma);
  return { tickets, actionsCreated };
}

// Backwards-compatible alias used by Lab 2 seed callers (categories + systems + requesters).
export async function seedLab2(prisma: DbClient): Promise<void> {
  await seedCategories(prisma);
  await seedRelatedSystems(prisma);
  await seedRequesters(prisma);
}

async function main() {
  const prisma = getPrisma();
  const result = await seedLab4(prisma);
  console.log(
    `Seeded ${CATEGORIES.length} categories, ${RELATED_SYSTEMS.length} related systems, ` +
      `${USERS.length} users (${USERS.filter((u) => u.role === "REQUESTER").length} requesters, ` +
      `${USERS.filter((u) => u.role === "IT_STAFF").length} IT staff, ` +
      `${USERS.filter((u) => u.role === "ADMIN").length} admin), ` +
      `${TICKETS.length} tickets (${result.tickets.length} newly created), ` +
      `${result.actionsCreated} actions taken (${TICKET_ACTIONS.length} planned) + sample comments/notes.`
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