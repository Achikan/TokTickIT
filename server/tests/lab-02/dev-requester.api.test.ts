import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { seedRequesters, REQUESTERS } from "../../prisma/seed.js";

describe("GET /api/development-requesters", () => {
  afterAll(async () => {
    // Restore the idempotent seed state after the tests that mutate it.
    await seedRequesters(getPrisma());
  });

  it("returns only active requesters", async () => {
    const res = await request(app).get("/api/development-requesters");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);

    const names = res.body.items.map((r: { name: string }) => r.name);
    expect(names).toContain("Alice Anderson");
    expect(names).not.toContain("Evan Ellis"); // inactive
  });

  it("returns each active requester with id, name, and email", async () => {
    const res = await request(app).get("/api/development-requesters");
    const active = REQUESTERS.filter((r) => r.active);
    expect(res.body.items).toHaveLength(active.length);
    for (const item of res.body.items) {
      expect(item).toHaveProperty("id");
      expect(typeof item.name).toBe("string");
      expect(typeof item.email).toBe("string");
    }
  });

  it("returns an empty items array when no active requesters exist", async () => {
    const prisma = getPrisma();
    await prisma.developmentRequester.deleteMany();

    const res = await request(app).get("/api/development-requesters");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});