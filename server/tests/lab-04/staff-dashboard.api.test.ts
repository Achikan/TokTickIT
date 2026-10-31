import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { resetDatabase } from "../helpers.js";
import { loginClient } from "../helpers.js";
import { hashPassword } from "../../src/session.js";

const prisma = getPrisma();

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });
afterAll(async () => { await prisma.$disconnect(); });

async function seedBase() {
  const req1 = await prisma.user.create({ data: { name: "A", email: "a@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
  const req2 = await prisma.user.create({ data: { name: "B", email: "b@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
  const staff = await prisma.user.create({ data: { name: "Dan", email: "dan@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true } });
  const admin = await prisma.user.create({ data: { name: "Ada", email: "ada@test.com", passwordHash: await hashPassword("Password1!"), role: "ADMIN", requiresPasswordChange: false, active: true } });

  await prisma.category.create({ data: { id: 1, name: "Hardware", active: true } });
  await prisma.relatedSystem.create({ data: { id: 1, name: "ERP System", type: "Application", active: true } });

  await prisma.ticket.create({ data: { ticketNumber: "TK-000001", summary: "s1", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "LOW", currentStatus: "NEW" } });
  await prisma.ticket.create({ data: { ticketNumber: "TK-000002", summary: "s2", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "OPEN", ownerId: staff.id } });
  await prisma.ticket.create({ data: { ticketNumber: "TK-000003", summary: "s3", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", ownerId: staff.id } });
  await prisma.ticket.create({ data: { ticketNumber: "TK-000004", summary: "s4", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "WAITING_FOR_REQUESTER" } });
  await prisma.ticket.create({ data: { ticketNumber: "TK-000005", summary: "s5", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "RESOLVED" } });
  await prisma.ticket.create({ data: { ticketNumber: "TK-000006", summary: "s6", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CLOSED" } });
  await prisma.ticket.create({ data: { ticketNumber: "TK-000007", summary: "s7", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "REOPENED", ownerId: staff.id } });
  await prisma.ticket.create({ data: { ticketNumber: "TK-000008", summary: "s8", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", itPriority: "URGENT", currentStatus: "CANCELLED" } });

  await prisma.ticket.update({ where: { ticketNumber: "TK-000001" }, data: { updatedAt: new Date(Date.now() - 60 * 60 * 1000) } });

  return { req1, req2, staff, admin };
}

describe("API-SD: IT Staff Dashboard", () => {
  it("returns metrics matching DB counts (API-SD-01)", async () => {
    const { staff } = await seedBase();
    const client = await loginClient(app, "dan@test.com", "Password1!");
    const res = await client.get("/api/staff/dashboard").expect(200);
    const body = res.body;

    expect(body.metrics.unassignedCount).toBe(2);
    expect(body.metrics.ownedByMeCount).toBe(3);
    expect(body.metrics.byStatus).toEqual({
      NEW: 1, OPEN: 1, IN_PROGRESS: 1, WAITING_FOR_REQUESTER: 1,
      RESOLVED: 1, CLOSED: 1, REOPENED: 1, CANCELLED: 1,
    });
    expect(body.metrics.byPriority).toEqual({ LOW: 2, MEDIUM: 2, HIGH: 1, URGENT: 0 });
    expect(Array.isArray(body.recentlyUpdated.items)).toBe(true);
    expect(body.recentlyUpdated.items.length).toBeLessThanOrEqual(5);
    expect(Array.isArray(body.urgentHigh.items)).toBe(true);
    expect(body.urgentHigh.items.length).toBe(1);
    expect(body.urgentHigh.items[0].ticketNumber).toBe("TK-000003");
    expect(body.urgentHigh.items[0].itPriority).toBe("HIGH");
    expect(body.drilldown).toEqual({
      unassigned: "/api/staff/tickets?ownerId=unassigned",
      ownedByMe: "/api/staff/tickets?ownerId=me",
      byStatus: "/api/staff/tickets?status={status}",
      byPriority: "/api/staff/tickets?itPriority={priority}",
      recentlyUpdated: "/api/staff/tickets?sort=-updatedAt",
    });
    const item = body.recentlyUpdated.items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("ticketNumber");
    expect(item).toHaveProperty("summary");
    expect(item).toHaveProperty("currentStatus");
    expect(item).toHaveProperty("itPriority");
    expect(item).toHaveProperty("owner");
    expect(item).toHaveProperty("updatedAt");
    const unassignedItem = body.recentlyUpdated.items.find((x: any) => x.owner === null);
    if (unassignedItem) expect(unassignedItem.owner).toBeNull();
    const ownedItem = body.recentlyUpdated.items.find((x: any) => x.ticketNumber === "TK-000002");
    if (ownedItem) expect(ownedItem.owner).toEqual({ id: staff.id, name: "Dan" });
  });

  it("empty behavior returns 200 zeros (API-SD-02)", async () => {
    await prisma.user.create({ data: { name: "Dan", email: "dan@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true } });
    const client = await loginClient(app, "dan@test.com", "Password1!");
    const res = await client.get("/api/staff/dashboard").expect(200);
    expect(res.body.metrics.unassignedCount).toBe(0);
    expect(res.body.metrics.ownedByMeCount).toBe(0);
    expect(res.body.metrics.byStatus).toEqual({ NEW:0, OPEN:0, IN_PROGRESS:0, WAITING_FOR_REQUESTER:0, RESOLVED:0, CLOSED:0, REOPENED:0, CANCELLED:0 });
    expect(res.body.metrics.byPriority).toEqual({ LOW:0, MEDIUM:0, HIGH:0, URGENT:0 });
    expect(res.body.recentlyUpdated.items).toEqual([]);
    expect(res.body.urgentHigh.items).toEqual([]);
  });

  it("caps recentlyUpdated at 5", async () => {
    const req1 = await prisma.user.create({ data: { name: "A", email: "a@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
    await prisma.category.create({ data: { id: 1, name: "Hardware", active: true } });
    await prisma.relatedSystem.create({ data: { id: 1, name: "ERP", type: "Application", active: true } });
    for (let i = 1; i <= 7; i++) {
      await prisma.ticket.create({ data: { ticketNumber: `TK-00000${i}`, summary: `s${i}`, description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "LOW", currentStatus: "NEW" } });
    }
    await prisma.user.create({ data: { name: "Dan", email: "dan@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true } });
    const client = await loginClient(app, "dan@test.com", "Password1!");
    const res = await client.get("/api/staff/dashboard").expect(200);
    expect(res.body.recentlyUpdated.items.length).toBe(5);
  });

  it("403 for requester (API-SD-03)", async () => {
    await prisma.user.create({ data: { name: "R", email: "r@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
    const client = await loginClient(app, "r@test.com", "Password1!", { clearGate: true });
    const res = await client.get("/api/staff/dashboard").expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("401 unauthenticated", async () => {
    const res = await request(app).get("/api/staff/dashboard").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("admin gets userCounts (API-SD-03)", async () => {
    await prisma.user.create({ data: { name: "Ada", email: "ada@test.com", passwordHash: await hashPassword("Password1!"), role: "ADMIN", requiresPasswordChange: false, active: true } });
    const client = await loginClient(app, "ada@test.com", "Password1!");
    const res = await client.get("/api/staff/dashboard").expect(200);
    expect(res.body.userCounts).toBeDefined();
    expect(typeof res.body.userCounts.total).toBe("number");
    expect(typeof res.body.userCounts.active).toBe("number");
    expect(res.body.userCounts.total).toBeGreaterThanOrEqual(1);
  });

  it("ownerId=me alias matches ownerId=<id>", async () => {
    const { staff } = await seedBase();
    const client = await loginClient(app, "dan@test.com", "Password1!");
    const a = await client.get("/api/staff/tickets?ownerId=me").expect(200);
    const b = await client.get(`/api/staff/tickets?ownerId=${staff.id}`).expect(200);
    expect(a.body.items.map((x: any) => x.id)).toEqual(b.body.items.map((x: any) => x.id));
  });
});
