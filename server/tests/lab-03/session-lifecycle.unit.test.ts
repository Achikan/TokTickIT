import { describe, it, expect } from "vitest";
import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions, readSessionToken } from "../../src/session.js";

describe("UNIT-03: session lifecycle primitives (BR-07)", () => {
  it("enforces a positive idle timeout aligned with the spec", () => {
    expect(SESSION_TTL_MS).toBe(12 * 60 * 60 * 1000);
  });

  it("marks the session cookie httpOnly, sameSite and path-scoped", () => {
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("strict");
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(SESSION_TTL_MS);
  });

  it("clears the cookie by expiring it immediately", () => {
    const opts = sessionCookieOptions(0);
    expect(opts.maxAge).toBe(0);
  });

  it("reads the session token from cookies and rejects empty values", () => {
    const req = { cookies: { [SESSION_COOKIE]: "tok-abc" } } as never;
    expect(readSessionToken(req)).toBe("tok-abc");
    const empty = { cookies: { [SESSION_COOKIE]: "" } } as never;
    expect(readSessionToken(empty)).toBe(null);
    const none = { cookies: {} } as never;
    expect(readSessionToken(none)).toBe(null);
  });
});