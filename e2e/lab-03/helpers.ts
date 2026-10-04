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

// Nothing may be cut off or pushed out of view inside a clipping/scrolling box
// (ui-spec §5, §9 — "no clipped labels, overlapping messages, hidden buttons").
//
// expectNoHorizontalScroll only measures the document element, so it stays green
// while a `overflow-x: auto` wrapper hides a column that does not fit — exactly
// how the queue table used to truncate "Last Updated". This walks the rendered
// tree instead and fails on any element whose content is wider than its own box
// when that box hides, clips or scrolls the overflow, and on any ellipsis
// truncation.
export async function expectNoClippedContent(page: Page, root = "body"): Promise<void> {
  const problems = await page.evaluate((selector) => {
    const found: string[] = [];
    const scope = document.querySelector(selector) ?? document.body;
    for (const el of scope.querySelectorAll<HTMLElement>("*")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      // Screen-reader-only text (Bootstrap .visually-hidden) is deliberately
      // 1x1 and clipped; it is announced, not displayed, so it is not a defect.
      if (el.closest(".visually-hidden, .visually-hidden-focusable, .sr-only") !== null) {
        const holder = el.closest(".visually-hidden, .visually-hidden-focusable, .sr-only");
        if (holder && holder !== el) continue;
        if (el.classList.contains("visually-hidden")) continue;
      }
      if (el.getAttribute("aria-hidden") === "true") continue;
      // Form controls report the width of their *value*, not of a laid-out
      // child: a long value inside a normal-width input makes scrollWidth larger
      // than clientWidth by design (the user simply scrolls inside the field).
      // Clipping an input by an ancestor is still caught, because the ancestor
      // itself is measured.
      if (["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(el.tagName)) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;

      const hides = ["hidden", "clip", "auto", "scroll"].includes(style.overflowX);
      const wider = el.scrollWidth > el.clientWidth + 2;
      if (hides && wider) {
        found.push(
          `${el.tagName.toLowerCase()}.${el.className || "(no class)"} overflow-x=${style.overflowX} ` +
            `scrollWidth=${el.scrollWidth} clientWidth=${el.clientWidth} ` +
            `text="${(el.textContent ?? "").trim().slice(0, 40)}"`
        );
      }
      if (style.textOverflow === "ellipsis" && wider) {
        found.push(
          `${el.tagName.toLowerCase()}.${el.className || "(no class)"} truncated with ellipsis ` +
            `text="${(el.textContent ?? "").trim().slice(0, 40)}"`
        );
      }
    }
    return found;
  }, root);
  expect(problems, `no clipped or sideways-scrolled content inside ${root}`).toEqual([]);
}

// Every declared table column is present, inside the viewport, and its text is
// complete (no half-rendered timestamp or truncated header).
export async function expectTableFullyVisible(page: Page): Promise<void> {
  const report = await page.evaluate(() => {
    const table = document.querySelector("table");
    if (!table) return { error: "no table rendered", headers: [] as string[] };
    const headers = [...table.querySelectorAll("thead th")].map((th) => (th.textContent ?? "").trim());
    const box = table.getBoundingClientRect();
    const cells = [...table.querySelectorAll("tbody td")];
    const cutCells = cells
      .filter((td) => td.scrollWidth > td.clientWidth + 2)
      .map((td) => (td.textContent ?? "").trim().slice(0, 30));
    return {
      headers,
      cutCells,
      tableRight: Math.round(box.right),
      viewportWidth: window.innerWidth,
      rows: cells.length / Math.max(headers.length, 1),
    };
  });
  expect(report.error).toBeUndefined();
  expect(report.cutCells, "no table cell may cut off its own content").toEqual([]);
  expect(
    report.tableRight,
    `the whole table must sit inside the viewport (${report.tableRight} vs ${report.viewportWidth})`
  ).toBeLessThanOrEqual(report.viewportWidth + 1);
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
