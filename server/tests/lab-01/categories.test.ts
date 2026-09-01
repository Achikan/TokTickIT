import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { CATEGORIES } from "../../prisma/seed.js";

describe("GET /api/categories", () => {
  it("returns the seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map((c: { name: string }) => c.name).sort()).toEqual(
      [...CATEGORIES].sort()
    );
  });
});
