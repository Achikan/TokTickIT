import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import {
  resetDatabase,
  seedReferenceAndUsers,
  loginClient,
  CSRF_HEADER,
  REQUESTER_PASSWORD,
  STAFF_PASSWORD,
  REQUESTERS,
  STAFF,
  ADMIN,
} from "../helpers.js";

// Lab 3 Issue 18 — Authentication API (tests.md §2, API-01..API-08).
//   API-01 valid login        API-05 weak/mismatched password
//   API-02 invalid credentials API-06 valid password change
//   API-03 inactive account    API-07 logout invalidates session
//   API-04 requiresPasswordChange gate   API-08 current user

function login(email: string, password: string) {
  return request(app).post("/api/auth/login").set(CSRF_HEADER, "1").send({ email, password });
}

function setCookies(res: request.Response): string[] {
  const raw: unknown = res.headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as string[]) : [raw as string];
}

beforeEach(async () => {
  await resetDatabase();
  await seedReferenceAndUsers();
});

afterAll(async () => {
  await resetDatabase();
  await seedReferenceAndUsers();
});

describe("API-01: valid login", () => {
  it("returns 200, sets an HttpOnly SameSite=Strict session cookie and the user identity", async () => {
    const res = await login(REQUESTERS.alice, REQUESTER_PASSWORD);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: REQUESTERS.alice,
      role: "REQUESTER",
      requiresPasswordChange: true,
    });
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const sessionCookie = setCookies(res).find((c) => c.startsWith("tok_session="));
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toMatch(/SameSite=Strict/i);

    const sessions = await getPrisma().session.findMany();
    expect(sessions).toHaveLength(1);
  });

  it("returns the correct role for IT Staff and Admin logins", async () => {
    const staffRes = await login(STAFF.dan, STAFF_PASSWORD);
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.user.role).toBe("IT_STAFF");

    const adminRes = await login(ADMIN.henri, STAFF_PASSWORD);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.user.role).toBe("ADMIN");
  });

  it("validates missing/invalid input with 400 and field messages", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER, "1")
      .send({ email: "not-an-email", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.email).toBeTruthy();
    expect(res.body.error.fields.password).toBeTruthy();
  });

  it("rejects a login without the CSRF header with 403", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: REQUESTERS.alice, password: REQUESTER_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("API-02: invalid credentials", () => {
  it("returns the same generic 401 for a wrong password and an unknown email (no enumeration)", async () => {
    const wrongPassword = await login(REQUESTERS.alice, "DefinitelyWrong!1");
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("UNAUTHORIZED");

    const unknownEmail = await login("nobody@example.com", "DefinitelyWrong!1");
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error.code).toBe("UNAUTHORIZED");
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);

    // No session should have been created for either attempt.
    const sessions = await getPrisma().session.count();
    expect(sessions).toBe(0);
  });
});

describe("API-03: inactive account login", () => {
  it("returns a clear non-disclosing 403 for a valid inactive account and creates no session", async () => {
    const res = await login(REQUESTERS.evanInactive, REQUESTER_PASSWORD);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    expect(setCookies(res).some((c) => c.startsWith("tok_session="))).toBe(false);
    expect(await getPrisma().session.count()).toBe(0);
  });

  it("still returns the generic 401 for an inactive account with a wrong password", async () => {
    const res = await login(REQUESTERS.evanInactive, "DefinitelyWrong!1");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("blocks the inactive IT Staff account too", async () => {
    const res = await login(STAFF.ginaInactive, STAFF_PASSWORD);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
  });
});

describe("API-04: requiresPasswordChange gate", () => {
  it("flags a first-login user and blocks normal endpoints until the password is changed", async () => {
    const agent = request.agent(app);
    const res = await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER, "1")
      .send({ email: REQUESTERS.alice, password: REQUESTER_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.requiresPasswordChange).toBe(true);

    const categories = await agent.get("/api/categories");
    expect(categories.status).toBe(403);
    expect(categories.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const tickets = await agent.get("/api/tickets");
    expect(tickets.status).toBe(403);
    expect(tickets.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    // The auth endpoints stay reachable while gated.
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.requiresPasswordChange).toBe(true);
  });
});

describe("API-05: weak / mismatched new password", () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER, "1")
      .send({ email: REQUESTERS.alice, password: REQUESTER_PASSWORD });
  });

  function change(body: Record<string, unknown>) {
    return agent.post("/api/auth/change-password").set(CSRF_HEADER, "1").send(body);
  }

  it("rejects a too-short password with 400 field validation", async () => {
    const res = await change({
      currentPassword: REQUESTER_PASSWORD,
      newPassword: "Ab1",
      confirmPassword: "Ab1",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.newPassword).toBeTruthy();
  });

  it("rejects a password without a digit or without a letter", async () => {
    const noDigit = await change({
      currentPassword: REQUESTER_PASSWORD,
      newPassword: "onlyletters",
      confirmPassword: "onlyletters",
    });
    expect(noDigit.status).toBe(400);
    expect(noDigit.body.error.fields.newPassword).toBeTruthy();

    const noLetter = await change({
      currentPassword: REQUESTER_PASSWORD,
      newPassword: "12345678",
      confirmPassword: "12345678",
    });
    expect(noLetter.status).toBe(400);
    expect(noLetter.body.error.fields.newPassword).toBeTruthy();
  });

  it("rejects mismatched confirmation and a password equal to the current one", async () => {
    const mismatch = await change({
      currentPassword: REQUESTER_PASSWORD,
      newPassword: "NewPass123!",
      confirmPassword: "NewPass124!",
    });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.fields.confirmPassword).toBeTruthy();

    const same = await change({
      currentPassword: REQUESTER_PASSWORD,
      newPassword: REQUESTER_PASSWORD,
      confirmPassword: REQUESTER_PASSWORD,
    });
    expect(same.status).toBe(400);
    expect(same.body.error.fields.newPassword).toBeTruthy();
  });

  it("rejects a wrong current password with 401 and keeps the user gated", async () => {
    const res = await change({
      currentPassword: "WrongCurrent!1",
      newPassword: "NewPass123!",
      confirmPassword: "NewPass123!",
    });

    expect(res.status).toBe(401);
    const user = await getPrisma().user.findFirstOrThrow({
      where: { email: REQUESTERS.alice },
    });
    expect(user.requiresPasswordChange).toBe(true);
  });

  it("still requires the CSRF header", async () => {
    const res = await agent.post("/api/auth/change-password").send({
      currentPassword: REQUESTER_PASSWORD,
      newPassword: "NewPass123!",
      confirmPassword: "NewPass123!",
    });
    expect(res.status).toBe(403);
  });
});

describe("API-06: valid password change", () => {
  it("clears requiresPasswordChange and unlocks the normal application", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER, "1")
      .send({ email: REQUESTERS.alice, password: REQUESTER_PASSWORD });

    const res = await agent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER, "1")
      .send({
        currentPassword: REQUESTER_PASSWORD,
        newPassword: "NewPass123!",
        confirmPassword: "NewPass123!",
      });

    expect(res.status).toBe(200);
    expect(res.body.user.requiresPasswordChange).toBe(false);
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const categories = await agent.get("/api/categories");
    expect(categories.status).toBe(200);

    // Old password no longer works; the new one does.
    const oldLogin = await login(REQUESTERS.alice, REQUESTER_PASSWORD);
    expect(oldLogin.status).toBe(401);

    const newLogin = await login(REQUESTERS.alice, "NewPass123!");
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.requiresPasswordChange).toBe(false);
  });
});

describe("API-07: logout invalidates the session", () => {
  it("returns 200 and makes subsequent protected calls 401", async () => {
    const client = await loginClient(app, REQUESTERS.alice, REQUESTER_PASSWORD, {
      clearGate: true,
    });

    expect((await client.get("/api/tickets")).status).toBe(200);

    const logout = await client.post("/api/auth/logout");
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ ok: true });

    const after = await client.get("/api/tickets");
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe("UNAUTHORIZED");

    expect(await getPrisma().session.count()).toBe(0);
  });

  it("requires authentication to log out", async () => {
    const res = await request(app).post("/api/auth/logout").set(CSRF_HEADER, "1");
    expect(res.status).toBe(401);
  });
});

describe("API-08: current user retrieval", () => {
  it("returns the authenticated identity and role", async () => {
    const client = await loginClient(app, REQUESTERS.alice, REQUESTER_PASSWORD, {
      clearGate: true,
    });
    const res = await client.get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: REQUESTERS.alice,
      role: "REQUESTER",
      requiresPasswordChange: false,
    });
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("ignores a client-supplied requesterId header", async () => {
    const prisma = getPrisma();
    const bob = await prisma.user.findFirstOrThrow({ where: { email: REQUESTERS.bob } });

    const client = await loginClient(app, REQUESTERS.alice, REQUESTER_PASSWORD, {
      clearGate: true,
    });
    const res = await client.agent.get("/api/auth/me").set("X-Requester-Id", String(bob.id));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(REQUESTERS.alice);
  });

  it("returns 401 without a session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
