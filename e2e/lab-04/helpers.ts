import {
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

// Lab 4 — shared helpers for E2E tests across Actions Taken, Workflow, and Dashboards.
export const API_URL = process.env.API_URL ?? "http://localhost:3000";
const CSRF_HEADERS = { "X-CSRF-Protected": "1" };
const JSON_HEADERS = { ...CSRF_HEADERS, "Content-Type": "application/json" };

export const ADMIN = { email: "henri.ito@example.com", password: "DevPass!23" };
export const STAFF = { email: "dan.das@example.com", password: "DevPass!23" };
export const CAROL = { email: "carol.chen@example.com", password: "ReadyPass!23" };

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${uniqueSuffix()}@example.com`;
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /IT Service Desk/i })).toBeVisible();
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

export async function loginToShell(page: Page, account: { email: string; password: string }): Promise<void> {
  await login(page, account.email, account.password);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: /IT Service Desk/i })).toBeVisible();
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

export async function openTicketFromQueue(page: Page, ticketNumber: string): Promise<void> {
  const queueBtn = page.getByRole("button", { name: "Ticket Queue" }).first();
  if (await queueBtn.isVisible().catch(() => false)) {
    await queueBtn.click();
  }
  const openBtn = page.locator(`button[aria-label="Open ticket ${ticketNumber}"]:visible`).first();
  await openBtn.waitFor({ state: "visible", timeout: 10000 });
  await openBtn.click();
  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
}

export async function openTicketFromMyTickets(page: Page, ticketNumber: string): Promise<void> {
  const myTicketsBtn = page.getByRole("button", { name: "My Tickets" }).first();
  if (await myTicketsBtn.isVisible().catch(() => false)) {
    await myTicketsBtn.click();
  }
  const openBtn = page.locator(`button[aria-label="Open ticket ${ticketNumber}"]:visible`).first();
  await openBtn.waitFor({ state: "visible", timeout: 10000 });
  await openBtn.click();
  await expect(page.getByText(ticketNumber, { exact: true }).first()).toBeVisible();
}

export async function apiLogin(email: string, password: string): Promise<APIRequestContext> {
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

export async function ensureSeedData(): Promise<void> {
  try {
    const { getPrisma } = await import("../../server/dist/src/prisma.js");
    const prisma = getPrisma();
    await prisma.ticket.updateMany({
      where: { ticketNumber: "TK-001003" },
      data: { currentStatus: "IN_PROGRESS" },
    });
  } catch {
    // Ignore fallback if DB not accessible directly
  }
}

export async function ensureRequesterPassword(email: string, initial = "LostPass!23", ready = "ReadyPass!23"): Promise<void> {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  try {
    const check = await ctx.post("/api/auth/login", {
      headers: JSON_HEADERS,
      data: { email, password: ready },
    });
    if (check.ok()) return;

    const initLogin = await ctx.post("/api/auth/login", {
      headers: JSON_HEADERS,
      data: { email, password: initial },
    });
    if (initLogin.ok()) {
      await ctx.post("/api/auth/change-password", {
        headers: JSON_HEADERS,
        data: { currentPassword: initial, newPassword: ready, confirmPassword: ready },
      });
    }
  } finally {
    await ctx.dispose();
  }
}

