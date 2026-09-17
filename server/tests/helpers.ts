import request from "supertest";
import type { Express } from "express";
import { getPrisma } from "../src/prisma.js";
import {
  seedCategories,
  seedRelatedSystems,
  seedUsers,
  seedLab3,
  REQUESTER_INITIAL_PASSWORD,
  STAFF_ADMIN_PASSWORD,
} from "../prisma/seed.js";

// ---------------------------------------------------------------------------
// Lab 3 (Issue 18) — shared helpers for the authenticated API test suites.
// Identity now comes from the session cookie, so tests log in (like the real
// client) instead of passing an X-Requester-Id header.
// ---------------------------------------------------------------------------

export const CSRF_HEADER = "X-CSRF-Protected";
export const REQUESTER_PASSWORD = REQUESTER_INITIAL_PASSWORD;
export const STAFF_PASSWORD = STAFF_ADMIN_PASSWORD;

export const REQUESTERS = {
  alice: "alice.anderson@example.com",
  bob: "bob.brown@example.com",
  carol: "carol.chen@example.com",
  david: "david.diaz@example.com",
  evanInactive: "evan.ellis@example.com",
} as const;

export const STAFF = {
  dan: "dan.das@example.com",
  eileen: "eileen.ford@example.com",
  frank: "frank.gao@example.com",
  ginaInactive: "gina.hale@example.com",
} as const;

export const ADMIN = { henri: "henri.ito@example.com" } as const;

export interface ApiClient {
  get(url: string): request.Test;
  post(url: string): request.Test;
  patch(url: string): request.Test;
  put(url: string): request.Test;
  delete(url: string): request.Test;
  readonly agent: ReturnType<typeof request.agent>;
}

// Mutating requests always carry the CSRF header (api-spec.md §0).
function wrap(agent: ReturnType<typeof request.agent>): ApiClient {
  return {
    agent,
    get: (url) => agent.get(url),
    post: (url) => agent.post(url).set(CSRF_HEADER, "1"),
    patch: (url) => agent.patch(url).set(CSRF_HEADER, "1"),
    put: (url) => agent.put(url).set(CSRF_HEADER, "1"),
    delete: (url) => agent.delete(url).set(CSRF_HEADER, "1"),
  };
}

export async function resetDatabase(): Promise<void> {
  const prisma = getPrisma();
  await prisma.internalNote.deleteMany();
  await prisma.publicComment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.relatedSystem.deleteMany();
  await prisma.category.deleteMany();
}

// Seeds the reference data + the Lab 3 user set (no tickets).
export async function seedReferenceAndUsers(prisma = getPrisma()): Promise<void> {
  await seedCategories(prisma);
  await seedRelatedSystems(prisma);
  await seedUsers(prisma);
}

export async function seedFullLab3(): Promise<void> {
  await seedLab3(getPrisma());
}

// Logs in and returns a cookie-persisting client. `clearGate` disables the
// mandatory first-login change for tests that are not about that gate.
export async function loginClient(
  app: Express,
  email: string,
  password: string,
  options: { clearGate?: boolean } = {}
): Promise<ApiClient> {
  if (options.clearGate) {
    await getPrisma().user.updateMany({
      where: { email: email.toLowerCase() },
      data: { requiresPasswordChange: false },
    });
  }
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").set(CSRF_HEADER, "1").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return wrap(agent);
}

export function loginRequester(app: Express, email: string = REQUESTERS.alice): Promise<ApiClient> {
  return loginClient(app, email, REQUESTER_PASSWORD, { clearGate: true });
}

export function loginStaff(app: Express, email: string = STAFF.dan): Promise<ApiClient> {
  return loginClient(app, email, STAFF_PASSWORD);
}

export function loginAdmin(app: Express, email: string = ADMIN.henri): Promise<ApiClient> {
  return loginClient(app, email, STAFF_PASSWORD);
}
