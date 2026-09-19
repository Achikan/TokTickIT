import {
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

// Lab 3 (Issue 24) — shared helpers for the session-authenticated E2E flows.
// Browser helpers drive the UI under test; API helpers create deterministic
// fixtures (fresh requesters/tickets) so every run is repeatable without
// depending on mutable seeded ticket state.

export const API_URL = process.env.API_URL ?? "http://localhost:3000";
const CSRF_HEADERS = { "X-CSRF-Protected": "1" };
const JSON_HEADERS = { ...CSRF_HEADERS, "Content-Type": "application/json" };

// Seeded accounts (server/prisma/seed.ts). Staff/Admin do not require a change.
export const ADMIN = { email: "henri.ito@example.com", password: "DevPass!23" };
export const STAFF = { email: "dan.das@example.com", password: "DevPass!23" };

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${uniqueSuffix()}@example.com`;
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /IT Service Desk/i })).toBeVisible();
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

// Logs in as a seed account (no forced password change) and waits for the shell.
export async function loginToShell(page: Page, account: { email: string; password: string }): Promise<void> {
  await login(page, account.email, account.password);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: /IT Service Desk/i })).toBeVisible();
}

// No unintended horizontal page scrolling at the current viewport (ui-spec §9).
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

// ---------------------------------------------------------------------------
// API helpers (fixtures)
// ---------------------------------------------------------------------------

async function apiLogin(email: string, password: string): Promise<APIRequestContext> {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post("/api/auth/login", {
    headers: JSON_HEADERS,
    data: { email, password },
  });
  if (!res.ok()) {
    await ctx.dispose();
    throw new Error(`API login failed (${res.status()}) for ${email}`);
  }
  return ctx;
}

export interface CreatedAdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export async function createUserViaAdminApi(input: {
  name: string;
  email: string;
  role: string;
  active: boolean;
  initialPassword: string;
}): Promise<CreatedAdminUser> {
  const ctx = await apiLogin(ADMIN.email, ADMIN.password);
  try {
    const res = await ctx.post("/api/admin/users", { headers: JSON_HEADERS, data: input });
    if (res.status() !== 201) {
      throw new Error(`create user failed (${res.status()}): ${await res.text()}`);
    }
    return ((await res.json()) as { user: CreatedAdminUser }).user;
  } finally {
    await ctx.dispose();
  }
}

// A brand-new Requester that still requires a password change on first login
// (E2E-01/E2E-02). Does not touch seeded accounts, so runs never collide.
export async function createRequesterNeedingChange(name = "E2E First Login") {
  const email = uniqueEmail("e2e.firstlogin");
  const initialPassword = "InitPass!23";
  const created = await createUserViaAdminApi({
    name,
    email,
    role: "REQUESTER",
    active: true,
    initialPassword,
  });
  return { id: created.id, name: created.name, email, initialPassword };
}

export interface ActiveRequester {
  id: number;
  name: string;
  email: string;
  password: string;
}

// A Requester whose mandatory first-login change is already complete, so tests
// can sign in through the UI and submit tickets.
export async function createActiveRequester(name = "E2E Requester"): Promise<ActiveRequester> {
  const email = uniqueEmail("e2e.requester");
  const initialPassword = "InitPass!23";
  const password = "ReadyPass!23";
  const created = await createUserViaAdminApi({
    name,
    email,
    role: "REQUESTER",
    active: true,
    initialPassword,
  });
  const ctx = await apiLogin(email, initialPassword);
  try {
    const res = await ctx.post("/api/auth/change-password", {
      headers: JSON_HEADERS,
      data: { currentPassword: initialPassword, newPassword: password, confirmPassword: password },
    });
    if (!res.ok()) throw new Error(`change password failed (${res.status()}): ${await res.text()}`);
  } finally {
    await ctx.dispose();
  }
  return { id: created.id, name: created.name, email, password };
}

export async function createTicketViaApi(
  requester: ActiveRequester,
  input: {
    summary: string;
    description: string;
    categoryName?: string;
    relatedSystemName?: string;
    requestedPriority?: string;
  }
): Promise<{ id: number; ticketNumber: string }> {
  const ctx = await apiLogin(requester.email, requester.password);
  try {
    const categories = (await (await ctx.get("/api/categories")).json()) as {
      id: number;
      name: string;
    }[];
    const category = categories.find((c) => c.name === (input.categoryName ?? "Hardware"));
    if (!category) throw new Error(`category not found: ${input.categoryName}`);

    const systems = (
      (await (await ctx.get("/api/related-systems")).json()) as {
        items: { id: number; name: string }[];
      }
    ).items;
    const relatedSystem = systems.find((s) => s.name === (input.relatedSystemName ?? "ERP System"));
    if (!relatedSystem) throw new Error(`related system not found: ${input.relatedSystemName}`);

    const res = await ctx.post("/api/tickets", {
      headers: JSON_HEADERS,
      data: {
        summary: input.summary,
        description: input.description,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requestedPriority: input.requestedPriority ?? "MEDIUM",
      },
    });
    if (res.status() !== 201) throw new Error(`create ticket failed (${res.status()}): ${await res.text()}`);
    const ticket = ((await res.json()) as { ticket: { id: number; ticketNumber: string } }).ticket;
    return { id: ticket.id, ticketNumber: ticket.ticketNumber };
  } finally {
    await ctx.dispose();
  }
}

export async function indicateResolvedViaApi(
  requester: ActiveRequester,
  ticketId: number
): Promise<void> {
  const ctx = await apiLogin(requester.email, requester.password);
  try {
    const res = await ctx.post(`/api/tickets/${ticketId}/resolved-indication`, {
      headers: CSRF_HEADERS,
    });
    if (!res.ok()) throw new Error(`indicate resolved failed (${res.status()}): ${await res.text()}`);
  } finally {
    await ctx.dispose();
  }
}
