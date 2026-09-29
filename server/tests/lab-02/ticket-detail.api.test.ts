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

let aliceId: number;
let bobId: number;
let hardware: { id: number };
let erp: { id: number };
let alice: ApiClient;
let bob: ApiClient;

async function createTicket(
  overrides: Partial<{
    requesterId: number;
    summary: string;
    description: string;
    categoryId: number;
    relatedSystemId: number;
    requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    currentStatus: "NEW" | "IN_PROGRESS" | "RESOLVED";
    sequence: number;
  }> = {}
) {
  const prisma = getPrisma();
  const seq = overrides.sequence ?? 1;
  return prisma.ticket.create({
    data: {
      ticketNumber: formatTicketNumber(seq),
      summary: overrides.summary ?? "Test ticket summary",
      description: overrides.description ?? "Test ticket description",
      requesterId: overrides.requesterId ?? aliceId,
      categoryId: overrides.categoryId ?? hardware.id,
      relatedSystemId: overrides.relatedSystemId ?? erp.id,
      requestedPriority: overrides.requestedPriority ?? "MEDIUM",
      currentStatus: overrides.currentStatus ?? "NEW",
    },
    include: { category: true, relatedSystem: true, attachments: true },
  });
}

describe("GET /api/tickets/:id (Ticket Detail)", () => {
  beforeEach(async () => {
    const prisma = getPrisma();
    await resetDatabase();
    await seedReferenceAndUsers(prisma);

    aliceId = (
      await prisma.user.findFirstOrThrow({
        where: { email: REQUESTERS.alice, role: "REQUESTER" },
        select: { id: true },
      })
    ).id;
    bobId = (
      await prisma.user.findFirstOrThrow({
        where: { email: REQUESTERS.bob, role: "REQUESTER" },
        select: { id: true },
      })
    ).id;
    hardware = await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } });
    erp = await prisma.relatedSystem.findFirstOrThrow({ where: { name: "ERP System" } });

    alice = await loginRequester(app, REQUESTERS.alice);
    bob = await loginRequester(app, REQUESTERS.bob);
  });

  afterAll(async () => {
    await resetDatabase();
    await seedReferenceAndUsers();
  });

  it("returns the full Ticket detail for an owned ticket (API-10, FR-13)", async () => {
    const ticket = await createTicket({
      summary: "Laptop battery drains quickly",
      description: "Battery drops from 100% to 20% in an hour.",
      requestedPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      sequence: 1,
    });

    const res = await alice.get(`/api/tickets/${ticket.id}`);

    expect(res.status).toBe(200);
    expect(res.body.ticket).toMatchObject({
      ticketNumber: ticket.ticketNumber,
      id: ticket.id,
      summary: "Laptop battery drains quickly",
      description: "Battery drops from 100% to 20% in an hour.",
      requesterId: aliceId,
      category: { id: hardware.id, name: "Hardware" },
      relatedSystem: { id: erp.id, name: "ERP System" },
      requestedPriority: "HIGH",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
    });
    expect(res.body.ticket.createdAt).toBeDefined();
    expect(res.body.ticket.updatedAt).toBeDefined();
    expect(Array.isArray(res.body.ticket.attachments)).toBe(true);
    expect(res.body.ticket.attachments).toHaveLength(0);
  });

  it("rejects an unauthenticated request with 401 (no session cookie)", async () => {
    const ticket = await createTicket({ sequence: 10 });

    const res = await request(app).get(`/api/tickets/${ticket.id}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 for a Ticket owned by another requester (non-disclosing) (API-09, AC-03, FR-14)", async () => {
    const aliceTicket = await createTicket({
      requesterId: aliceId,
      summary: "Alice private ticket",
      sequence: 2,
    });

    const res = await bob.get(`/api/tickets/${aliceTicket.id}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a non-existent Ticket ID", async () => {
    const res = await alice.get("/api/tickets/999999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
