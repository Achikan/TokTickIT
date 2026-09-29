import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import {
  resetDatabase,
  seedFullLab3,
  loginStaff,
  loginRequester,
  loginAdmin,
  STAFF,
} from "../helpers.js";

// Lab 3 Issue 21 — IT Staff Ticket Queue (tests.md §2, API-25..API-27).
//   API-25 queue search / filter / sort / pagination -> 200 + metadata
//   API-26 invalid query values -> 400 specific error, never silently ignored
//   API-27 queue requested by Requester -> 403 without data

async function danId(): Promise<number> {
  const user = await getPrisma().user.findUnique({ where: { email: STAFF.dan } });
  if (!user) throw new Error("seeded staff member not found");
  return user.id;
}

beforeEach(async () => {
  await resetDatabase();
  await seedFullLab3();
});

afterAll(async () => {
  await resetDatabase();
  await seedFullLab3();
});

describe("API-25: queue search / filter / sort / pagination (AC-13, FR-12)", () => {
  it("returns the full seeded queue with default sort and pagination metadata", async () => {
    const client = await loginStaff(app);
    const res = await client.get("/api/staff/tickets");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(8);

    const first = res.body.items[0];
    expect(first).toMatchObject({
      ticketNumber: expect.any(String),
      id: expect.any(Number),
      summary: expect.any(String),
      category: { id: expect.any(Number), name: expect.any(String) },
      requester: { id: expect.any(Number), name: expect.any(String) },
      requestedPriority: expect.any(String),
      itPriority: expect.any(String),
      currentStatus: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    expect(res.body.pagination).toEqual({ page: 1, pageSize: 10, total: 8, totalPages: 1 });
    expect(res.body.filtersApplied).toEqual({});
  });

  it("search matches summary, description and ticketNumber case-insensitively", async () => {
    const client = await loginStaff(app);

    const bySummary = await client.get("/api/staff/tickets?search=vpn");
    expect(bySummary.status).toBe(200);
    expect(bySummary.body.items).toHaveLength(1);
    expect(bySummary.body.items[0].ticketNumber).toBe("TK-001002");
    expect(bySummary.body.filtersApplied.search).toBe("vpn");

    const byDescription = await client.get("/api/staff/tickets?search=garbage");
    expect(byDescription.status).toBe(200);
    expect(byDescription.body.items).toHaveLength(0);

    const byNumber = await client.get("/api/staff/tickets?search=tk-001005");
    expect(byNumber.status).toBe(200);
    expect(byNumber.body.items).toHaveLength(1);
    expect(byNumber.body.items[0].ticketNumber).toBe("TK-001005");
  });

  it("filters by status, requestedPriority and itPriority independently", async () => {
    const client = await loginStaff(app);

    const status = await client.get("/api/staff/tickets?status=NEW");
    expect(status.status).toBe(200);
    expect(status.body.items.map((t: { ticketNumber: string }) => t.ticketNumber)).toEqual([
      "TK-001001",
    ]);

    const requested = await client.get("/api/staff/tickets?requestedPriority=HIGH");
    expect(requested.status).toBe(200);
    expect(requested.body.items.map((t: { ticketNumber: string }) => t.ticketNumber).sort()).toEqual([
      "TK-001002",
      "TK-001004",
    ]);

    const it = await client.get("/api/staff/tickets?itPriority=HIGH");
    expect(it.status).toBe(200);
    expect(it.body.items.map((t: { ticketNumber: string }) => t.ticketNumber).sort()).toEqual([
      "TK-001002",
      "TK-001004",
    ]);
  });

  it("filters by ownerId, including the unassigned markers null / unassigned", async () => {
    const client = await loginStaff(app);
    const ownerId = await danId();

    const assigned = await client.get(`/api/staff/tickets?ownerId=${ownerId}`);
    expect(assigned.status).toBe(200);
    expect(assigned.body.items.map((t: { ticketNumber: string }) => t.ticketNumber).sort()).toEqual([
      "TK-001002",
      "TK-001004",
      "TK-001007",
    ]);

    for (const marker of ["unassigned", "null"]) {
      const unassigned = await client.get(`/api/staff/tickets?ownerId=${marker}`);
      expect(unassigned.status).toBe(200);
      expect(
        unassigned.body.items.map((t: { ticketNumber: string }) => t.ticketNumber).sort()
      ).toEqual(["TK-001001", "TK-001008"]);
      for (const item of unassigned.body.items) {
        expect(item.owner).toBeNull();
      }
    }
  });

  it("filters by categoryId and relatedSystemId", async () => {
    const client = await loginStaff(app);
    const hardware = await getPrisma().category.findUnique({ where: { name: "Hardware" } });
    const vpn = await getPrisma().relatedSystem.findFirst({ where: { name: "VPN Gateway" } });

    expect(hardware).toBeTruthy();
    expect(vpn).toBeTruthy();
    if (!hardware || !vpn) return;

    const byCategory = await client.get(`/api/staff/tickets?categoryId=${hardware.id}`);
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.items.map((t: { ticketNumber: string }) => t.ticketNumber).sort()).toEqual([
      "TK-001001",
      "TK-001006",
    ]);

    const bySystem = await client.get(`/api/staff/tickets?relatedSystemId=${vpn.id}`);
    expect(bySystem.status).toBe(200);
    expect(bySystem.body.items).toHaveLength(1);
    expect(bySystem.body.items[0].ticketNumber).toBe("TK-001002");
  });

  it("sorts by a valid column in both directions", async () => {
    const client = await loginStaff(app);

    const asc = await client.get("/api/staff/tickets?sort=%2BticketNumber");
    expect(asc.status).toBe(200);
    const ascNumbers = asc.body.items.map((t: { ticketNumber: string }) => t.ticketNumber);
    expect(ascNumbers[0]).toBe("TK-001001");
    expect(ascNumbers[ascNumbers.length - 1]).toBe("TK-001008");

    const desc = await client.get("/api/staff/tickets?sort=-ticketNumber");
    expect(desc.status).toBe(200);
    const descNumbers = desc.body.items.map((t: { ticketNumber: string }) => t.ticketNumber);
    expect(descNumbers[0]).toBe("TK-001008");
    expect(descNumbers[descNumbers.length - 1]).toBe("TK-001001");
  });

  it("paginates with page/pageSize and reports metadata", async () => {
    const client = await loginStaff(app);

    const firstPage = await client.get("/api/staff/tickets?page=1&pageSize=3");
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.items).toHaveLength(3);
    expect(firstPage.body.pagination).toEqual({ page: 1, pageSize: 3, total: 8, totalPages: 3 });

    const lastPage = await client.get("/api/staff/tickets?page=3&pageSize=3");
    expect(lastPage.status).toBe(200);
    expect(lastPage.body.items).toHaveLength(2);
    expect(lastPage.body.pagination).toEqual({ page: 3, pageSize: 3, total: 8, totalPages: 3 });
  });

  it("combines filters and echoes filtersApplied", async () => {
    const client = await loginStaff(app);
    const res = await client.get("/api/staff/tickets?search=laptop&status=NEW");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].ticketNumber).toBe("TK-001001");
    expect(res.body.filtersApplied).toEqual({ search: "laptop", status: "NEW" });
  });

  it("allows Administrators to view the queue (AC-10)", async () => {
    const admin = await loginAdmin(app);
    const res = await admin.get("/api/staff/tickets");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(8);
  });
});

describe("API-26: invalid query values -> 400 specific error (AC-13)", () => {
  it.each([
    { name: "page zero", qs: "page=0", field: "page" },
    { name: "page negative", qs: "page=-1", field: "page" },
    { name: "page non-numeric", qs: "page=abc", field: "page" },
    { name: "pageSize zero", qs: "pageSize=0", field: "pageSize" },
    { name: "pageSize over max", qs: "pageSize=51", field: "pageSize" },
    { name: "pageSize non-numeric", qs: "pageSize=x", field: "pageSize" },
    { name: "unknown status", qs: "status=BOGUS", field: "status" },
    { name: "unknown requestedPriority", qs: "requestedPriority=NOPE", field: "requestedPriority" },
    { name: "unknown itPriority", qs: "itPriority=NOPE", field: "itPriority" },
    { name: "ownerId non-numeric", qs: "ownerId=banana", field: "ownerId" },
    { name: "categoryId zero", qs: "categoryId=0", field: "categoryId" },
    { name: "categoryId non-numeric", qs: "categoryId=xyz", field: "categoryId" },
    { name: "relatedSystemId negative", qs: "relatedSystemId=-1", field: "relatedSystemId" },
    { name: "unsupported sort column", qs: "sort=description", field: "sort" },
    { name: "garbage sort", qs: "sort=@@@", field: "sort" },
  ])("$name -> 400 with a specific message, never silently ignored", async ({ qs, field }) => {
    const client = await loginStaff(app);
    const res = await client.get(`/api/staff/tickets?${qs}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(typeof res.body.error.fields[field]).toBe("string");
    expect(res.body.error.fields[field].length).toBeGreaterThan(0);
  });

  it("rejects a combination containing one invalid parameter", async () => {
    const client = await loginStaff(app);
    const res = await client.get("/api/staff/tickets?status=NEW&pageSize=100");
    expect(res.status).toBe(400);
    expect(res.body.error.fields.pageSize).toBeTruthy();
  });
});

describe("API-27: queue requested by a Requester -> 403 without data (AC-10, BR-10)", () => {
  it("blocks unauthenticated access with 401", async () => {
    const res = await request(app).get("/api/staff/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("forbids a Requester and returns no data", async () => {
    const client = await loginRequester(app);
    const res = await client.get("/api/staff/tickets");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.items).toBeUndefined();
    expect(res.body.pagination).toBeUndefined();
  });
});