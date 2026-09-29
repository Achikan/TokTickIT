import { describe, it, expect } from "vitest";
import { normalizeEmail, isValidEmail, passwordPolicyError } from "../../src/session.js";

describe("UNIT-02: email normalization + uniqueness support (BR-09)", () => {
  it("lowercases and trims the email", () => {
    expect(normalizeEmail("  Alice.Anderson@Example.COM ")).toBe("alice.anderson@example.com");
  });

  it("treats differently-cased spellings as one address", () => {
    const a = normalizeEmail("Bob.Brown@Example.com");
    const b = normalizeEmail("  bob.brown@example.com ");
    expect(a).toBe(b);
  });

  it("validates a well-formed email and rejects malformed ones", () => {
    expect(isValidEmail("alice@example.com")).toBe(true);
    expect(isValidEmail("a b@example.com")).toBe(false);
    expect(isValidEmail("no-at-sign.com")).toBe(false);
    expect(isValidEmail("user@nodot")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("UNIT-02b: password policy boundary checks (api-spec §1.4)", () => {
  it("accepts a valid password", () => {
    expect(passwordPolicyError("Strong!p9")).toBe(null);
  });

  it("rejects passwords missing each required class", () => {
    expect(passwordPolicyError("short1!")).toBe("Password must be at least 8 characters.");
    expect(passwordPolicyError("NOLOWERCASE!1")).toBe("Password must contain at least one lowercase letter.");
    expect(passwordPolicyError("nouppercase!1")).toBe("Password must contain at least one uppercase letter.");
    expect(passwordPolicyError("nodigits!aA")).toBe("Password must contain at least one digit.");
    expect(passwordPolicyError("nospecial1aA")).toBe("Password must contain at least one special character.");
  });

  it("treats empty and non-string input as missing", () => {
    expect(passwordPolicyError("")).toBe("Password is required.");
    expect(passwordPolicyError(undefined)).toBe("Password is required.");
  });
});