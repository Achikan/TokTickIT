import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import {
  seedRequesters,
  seedCategories,
  seedRelatedSystems,
} from "../../prisma/seed.js";

describe("POST /api/tickets", () => {
  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany();
    await seedCategories(prisma);
    await seedRelatedSystems(prisma);
    await seedRequesters(prisma);
  });

  it("creates a valid ticket and returns 201 with an official Ticket Number (API-01)", async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany();

    const alice = await prisma.developmentRequester.findFirst({
      where: { email: "alice.anderson@example.com" },
    });
    const category = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const system = await prisma.relatedSystem.findFirst({ where: { name: "ERP System" } });
    expect(alice).toBeTruthy();
    expect(category).toBeTruthy();
    expect(system).toBeTruthy();

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(alice!.id))
      .send({
        requesterId: alice!.id,
        summary: "Laptop battery drains quickly",
        description: "Battery drops from 100% to 20% in an hour.",
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "MEDIUM",
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket.ticketNumber).toMatch(/^TK-\d{6}$/);
    expect(res.body.ticket.summary).toBe("Laptop battery drains quickly");
    expect(res.body.ticket.requesterId).toBe(alice!.id);
    expect(res.body.ticket.currentStatus).toBe("SUBMITTED");
    expect(res.body.ticket.category.name).toBe("Hardware");
    expect(res.body.ticket.relatedSystem.name).toBe("ERP System");

    const saved = await prisma.ticket.findUnique({
      where: { ticketNumber: res.body.ticket.ticketNumber },
    });
    expect(saved).toBeTruthy();
  });

  it("rejects a missing summary with field errors and no save (API-02)", async () => {
    const prisma = getPrisma();
    const before = await prisma.ticket.count();

    const alice = await prisma.developmentRequester.findFirst({
      where: { email: "alice.anderson@example.com" },
    });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(alice!.id))
      .send({
        requesterId: alice!.id,
        summary: "",
        description: "  ",
        categoryId: category!.id,
        relatedSystemId: system!.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.summary).toBeTruthy();
    expect(res.body.error.fields.description).toBeTruthy();

    const after = await prisma.ticket.count();
    expect(after).toBe(before);
  });

  it("defaults requestedPriority to MEDIUM when omitted (BR-06)", async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany();

    const alice = await prisma.developmentRequester.findFirst({
      where: { email: "alice.anderson@example.com" },
    });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(alice!.id))
      .send({
        requesterId: alice!.id,
        summary: "Printer offline",
        description: "The printer in room 202 is unreachable.",
        categoryId: category!.id,
        relatedSystemId: system!.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket.requestedPriority).toBe("MEDIUM");
  });

  it("rejects a categoryId that does not reference an active category", async () => {
    const prisma = getPrisma();
    const before = await prisma.ticket.count();

    const alice = await prisma.developmentRequester.findFirst({
      where: { email: "alice.anderson@example.com" },
    });
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(alice!.id))
      .send({
        requesterId: alice!.id,
        summary: "Bad category",
        description: "This ticket refers to a missing category.",
        categoryId: 999999,
        relatedSystemId: system!.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.categoryId).toBeTruthy();

    const after = await prisma.ticket.count();
    expect(after).toBe(before);
  });

  it("rejects a missing X-Requester-Id header with 403", async () => {
    const prisma = getPrisma();
    const before = await prisma.ticket.count();

    const alice = await prisma.developmentRequester.findFirst({
      where: { email: "alice.anderson@example.com" },
    });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: alice!.id,
      summary: "No header",
      description: "This should not be created.",
      categoryId: category!.id,
      relatedSystemId: system!.id,
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");

    const after = await prisma.ticket.count();
    expect(after).toBe(before);
  });

  it("rejects an X-Requester-Id that does not match the request body with 403", async () => {
    const prisma = getPrisma();
    const before = await prisma.ticket.count();

    const alice = await prisma.developmentRequester.findFirst({
      where: { email: "alice.anderson@example.com" },
    });
    const other = await prisma.developmentRequester.findFirst({
      where: { email: "bob.brown@example.com" },
    });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(other!.id))
      .send({
        requesterId: alice!.id,
        summary: "Spoofed header",
        description: "Header must match the requester in the body.",
        categoryId: category!.id,
        relatedSystemId: system!.id,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");

    const after = await prisma.ticket.count();
    expect(after).toBe(before);
  });
});