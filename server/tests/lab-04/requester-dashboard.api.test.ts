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

describe("API-RD: Requester Dashboard", () => {
  it("returns dashboard scoped to session user only (API-RD-01)", async () => {
    const req1 = await prisma.user.create({ data: { name: "A", email: "a@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
    const req2 = await prisma.user.create({ data: { name: "B", email: "b@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
    await prisma.category.create({ data: { id: 1, name: "Hardware", active: true } });
    await prisma.relatedSystem.create({ data: { id: 1, name: "ERP", type: "Application", active: true } });

    await prisma.ticket.create({ data: { ticketNumber: "TK-000001", summary: "s1", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "OPEN" } });
    await prisma.ticket.create({ data: { ticketNumber: "TK-000002", summary: "s2", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "WAITING_FOR_REQUESTER" } });
    await prisma.ticket.create({ data: { ticketNumber: "TK-000003", summary: "s3", description: "d", requesterId: req1.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "RESOLVED" } });
    await prisma.ticket.create({ data: { ticketNumber: "TK-000004", summary: "s4", description: "d", requesterId: req2.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "OPEN" } });

    const client = await loginClient(app, "a@test.com", "Password1!", { clearGate: true });
    const res = await client.get("/api/requester/dashboard").expect(200);
    expect(res.body.metrics.openCount).toBe(2);
    expect(res.body.metrics.waitingForRequesterCount).toBe(1);
    expect(res.body.recentlyUpdated.items.length).toBeGreaterThanOrEqual(0);
    expect(res.body.recentlyResolved.items.map((x: any) => x.ticketNumber)).toContain("TK-000003");
    // should not include req2 ticket
    const all = [...res.body.recentlyUpdated.items, ...res.body.recentlyResolved.items];
    expect(all.map((x: any) => x.ticketNumber)).not.toContain("TK-000004");
    expect(res.body.drilldown).toBeDefined();
  });

  it("staff gets 403, zero-state for fresh requester (API-RD-02)", async () => {
    await prisma.user.create({ data: { name: "Dan", email: "dan@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true } });
    const staffClient = await loginClient(app, "dan@test.com", "Password1!");
    await staffClient.get("/api/requester/dashboard").expect(403);

    await prisma.user.create({ data: { name: "New", email: "new@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true } });
    const client = await loginClient(app, "new@test.com", "Password1!", { clearGate: true });
    const res = await client.get("/api/requester/dashboard").expect(200);
    expect(res.body.metrics.openCount).toBe(0);
    expect(res.body.metrics.waitingForRequesterCount).toBe(0);
    expect(res.body.recentlyUpdated.items).toEqual([]);
    expect(res.body.recentlyResolved.items).toEqual([]);
  });

  it("401 unauthenticated", async () => {
    const res = await request(app).get("/api/requester/dashboard").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
