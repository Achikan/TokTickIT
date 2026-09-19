import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import {
  resetDatabase,
  seedFullLab3,
  loginAdmin,
  loginStaff,
  loginRequester,
  loginClient,
  REQUESTER_PASSWORD,
  ADMIN,
  STAFF,
  REQUESTERS,
  type ApiClient,
} from "../helpers.js";

// Lab 3 Issue 23 — Administrator User Management (tests.md §2, API-35..API-43).
//   API-35 list users with name/email search + optional role filter -> 200 subset
//   API-36 create user with one role + initial password -> 201, change required
//   API-37 duplicate email (case-insensitive) -> 409
//   API-38 invalid role / validation input -> 400
//   API-39 edit name/email/role/activation -> 200, persisted
//   API-40 set new initial password -> 200, next login gated
//   API-41 Administrator self-deactivation -> 409
//   API-42 deactivating the last active Administrator -> 409
//   API-43 non-Admin user management -> 403; deactivation only (no delete)

let admin: ApiClient;
let staff: ApiClient;
let requester: ApiClient;

async function userId(email: string): Promise<number> {
  const user = await getPrisma().user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (!user) throw new Error(`seeded user not found: ${email}`);
  return user.id;
}

const NEW_USER = {
  name: "Nina New",
  email: "nina.new@example.com",
  role: "IT_STAFF",
  active: true,
  initialPassword: "InitPass!23",
};

beforeEach(async () => {
  await resetDatabase();
  await seedFullLab3();
  admin = await loginAdmin(app);
  staff = await loginStaff(app);
  requester = await loginRequester(app);
});

afterAll(async () => {
  await resetDatabase();
  await seedFullLab3();
});

describe("API-35: list users with search and role filter (FR-19, AC-18)", () => {
  it("returns the user list in name order with the Administrator-only shape", async () => {
    const res = await admin.get("/api/admin/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(9);

    for (const item of res.body.items) {
      expect(item).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        active: expect.any(Boolean),
        requiresPasswordChange: expect.any(Boolean),
      });
      expect(item).not.toHaveProperty("passwordHash");
    }

    const names = res.body.items.map((u: { name: string }) => u.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("searches case-insensitively by name or email", async () => {
    const byName = await admin.get("/api/admin/users?search=ANDERSON");
    expect(byName.status).toBe(200);
    expect(byName.body.items).toHaveLength(1);
    expect(byName.body.items[0].name).toBe("Alice Anderson");
    expect(byName.body.filtersApplied).toMatchObject({ search: "ANDERSON" });

    const byEmail = await admin.get("/api/admin/users?search=henri.ito@");
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.items).toHaveLength(1);
    expect(byEmail.body.items[0].email).toBe(ADMIN.henri);
  });

  it("filters by a single optional role", async () => {
    const itStaff = await admin.get("/api/admin/users?role=IT_STAFF");
    expect(itStaff.status).toBe(200);
    expect(itStaff.body.items).toHaveLength(4);
    expect(itStaff.body.items.every((u: { role: string }) => u.role === "IT_STAFF")).toBe(true);
    expect(itStaff.body.filtersApplied).toMatchObject({ role: "IT_STAFF" });

    const requesters = await admin.get("/api/admin/users?role=REQUESTER");
    expect(requesters.status).toBe(200);
    expect(requesters.body.items).toHaveLength(5);
    expect(requesters.body.items.every((u: { role: string }) => u.role === "REQUESTER")).toBe(true);
  });

  it("combines search and role, and rejects an invalid role filter with 400", async () => {
    const combined = await admin.get("/api/admin/users?role=REQUESTER&search=alice");
    expect(combined.status).toBe(200);
    expect(combined.body.items).toHaveLength(1);

    const invalid = await admin.get("/api/admin/users?role=SUPERUSER");
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalid.body.error.fields).toHaveProperty("role");
  });
});

describe("API-36: create a user with one role and an initial password (FR-20, AC-19)", () => {
  it("creates the user with requiresPasswordChange true and no password hash", async () => {
    const res = await admin.post("/api/admin/users").send(NEW_USER);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: "Nina New",
      email: "nina.new@example.com",
      role: "IT_STAFF",
      active: true,
      requiresPasswordChange: true,
    });
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const stored = await getPrisma().user.findUnique({ where: { email: NEW_USER.email } });
    expect(stored?.passwordHash).not.toBe(NEW_USER.initialPassword);
    expect(stored?.passwordHash.length).toBeGreaterThan(20);
  });

  it("lets the new user sign in with the initial password, gated on the change", async () => {
    await admin.post("/api/admin/users").send(NEW_USER);
    const client = await loginClient(app, NEW_USER.email, NEW_USER.initialPassword);

    const gated = await client.get("/api/categories");
    expect(gated.status).toBe(403);
    expect(gated.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("can create an inactive account and rejects its login safely", async () => {
    await admin.post("/api/admin/users").send({ ...NEW_USER, active: false });
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-CSRF-Protected", "1")
      .send({ email: NEW_USER.email, password: NEW_USER.initialPassword });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
  });
});

describe("API-37: duplicate email is rejected case-insensitively (BR-14)", () => {
  it("returns 409 for an existing email regardless of case", async () => {
    await admin.post("/api/admin/users").send(NEW_USER);
    const res = await admin
      .post("/api/admin/users")
      .send({ ...NEW_USER, email: NEW_USER.email.toUpperCase() });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("returns 409 when the email matches a seeded account", async () => {
    const res = await admin
      .post("/api/admin/users")
      .send({ ...NEW_USER, email: "Alice.Anderson@Example.COM" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
  });
});

describe("API-38: invalid creation input is rejected (BR-16, BR-17)", () => {
  it("rejects an unsupported role with a field error", async () => {
    const res = await admin
      .post("/api/admin/users")
      .send({ ...NEW_USER, role: "SUPERUSER" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toHaveProperty("role");
  });

  it("rejects a weak initial password with a field error", async () => {
    const res = await admin
      .post("/api/admin/users")
      .send({ ...NEW_USER, initialPassword: "weak" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty("initialPassword");
  });

  it("rejects missing name, invalid email and non-boolean activation", async () => {
    const res = await admin.post("/api/admin/users").send({
      name: "  ",
      email: "not-an-email",
      role: "IT_STAFF",
      active: "yes",
      initialPassword: "InitPass!23",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      active: expect.any(String),
    });
  });
});

describe("API-39: edit name, email, role and activation (FR-21, AC-20)", () => {
  it("persists changes and lets the user sign in with the updated email", async () => {
    const carolId = await userId(REQUESTERS.carol);
    const res = await admin.patch(`/api/admin/users/${carolId}`).send({
      name: "Caroline Chen",
      email: "caroline.chen@example.com",
      role: "IT_STAFF",
      active: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: carolId,
      name: "Caroline Chen",
      email: "caroline.chen@example.com",
      role: "IT_STAFF",
      active: true,
    });

    const stored = await getPrisma().user.findUnique({ where: { id: carolId } });
    expect(stored?.role).toBe("IT_STAFF");
    expect(stored?.name).toBe("Caroline Chen");

    // The renamed account still authenticates with the same credentials.
    await expect(
      loginClient(app, "caroline.chen@example.com", REQUESTER_PASSWORD)
    ).resolves.toBeDefined();
  });

  it("deactivates an account without deleting it (BR-20)", async () => {
    const bobId = await userId(REQUESTERS.bob);
    const res = await admin.patch(`/api/admin/users/${bobId}`).send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.user.active).toBe(false);

    const stillThere = await getPrisma().user.findUnique({ where: { id: bobId } });
    expect(stillThere).not.toBeNull();

    const login = await request(app)
      .post("/api/auth/login")
      .set("X-CSRF-Protected", "1")
      .send({ email: REQUESTERS.bob, password: REQUESTER_PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe("ACCOUNT_INACTIVE");
  });

  it("rejects a duplicate email on edit with 409", async () => {
    const bobId = await userId(REQUESTERS.bob);
    const res = await admin
      .patch(`/api/admin/users/${bobId}`)
      .send({ email: REQUESTERS.alice });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("returns 404 for an unknown user and 400 for an invalid role", async () => {
    const missing = await admin.patch("/api/admin/users/999999").send({ name: "Nobody" });
    expect(missing.status).toBe(404);

    const bobId = await userId(REQUESTERS.bob);
    const invalid = await admin.patch(`/api/admin/users/${bobId}`).send({ role: "SUPERUSER" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.fields).toHaveProperty("role");
  });
});

describe("API-40: set a new initial password (FR-22, AC-20)", () => {
  it("marks the account for a mandatory change at the next login", async () => {
    const danId = await userId(STAFF.dan);
    const res = await admin
      .post(`/api/admin/users/${danId}/initial-password`)
      .send({ newInitialPassword: "ResetPass!23" });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: danId,
      name: "Dan Das",
      requiresPasswordChange: true,
    });

    const client = await loginClient(app, STAFF.dan, "ResetPass!23");
    const gated = await client.get("/api/staff/tickets");
    expect(gated.status).toBe(403);
    expect(gated.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("rejects a weak password with 400 and an unknown user with 404", async () => {
    const danId = await userId(STAFF.dan);
    const weak = await admin
      .post(`/api/admin/users/${danId}/initial-password`)
      .send({ newInitialPassword: "weak" });
    expect(weak.status).toBe(400);
    expect(weak.body.error.fields).toHaveProperty("newInitialPassword");

    const missing = await admin
      .post("/api/admin/users/999999/initial-password")
      .send({ newInitialPassword: "ResetPass!23" });
    expect(missing.status).toBe(404);
  });

  it("still authenticates with the old password only after a successful change", async () => {
    const danId = await userId(STAFF.dan);
    await admin
      .post(`/api/admin/users/${danId}/initial-password`)
      .send({ newInitialPassword: "ResetPass!23" });

    const oldPassword = await request(app)
      .post("/api/auth/login")
      .set("X-CSRF-Protected", "1")
      .send({ email: STAFF.dan, password: "DevPass!23" });
    expect(oldPassword.status).toBe(401);

    const newPassword = await request(app)
      .post("/api/auth/login")
      .set("X-CSRF-Protected", "1")
      .send({ email: STAFF.dan, password: "ResetPass!23" });
    expect(newPassword.status).toBe(200);
    expect(newPassword.body.user.requiresPasswordChange).toBe(true);
  });
});

describe("API-41: an Administrator cannot deactivate their own account (BR-18)", () => {
  it("returns 409 SELF_DEACTIVATION even when another Administrator exists", async () => {
    // A second active Administrator guarantees this is purely the self rule,
    // not the last-Administrator protection (API-42).
    const created = await admin.post("/api/admin/users").send({
      name: "Olivia Admin",
      email: "olivia.admin@example.com",
      role: "ADMIN",
      active: true,
      initialPassword: "InitPass!23",
    });
    expect(created.status).toBe(201);

    const henriId = await userId(ADMIN.henri);
    const res = await admin
      .patch(`/api/admin/users/${henriId}`)
      .send({ active: false });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SELF_DEACTIVATION");

    const stored = await getPrisma().user.findUnique({ where: { id: henriId } });
    expect(stored?.active).toBe(true);
  });
});

describe("API-42: the last active Administrator is protected (BR-19)", () => {
  it("rejects deactivating the only active Administrator with 409", async () => {
    const henriId = await userId(ADMIN.henri);
    const res = await admin
      .patch(`/api/admin/users/${henriId}`)
      .send({ active: false });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LAST_ADMIN");

    const stored = await getPrisma().user.findUnique({ where: { id: henriId } });
    expect(stored?.active).toBe(true);
    expect(stored?.role).toBe("ADMIN");
  });

  it("rejects changing the last active Administrator's role with 409", async () => {
    const henriId = await userId(ADMIN.henri);
    const res = await admin
      .patch(`/api/admin/users/${henriId}`)
      .send({ role: "IT_STAFF" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LAST_ADMIN");

    const stored = await getPrisma().user.findUnique({ where: { id: henriId } });
    expect(stored?.role).toBe("ADMIN");
  });

  it("allows demoting an Administrator once another active Administrator exists", async () => {
    await admin.post("/api/admin/users").send({
      name: "Olivia Admin",
      email: "olivia.admin@example.com",
      role: "ADMIN",
      active: true,
      initialPassword: "InitPass!23",
    });
    const henriId = await userId(ADMIN.henri);
    const res = await admin
      .patch(`/api/admin/users/${henriId}`)
      .send({ role: "IT_STAFF" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("IT_STAFF");
  });
});

describe("API-43: user management is Administrator-only; deactivate instead of delete (AC-22, BR-20)", () => {
  it("forbids a Requester with 403 and no data on every route", async () => {
    expect((await requester.get("/api/admin/users")).status).toBe(403);

    const create = await requester
      .post("/api/admin/users")
      .send({ ...NEW_USER, email: "nope@example.com" });
    expect(create.status).toBe(403);

    const bobId = await userId(REQUESTERS.bob);
    expect((await requester.patch(`/api/admin/users/${bobId}`).send({ name: "X" })).status).toBe(403);
    expect(
      (await requester
        .post(`/api/admin/users/${bobId}/initial-password`)
        .send({ newInitialPassword: "ResetPass!23" })).status
    ).toBe(403);
  });

  it("forbids IT Staff with 403 without data", async () => {
    const res = await staff.get("/api/admin/users");
    expect(res.status).toBe(403);
    expect(res.body.items).toBeUndefined();
  });

  it("rejects unauthenticated access with 401", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("has no delete route (deactivation is the only removal path)", async () => {
    const bobId = await userId(REQUESTERS.bob);
    const deleted = await admin.delete(`/api/admin/users/${bobId}`);
    expect(deleted.status).toBe(404);

    // The account still exists; only its activation state can change.
    const stillThere = await getPrisma().user.findUnique({ where: { id: bobId } });
    expect(stillThere).not.toBeNull();
    await admin.patch(`/api/admin/users/${bobId}`).send({ active: false });
    const deactivated = await getPrisma().user.findUnique({ where: { id: bobId } });
    expect(deactivated?.active).toBe(false);
  });
});
