import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import {
  resetDatabase,
  seedReferenceAndUsers,
  loginRequester,
  REQUESTERS,
  type ApiClient,
} from "../helpers.js";

describe("POST /api/tickets", () => {
  let alice: ApiClient;
  let aliceId: number;
  let bobId: number;
  let categoryId: number;
  let systemId: number;

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
    categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } })).id;
    systemId = (await prisma.relatedSystem.findFirstOrThrow({ where: { name: "ERP System" } })).id;

    alice = await loginRequester(app, REQUESTERS.alice);
  });

  afterAll(async () => {
    await resetDatabase();
    await seedReferenceAndUsers();
  });

  it("creates a valid ticket and returns 201 with an official Ticket Number (API-01)", async () => {
    const prisma = getPrisma();
    const before = await prisma.ticket.count();

    const res = await alice.post("/api/tickets").send({
      summary: "Laptop battery drains quickly",
      description: "Battery drops from 100% to 20% in an hour.",
      categoryId,
      relatedSystemId: systemId,
      requestedPriority: "MEDIUM",
    });

    expect(res.status).toBe(201);
    expect(res.body.ticket.ticketNumber).toMatch(/^TK-\d{6}$/);
    expect(res.body.ticket.summary).toBe("Laptop battery drains quickly");
    expect(res.body.ticket.requesterId).toBe(aliceId);
    expect(res.body.ticket.currentStatus).toBe("NEW");
    expect(res.body.ticket.category.name).toBe("Hardware");
    expect(res.body.ticket.relatedSystem.name).toBe("ERP System");

    const saved = await prisma.ticket.findUnique({
      where: { ticketNumber: res.body.ticket.ticketNumber },
    });
    expect(saved).toBeTruthy();
    expect(await prisma.ticket.count()).toBe(before + 1);
  });

  it("rejects a missing summary with field errors and no save (API-02)", async () => {
    const prisma = getPrisma();
    const before = await prisma.ticket.count();

    const res = await alice.post("/api/tickets").send({
      summary: "",
      description: "  ",
      categoryId,
      relatedSystemId: systemId,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.summary).toBeTruthy();
    expect(res.body.error.fields.description).toBeTruthy();

    expect(await prisma.ticket.count()).toBe(before);
  });

  it("defaults requestedPriority to MEDIUM when omitted (BR-06)", async () => {
    const res = await alice.post("/api/tickets").send({
      summary: "Printer offline",
      description: "The printer in room 202 is unreachable.",
      categoryId,
      relatedSystemId: systemId,
    });

    expect(res.status).toBe(201);
    expect(res.body.ticket.requestedPriority).toBe("MEDIUM");
  });

  it("rejects a categoryId that does not reference an active category", async () => {
    const prisma = getPrisma();
    const before = await prisma.ticket.count();

    const res = await alice.post("/api/tickets").send({
      summary: "Bad category",
      description: "This ticket refers to a missing category.",
      categoryId: 999999,
      relatedSystemId: systemId,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.categoryId).toBeTruthy();

    expect(await prisma.ticket.count()).toBe(before);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const prisma = getPrisma();
    const before = await prisma.ticket.count();

    const res = await request(app)
      .post("/api/tickets")
      .set("X-CSRF-Protected", "1")
      .send({
        summary: "No session",
        description: "This should not be created.",
        categoryId,
        relatedSystemId: systemId,
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");

    expect(await prisma.ticket.count()).toBe(before);
  });

  it("rejects a mutating request without the CSRF header with 403", async () => {
    const res = await request(app).post("/api/tickets").send({
      summary: "No CSRF header",
      description: "This should not be created.",
      categoryId,
      relatedSystemId: systemId,
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("ignores a client-supplied requesterId and uses the session identity (BR-06)", async () => {
    const res = await alice.post("/api/tickets").send({
      requesterId: bobId,
      summary: "Spoofed requester",
      description: "The body must not be able to choose the owner.",
      categoryId,
      relatedSystemId: systemId,
    });

    expect(res.status).toBe(201);
    expect(res.body.ticket.requesterId).toBe(aliceId);
  });
});
