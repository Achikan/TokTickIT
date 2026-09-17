import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { formatTicketNumber } from "../../src/ticketNumber.js";
import {
  resetDatabase,
  seedReferenceAndUsers,
  loginRequester,
  loginStaff,
  loginAdmin,
  CSRF_HEADER,
  REQUESTERS,
  type ApiClient,
} from "../helpers.js";

// Lab 3 Issue 18 — Authorization API (tests.md §2, API-09..API-15).
// Server-side enforcement only: a hidden UI control is never authorization.

let aliceId: number;
let bobId: number;
let categoryId: number;
let systemId: number;
let alice: ApiClient;
let bob: ApiClient;

async function seedOwnedTicket(requesterId: number, sequence: number, summary = "Owned ticket") {
  const prisma = getPrisma();
  return prisma.ticket.create({
    data: {
      ticketNumber: formatTicketNumber(sequence),
      summary,
      description: "Authorization test ticket.",
      requesterId,
      categoryId,
      relatedSystemId: systemId,
      requestedPriority: "MEDIUM",
      currentStatus: "NEW",
    },
  });
}

beforeEach(async () => {
  const prisma = getPrisma();
  await resetDatabase();
  await seedReferenceAndUsers(prisma);

  aliceId = (
    await prisma.user.findFirstOrThrow({ where: { email: REQUESTERS.alice }, select: { id: true } })
  ).id;
  bobId = (
    await prisma.user.findFirstOrThrow({ where: { email: REQUESTERS.bob }, select: { id: true } })
  ).id;
  categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } })).id;
  systemId = (await prisma.relatedSystem.findFirstOrThrow({ where: { name: "ERP System" } })).id;

  alice = await loginRequester(app, REQUESTERS.alice);
  bob = await loginRequester(app, REQUESTERS.bob);
});

afterAll(async () => {
  await resetDatabase();
  await seedReferenceAndUsers();
});

describe("API-09: unauthenticated protected endpoint returns 401", () => {
  it("rejects every protected endpoint without a session", async () => {
    const cases: Array<[string, request.Test]> = [
      ["GET /api/categories", request(app).get("/api/categories")],
      ["GET /api/related-systems", request(app).get("/api/related-systems")],
      ["GET /api/tickets", request(app).get("/api/tickets")],
      ["GET /api/tickets/1", request(app).get("/api/tickets/1")],
      ["GET /api/tickets/1/attachments", request(app).get("/api/tickets/1/attachments")],
      ["GET /api/attachments/1/download", request(app).get("/api/attachments/1/download")],
      ["GET /api/auth/me", request(app).get("/api/auth/me")],
    ];

    for (const [label, test] of cases) {
      const res = await test;
      expect(res.status, label).toBe(401);
      expect(res.body.error.code, label).toBe("UNAUTHORIZED");
    }
  });

  it("rejects unauthenticated mutating endpoints (CSRF present) with 401", async () => {
    const post = await request(app).post("/api/tickets").set(CSRF_HEADER, "1").send({});
    expect(post.status).toBe(401);

    const upload = await request(app)
      .post("/api/tickets/1/attachments")
      .set(CSRF_HEADER, "1")
      .attach("file", Buffer.from("x"), { filename: "x.png", contentType: "image/png" });
    expect(upload.status).toBe(401);

    const remove = await request(app)
      .delete("/api/attachments/1")
      .set(CSRF_HEADER, "1")
      .send({ removedReason: "x" });
    expect(remove.status).toBe(401);

    const changePassword = await request(app)
      .post("/api/auth/change-password")
      .set(CSRF_HEADER, "1")
      .send({ currentPassword: "x", newPassword: "NewPass123!", confirmPassword: "NewPass123!" });
    expect(changePassword.status).toBe(401);
  });
});

describe("API-12: client-supplied requesterId is ignored (AC-03, BR-06)", () => {
  it("creates a ticket owned by the session user even when the body names someone else", async () => {
    const res = await alice.post("/api/tickets").send({
      requesterId: bobId,
      summary: "Spoof attempt",
      description: "Body must not choose the owner.",
      categoryId,
      relatedSystemId: systemId,
    });

    expect(res.status).toBe(201);
    expect(res.body.ticket.requesterId).toBe(aliceId);
  });

  it("lists only the session user's tickets even when an X-Requester-Id header is sent", async () => {
    await seedOwnedTicket(aliceId, 1, "Alice secret");
    await seedOwnedTicket(bobId, 2, "Bob secret");

    const res = await alice.agent.get("/api/tickets").set("X-Requester-Id", String(bobId));

    expect(res.status).toBe(200);
    const summaries = res.body.items.map((t: { summary: string }) => t.summary);
    expect(summaries).toEqual(["Alice secret"]);
    expect(summaries).not.toContain("Bob secret");
  });
});

describe("API-14: cross-user Ticket/Attachment access is non-disclosing (AC-03, BR-21)", () => {
  it("hides another requester's ticket behind a 404", async () => {
    const ticket = await seedOwnedTicket(aliceId, 1, "Alice private");

    const detail = await bob.get(`/api/tickets/${ticket.id}`);
    expect(detail.status).toBe(404);
    expect(detail.body.error.code).toBe("NOT_FOUND");

    const list = await bob.get(`/api/tickets/${ticket.id}/attachments`);
    expect(list.status).toBe(404);
  });

  it("hides another requester's attachment behind 404 for download and remove", async () => {
    const ticket = await seedOwnedTicket(aliceId, 1, "Alice with file");
    const upload = await alice
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 test"), {
        filename: "private.pdf",
        contentType: "application/pdf",
      });
    expect(upload.status).toBe(201);
    const attachmentId = upload.body.attachment.id;

    const download = await bob.get(`/api/attachments/${attachmentId}/download`);
    expect(download.status).toBe(404);

    const remove = await bob
      .delete(`/api/attachments/${attachmentId}`)
      .send({ removedReason: "not mine" });
    expect(remove.status).toBe(404);

    const uploadForeign = await bob
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach("file", Buffer.from("x"), { filename: "x.png", contentType: "image/png" });
    expect(uploadForeign.status).toBe(404);
  });
});

describe("API-15: role-protected operations are enforced server-side (AC-11, FR-06)", () => {
  it("forbids IT Staff from Requester-only endpoints with 403", async () => {
    const staff = await loginStaff(app);
    const ticket = await seedOwnedTicket(aliceId, 1);

    const create = await staff.post("/api/tickets").send({
      summary: "Staff cannot create",
      description: "Nope.",
      categoryId,
      relatedSystemId: systemId,
    });
    expect(create.status).toBe(403);
    expect(create.body.error.code).toBe("FORBIDDEN");

    expect((await staff.get("/api/tickets")).status).toBe(403);
    expect((await staff.get(`/api/tickets/${ticket.id}`)).status).toBe(403);
    expect(
      (
        await staff
          .post(`/api/tickets/${ticket.id}/attachments`)
          .attach("file", Buffer.from("x"), { filename: "x.png", contentType: "image/png" })
      ).status
    ).toBe(403);
  });

  it("forbids Admin from Requester-only endpoints with 403", async () => {
    const admin = await loginAdmin(app);
    expect((await admin.get("/api/tickets")).status).toBe(403);
    expect(
      (
        await admin.post("/api/tickets").send({
          summary: "Admin cannot create",
          description: "Nope.",
          categoryId,
          relatedSystemId: systemId,
        })
      ).status
    ).toBe(403);
  });

  it("keeps reference data readable by every authenticated role", async () => {
    const staff = await loginStaff(app);
    const admin = await loginAdmin(app);

    expect((await alice.get("/api/categories")).status).toBe(200);
    expect((await staff.get("/api/categories")).status).toBe(200);
    expect((await admin.get("/api/categories")).status).toBe(200);
    expect((await staff.get("/api/related-systems")).status).toBe(200);
  });
});

// The following destinations are introduced by later issues; until then there
// is no route to guard. They are tracked here so the authorization plan stays
// visible and must be enabled with the owning issue.
describe("API-10/11/13: staff queue, user management and internal notes", () => {
  it.todo("API-10: Requester requesting the staff queue is rejected with 403 (Issue 21)");
  it.todo("API-11: non-Admin requesting user management is rejected with 403 (Issue 23)");
  it.todo("API-13: Requester requesting an Internal Note endpoint gets 403 without note data (Issue 22)");
});
