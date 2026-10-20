import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { resetDatabase } from "../helpers.js";
import { loginClient } from "../helpers.js";
import { hashPassword } from "../../src/session.js";

const prisma = getPrisma();

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });
afterAll(async () => { await prisma.$disconnect(); });

function nowMinus(ms: number) { return new Date(Date.now() - ms).toISOString(); }

describe("API-SD-01/02/03: IT Staff Dashboard", () => {
  it("returns staff dashboard metrics matching DB counts", async () => {
    const req1 = await prisma.user.create({ data: { name: "A", email: "a@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
    const req2 = await prisma.user.create({ data: { name: "B", email: "b@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
    const staff = await prisma.user.create({ data: { name: "Dan", email: "dan@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true } });

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

    await prisma.ticket.update({ where: { ticketNumber: "TK-000001" }, data: { updatedAt: new Date(nowMinus(1*60*60*1000)) } });

    const client = await loginClient(app, "dan@test.com", "Password1!");
    const res = await client.get("/api/staff/dashboard").expect(200);
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
    await prisma.user.create({ data: { name: "R", email: "r@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
    const client = await loginClient(app, "r@test.com", "Password1!", { clearGate: true });
    const res = await client.get("/api/staff/dashboard").expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("admin gets user counts", async () => {
    await prisma.user.create({ data: { name: "Ada", email: "ada@test.com", passwordHash: await hashPassword("Password1!"), role: "ADMIN", requiresPasswordChange: false, active: true } });
    const client = await loginClient(app, "ada@test.com", "Password1!");
    const res = await client.get("/api/staff/dashboard").expect(200);
    expect(res.body.administrator?.userCounts).toBeDefined();
    expect(res.body.administrator.userCounts.total).toBeGreaterThanOrEqual(1);
  });
});
