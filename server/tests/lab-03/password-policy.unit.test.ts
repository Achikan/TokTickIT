import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, BCRYPT_ROUNDS } from "../../src/session.js";

describe("UNIT-01: password hashing (BR-06)", () => {
  it("produces a bcrypt hash that differs from the plaintext", async () => {
    const plain = "P@ssw0rd!01";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifies a matching password and rejects a wrong one", async () => {
    const hash = await hashPassword("Correct1!");
    await expect(verifyPassword("Correct1!", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-one", hash)).resolves.toBe(false);
  });

  it("is a randomized salted hash: two hashes of the same password differ", async () => {
    const one = await hashPassword("SamePass!1");
    const two = await hashPassword("SamePass!1");
    expect(one).not.toBe(two);
    await expect(verifyPassword("SamePass!1", one)).resolves.toBe(true);
    await expect(verifyPassword("SamePass!1", two)).resolves.toBe(true);
  });

  it("uses the documented cost factor", () => {
    expect(BCRYPT_ROUNDS).toBe(10);
  });
});