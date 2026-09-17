import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { CATEGORIES } from "../../prisma/seed.js";
import { resetDatabase, seedReferenceAndUsers, loginRequester } from "../helpers.js";

describe("GET /api/categories", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedReferenceAndUsers();
  });

  it("requires authentication (401 without a session)", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the seeded categories in id order for an authenticated user", async () => {
    const client = await loginRequester(app);
    const res = await client.get("/api/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map((c: { name: string }) => c.name).sort()).toEqual(
      [...CATEGORIES].sort()
    );
  });
});
