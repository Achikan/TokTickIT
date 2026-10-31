import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { resetDatabase, loginClient } from "../helpers.js";
import { hashPassword } from "../../src/session.js";

const prisma = getPrisma();

beforeAll(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });
afterAll(async () => { await prisma.$disconnect(); });

const ALL_STATUSES = [
  "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER",
  "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
] as const;

const ALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

describe("API-SD-01/02/03: IT Staff Dashboard", () => {
  it("unauthenticated request returns 401", async () => {
    const res = await request(app).get("/api/staff/dashboard").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("requester is rejected with 403 without dashboard data", async () => {
    await prisma.user.create({
      data: {
        name: "Req Alice",
        email: "alice@test.com",
        passwordHash: await hashPassword("Password1!"),
        role: "REQUESTER",
        requiresPasswordChange: false,
        active: true,
      },
    });
    const client = await loginClient(app, "alice@test.com", "Password1!", { clearGate: true });
    const res = await client.get("/api/staff/dashboard").expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.metrics).toBeUndefined();
  });

  it("empty database returns 200 with all zero metrics, empty lists, and full drilldown map", async () => {
    const staff = await prisma.user.create({
      data: {
        name: "Dan Staff",
        email: "dan@test.com",
        passwordHash: await hashPassword("Password1!"),
        role: "IT_STAFF",
        requiresPasswordChange: false,
        active: true,
      },
    });

    const client = await loginClient(app, "dan@test.com", "Password1!");
    const res = await client.get("/api/staff/dashboard").expect(200);
    const body = res.body;

    expect(typeof body.generatedAt).toBe("string");
    expect(body.metrics.unassignedCount).toBe(0);
    expect(body.metrics.ownedByMeCount).toBe(0);

    for (const s of ALL_STATUSES) {
      expect(body.metrics.byStatus[s]).toBe(0);
    }
    for (const p of ALL_PRIORITIES) {
      expect(body.metrics.byPriority[p]).toBe(0);
    }

    expect(body.recentlyUpdated).toEqual({ items: [] });
    expect(body.urgentHigh).toEqual({ items: [] });
    expect(body.drilldown).toEqual({
      unassigned: "/api/staff/tickets?ownerId=unassigned",
      ownedByMe: "/api/staff/tickets?ownerId=me",
      byStatus: "/api/staff/tickets?status={status}",
      byPriority: "/api/staff/tickets?itPriority={priority}",
      recentlyUpdated: "/api/staff/tickets?sort=-updatedAt",
    });
    expect(body.userCounts).toBeUndefined();
  });

  it("computes exact metrics matching DB counts, includes all 8 statuses, active priorities, capped lists, and owner objects", async () => {
    const reqUser = await prisma.user.create({
      data: { name: "Requester R", email: "r@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true },
    });
    const dan = await prisma.user.create({
      data: { name: "Dan Engineer", email: "dan@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true },
    });
    const otherStaff = await prisma.user.create({
      data: { name: "Sam Staff", email: "sam@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true },
    });

    await prisma.category.create({ data: { id: 1, name: "Hardware", active: true } });
    await prisma.relatedSystem.create({ data: { id: 1, name: "ERP", type: "Application", active: true } });

    // Helper to create tickets with deterministic timestamps
    const now = Date.now();
    let counter = 1;
    async function mkTicket(data: {
      summary: string;
      currentStatus: (typeof ALL_STATUSES)[number];
      itPriority: (typeof ALL_PRIORITIES)[number];
      ownerId?: number | null;
      hoursAgo?: number;
    }) {
      const num = String(counter++).padStart(6, "0");
      const updatedAt = new Date(now - (data.hoursAgo ?? 1) * 3600 * 1000);
      return prisma.ticket.create({
        data: {
          ticketNumber: `TK-${num}`,
          summary: data.summary,
          description: "desc",
          requesterId: reqUser.id,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          itPriority: data.itPriority,
          currentStatus: data.currentStatus,
          ownerId: data.ownerId ?? null,
          createdAt: updatedAt,
          updatedAt,
        },
      });
    }

    // 1. Unassigned, active NEW, LOW (unassignedCount + 1, byStatus.NEW + 1, byPriority.LOW + 1)
    await mkTicket({ summary: "T1", currentStatus: "NEW", itPriority: "LOW", hoursAgo: 2 });
    // 2. Dan owned, active OPEN, MEDIUM (ownedByMe + 1, byStatus.OPEN + 1, byPriority.MEDIUM + 1)
    await mkTicket({ summary: "T2", currentStatus: "OPEN", itPriority: "MEDIUM", ownerId: dan.id, hoursAgo: 3 });
    // 3. Dan owned, active IN_PROGRESS, HIGH (ownedByMe + 1, byStatus.IN_PROGRESS + 1, byPriority.HIGH + 1, urgentHigh)
    await mkTicket({ summary: "T3", currentStatus: "IN_PROGRESS", itPriority: "HIGH", ownerId: dan.id, hoursAgo: 4 });
    // 4. Unassigned, active WAITING_FOR_REQUESTER, URGENT (unassignedCount + 1, byStatus.WAITING + 1, byPriority.URGENT + 1, urgentHigh)
    await mkTicket({ summary: "T4", currentStatus: "WAITING_FOR_REQUESTER", itPriority: "URGENT", hoursAgo: 5 });
    // 5. Dan owned, active REOPENED, URGENT (ownedByMe + 1, byStatus.REOPENED + 1, byPriority.URGENT + 1, urgentHigh)
    await mkTicket({ summary: "T5", currentStatus: "REOPENED", itPriority: "URGENT", ownerId: dan.id, hoursAgo: 6 });
    // 6. Dan owned, inactive RESOLVED, HIGH (byStatus.RESOLVED + 1; NOT in ownedByMe, NOT in byPriority, NOT in urgentHigh)
    await mkTicket({ summary: "T6", currentStatus: "RESOLVED", itPriority: "HIGH", ownerId: dan.id, hoursAgo: 7 });
    // 7. Unassigned, inactive CLOSED, LOW (byStatus.CLOSED + 1; NOT in unassignedCount, NOT in byPriority)
    await mkTicket({ summary: "T7", currentStatus: "CLOSED", itPriority: "LOW", hoursAgo: 8 });
    // 8. Unassigned, inactive CANCELLED, MEDIUM (byStatus.CANCELLED + 1; NOT in unassignedCount, NOT in byPriority)
    await mkTicket({ summary: "T8", currentStatus: "CANCELLED", itPriority: "MEDIUM", hoursAgo: 9 });
    // 9. OtherStaff owned, active OPEN, URGENT (byStatus.OPEN + 1, byPriority.URGENT + 1, urgentHigh)
    await mkTicket({ summary: "T9", currentStatus: "OPEN", itPriority: "URGENT", ownerId: otherStaff.id, hoursAgo: 10 });
    // 10. OtherStaff owned, active OPEN, HIGH (byStatus.OPEN + 1, byPriority.HIGH + 1, urgentHigh)
    await mkTicket({ summary: "T10", currentStatus: "OPEN", itPriority: "HIGH", ownerId: otherStaff.id, hoursAgo: 11 });
    // 11. OtherStaff owned, active OPEN, HIGH (byStatus.OPEN + 1, byPriority.HIGH + 1, urgentHigh)
    await mkTicket({ summary: "T11", currentStatus: "OPEN", itPriority: "HIGH", ownerId: otherStaff.id, hoursAgo: 12 });
    // 12. Ticket updated 8 days ago (outside 7d window)
    await mkTicket({ summary: "T12-Old", currentStatus: "CLOSED", itPriority: "LOW", hoursAgo: 8 * 24 });

    const client = await loginClient(app, "dan@test.com", "Password1!");
    const res = await client.get("/api/staff/dashboard").expect(200);
    const body = res.body;

    // Direct DB count comparison (no toBeGreaterThanOrEqual!)
    expect(body.metrics.unassignedCount).toBe(2); // T1, T4
    expect(body.metrics.ownedByMeCount).toBe(3);   // T2, T3, T5

    // byStatus covers all 8 statuses with exact counts
    expect(body.metrics.byStatus).toEqual({
      NEW: 1,
      OPEN: 4,
      IN_PROGRESS: 1,
      WAITING_FOR_REQUESTER: 1,
      RESOLVED: 1,
      CLOSED: 2,
      REOPENED: 1,
      CANCELLED: 1,
    });

    // byPriority covers all 4 priorities for active-status tickets only
    expect(body.metrics.byPriority).toEqual({
      LOW: 1,    // T1
      MEDIUM: 1, // T2
      HIGH: 3,   // T3, T10, T11
      URGENT: 3, // T4, T5, T9
    });

    // urgentHigh: capped at 5, URGENT ahead of HIGH, active only
    expect(body.urgentHigh.items).toHaveLength(5);
    const uhPriorities = body.urgentHigh.items.map((i: any) => i.itPriority);
    expect(uhPriorities).toEqual(["URGENT", "URGENT", "URGENT", "HIGH", "HIGH"]);

    // Ticket shape verification
    const item = body.urgentHigh.items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("ticketNumber");
    expect(item).toHaveProperty("summary");
    expect(item).toHaveProperty("currentStatus");
    expect(item).toHaveProperty("itPriority");
    expect(item).toHaveProperty("updatedAt");
    expect(item).toHaveProperty("owner");

    // Check owner representation (null or object with id and name)
    const unassignedItem = body.urgentHigh.items.find((i: any) => i.ticketNumber === "TK-000004");
    expect(unassignedItem.owner).toBeNull();
    const danItem = body.urgentHigh.items.find((i: any) => i.ticketNumber === "TK-000005");
    expect(danItem.owner).toEqual({ id: dan.id, name: "Dan Engineer" });

    // recentlyUpdated: capped at 5, within 7 days, newest first
    expect(body.recentlyUpdated.items).toHaveLength(5);
    const recDates = body.recentlyUpdated.items.map((i: any) => new Date(i.updatedAt).getTime());
    for (let i = 1; i < recDates.length; i++) {
      expect(recDates[i - 1]).toBeGreaterThanOrEqual(recDates[i]);
    }
    // T12-Old (8 days ago) must NOT be present
    expect(body.recentlyUpdated.items.some((i: any) => i.summary === "T12-Old")).toBe(false);
  });

  it("Administrator payload includes AD-01 userCounts { total, active } and IT Staff does not", async () => {
    await prisma.user.create({
      data: { name: "Active Admin", email: "admin@test.com", passwordHash: await hashPassword("Password1!"), role: "ADMIN", requiresPasswordChange: false, active: true },
    });
    await prisma.user.create({
      data: { name: "Inactive Staff", email: "inactive@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: false },
    });

    const adminClient = await loginClient(app, "admin@test.com", "Password1!");
    const adminRes = await adminClient.get("/api/staff/dashboard").expect(200);

    const totalInDb = await prisma.user.count();
    const activeInDb = await prisma.user.count({ where: { active: true } });

    expect(adminRes.body.userCounts).toBeDefined();
    expect(adminRes.body.userCounts.total).toBe(totalInDb);
    expect(adminRes.body.userCounts.active).toBe(activeInDb);

    // IT Staff does NOT receive userCounts
    const staffClient = await loginClient(app, "admin@test.com", "Password1!");
    // Change role to IT_STAFF for verification
    await prisma.user.update({ where: { email: "admin@test.com" }, data: { role: "IT_STAFF" } });
    const staffRes = await staffClient.get("/api/staff/dashboard").expect(200);
    expect(staffRes.body.userCounts).toBeUndefined();
  });

  it("ownerId=me resolves server-side in /api/staff/tickets to the session user", async () => {
    const dan = await prisma.user.create({
      data: { name: "Dan", email: "dan@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true },
    });
    const other = await prisma.user.create({
      data: { name: "Other", email: "other@test.com", passwordHash: await hashPassword("Password1!"), role: "IT_STAFF", requiresPasswordChange: false, active: true },
    });
    const reqUser = await prisma.user.create({
      data: { name: "Req", email: "r@test.com", passwordHash: await hashPassword("Password1!"), role: "REQUESTER", requiresPasswordChange: false, active: true },
    });

    await prisma.category.create({ data: { id: 1, name: "HW", active: true } });
    await prisma.relatedSystem.create({ data: { id: 1, name: "Sys", type: "App", active: true } });

    await prisma.ticket.create({
      data: { ticketNumber: "TK-000101", summary: "Dan ticket", description: "d", requesterId: reqUser.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "OPEN", ownerId: dan.id },
    });
    await prisma.ticket.create({
      data: { ticketNumber: "TK-000102", summary: "Other ticket", description: "d", requesterId: reqUser.id, categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "OPEN", ownerId: other.id },
    });

    const client = await loginClient(app, "dan@test.com", "Password1!");
    const resMe = await client.get("/api/staff/tickets?ownerId=me").expect(200);
    expect(resMe.body.items).toHaveLength(1);
    expect(resMe.body.items[0].ticketNumber).toBe("TK-000101");
    expect(resMe.body.items[0].owner.id).toBe(dan.id);

    // Verify it matches querying by explicit id
    const resId = await client.get(`/api/staff/tickets?ownerId=${dan.id}`).expect(200);
    expect(resId.body.items).toHaveLength(1);
    expect(resId.body.items[0].ticketNumber).toBe("TK-000101");
  });
});
