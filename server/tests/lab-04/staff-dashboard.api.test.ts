import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/index.js";
import { getPrisma, resetDatabase } from "../../src/prisma.js";
import { hashPassword } from "../../src/password.js";

const app = createApp();
const prisma = getPrisma();

async function createUser(data: any) {
  return prisma.user.create({ data });
}

async function login(email: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return res.headers["set-cookie"]?.join(";") ?? "";
}

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });
afterAll(async () => { await prisma.$disconnect(); });

function nowMinus(ms: number) { return new Date(Date.now() - ms).toISOString(); }

describe("API-SD-01/02/03: IT Staff Dashboard", () => {
  it("returns staff dashboard metrics matching DB counts", async () => {
    const seed = await prisma.user.create({ data: { name: "Seed", email: "seed@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false } });
    const req1 = await createUser({ name: "A", email: "a@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false });
    const req2 = await createUser({ name: "B", email: "b@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false });
    const staff = await createUser({ name: "Dan", email: "dan@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false });
    const admin = await createUser({ name: "Ada", email: "ada@test.com", passwordHash: await hashPassword("Password1!"), role: "ADMIN", requiresPasswordChange: false });

    // Create tickets for metrics
    const tNew = await prisma.ticket.create({ data: { ticketNumber: "TK-000001", summary: "s1", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "LOW", currentStatus: "NEW" } });
    const tOpen = await prisma.ticket.create({ data: { ticketNumber: "TK-000002", summary: "s2", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "OPEN", ownerId: staff.id } });
    const tInProg = await prisma.ticket.create({ data: { ticketNumber: "TK-000003", summary: "s3", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", ownerId: staff.id } });
    const tWait = await prisma.ticket.create({ data: { ticketNumber: "TK-000004", summary: "s4", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "WAITING_FOR_REQUESTER" } });
    const tRes = await prisma.ticket.create({ data: { ticketNumber: "TK-000005", summary: "s5", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "RESOLVED" } });
    const tClosed = await prisma.ticket.create({ data: { ticketNumber: "TK-000006", summary: "s6", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CLOSED" } });
    const tReopen = await prisma.ticket.create({ data: { ticketNumber: "TK-000007", summary: "s7", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", itPriority: "LOW", currentStatus: "REOPENED", ownerId: staff.id } });
    const tCancel = await prisma.ticket.create({ data: { ticketNumber: "TK-000008", summary: "s8", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW", itPriority: "URGENT", currentStatus: "CANCELLED" } });

    // recent
    await prisma.ticket.update({ where: { id: tNew.id }, data: { updatedAt: new Date(nowMinus(1*60*60*1000)) } });
    await prisma.ticket.update({ where: { id: tOpen.id }, data: { updatedAt: new Date(nowMinus(2*24*60*60*1000)) } });

    const cookie = await login("dan@test.com", "Password1!");
    const res = await request(app).get("/api/staff/dashboard").set("Cookie", cookie).expect(200);
    const body = res.body;

    expect(body.metrics.unassigned).toBeGreaterThanOrEqual(3);
    expect(body.metrics.ownedByMe).toBeGreaterThanOrEqual(3);
    expect(body.metrics.byStatus.NEW).toBeGreaterThanOrEqual(1);
    expect(body.metrics.byStatus.OPEN).toBeGreaterThanOrEqual(1);
    expect(body.metrics.byItPriority.URGENT).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.lists.recentlyUpdated)).toBe(true);
    expect(Array.isArray(body.lists.urgentHigh)).toBe(true);
    expect(body.lists.recentlyUpdated.length).toBeLessThanOrEqual(5);
    expect(body.lists.urgentHigh.length).toBeLessThanOrEqual(5);
  });

  it("403 for requester", async () => {
    const req = await createUser({ name: "R", email: "r@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false });
    const cookie = await login("r@test.com", "Password1!");
    const res = await request(app).get("/api/staff/dashboard").set("Cookie", cookie).expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("admin gets user counts", async () => {
    const admin = await createUser({ name: "Ada", email: "ada@test.com", passwordHash: await hashPassword("Password1!"), role: "ADMIN", requiresPasswordChange: false });
    const cookie = await login("ada@test.com", "Password1!");
    const res = await request(app).get("/api/staff/dashboard").set("Cookie", cookie).expect(200);
    expect(res.body.administrator?.userCounts).toBeDefined();
    expect(res.body.administrator.userCounts.total).toBeGreaterThanOrEqual(2);
  });
});
