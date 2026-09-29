#!/usr/bin/env node
// Issue 25 (Lab 3) — full visual screenshot set at desktop / tablet / mobile
// viewports, matched to the teacher's Lab_3_sheet Parts 5–9.
//
// UI screenshots   -> artifacts/lab-03/screenshots/{authentication,staff-queue,
//                      staff-ticket-detail,user-management}/
// API/terminal non-UI evidence -> artifacts/lab-03/report-evidence/part-{5,6,7,8}/
//
// Naming: <prefix>-<num>-<desc>-<device>.png (e.g. auth-03-invalid-email-format-desktop.png).
// Requester screenshots live under staff-ticket-detail/ with a requester- prefix.
//
// Requires the API server on :3000 and the Vite client on :5173 to be running.
// Uses the session-authenticated UI (Lab 3) end to end, including the mandatory
// first-login password change. STEPS=auth,queue,requester,detail,users,api filters
// the run (default: all).

import { chromium, request as playwrightRequest } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-03", "screenshots");
const EVIDENCE_OUT = path.join(ROOT, "artifacts", "lab-03", "api-evidence");

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const API_URL = process.env.API_URL ?? "http://localhost:3000";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 900 },
  mobile: { width: 390, height: 844 },
};

const CSR = { "X-CSRF-Protected": "1" };
const JSON_HEADERS = { ...CSR, "Content-Type": "application/json" };

const ADMIN = { email: "henri.ito@example.com", password: "DevPass!23" };
const STAFF = { email: "dan.das@example.com", password: "DevPass!23" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const unique = (prefix) => `${prefix}.${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;

let shotCount = 0;

// --- Evidence HTML helpers ---------------------------------------------------

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const htmlBase = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>evidence</title>
<style>
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #111; }
  .terminal { background: #0d1117; color: #e6edf3; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px; line-height: 1.5; padding: 18px 22px; white-space: pre; }
  h1 { font-size: 15px; margin: 0 0 10px; color: #1f6feb; }
</style></head><body>${body}</body></html>`;

const terminalHtml = (title, text) =>
  htmlBase(`<h1>${esc(title)}</h1><pre class="terminal">${esc(text)}</pre>`);

const snapshot = async (browser, html, file) => {
  const page = await browser.newPage({ viewport: { width: 1460, height: 1000 } });
  await page.setContent(html);
  const target = path.join(EVIDENCE_OUT, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: true });
  shotCount += 1;
  console.log("saved", path.relative(ROOT, target));
  await page.close();
};

// --- Screenshot helper -------------------------------------------------------

const screenshot = async (page, dir, file, full = false) => {
  const target = path.join(OUT, dir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: full });
  shotCount += 1;
  console.log("saved", path.relative(ROOT, target));
};

// --- API fixtures ------------------------------------------------------------

const asAdmin = async () => {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const login = await ctx.post("/api/auth/login", {
    headers: JSON_HEADERS,
    data: ADMIN,
  });
  if (!login.ok()) throw new Error(`admin login failed (${login.status()})`);
  return ctx;
};

const loginCtx = async (email, password) => {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const login = await ctx.post("/api/auth/login", {
    headers: JSON_HEADERS,
    data: { email, password },
  });
  if (!login.ok()) throw new Error(`login failed (${login.status()}) for ${email}`);
  return ctx;
};

// Restores the invariant "exactly one active Administrator" (Henri Ito). Any
// active Administrator left over from earlier fixture runs is deactivated so
// BR-19 (last active Administrator) can be demonstrated deterministically.
const ensureSingleActiveAdmin = async () => {
  const ctx = await asAdmin();
  try {
    const me = (await (await ctx.get("/api/auth/me")).json()).user;
    const list = await (await ctx.get("/api/admin/users")).json();
    for (const u of list.items) {
      if (u.role === "ADMIN" && u.active && u.id !== me.id) {
        const res = await ctx.patch(`/api/admin/users/${u.id}`, {
          headers: JSON_HEADERS,
          data: { active: false },
        });
        if (!res.ok()) throw new Error(`cleanup admin ${u.id} failed (${res.status()})`);
        console.log("deactivated leftover admin", u.id, u.name);
      }
    }
  } finally {
    await ctx.dispose();
  }
};

// Create a user as ADMIN. Returns { id, name, email, role, active, initialPassword }.
const createUser = async (name, role = "REQUESTER", active = true, initialPassword = "InitPass!23") => {
  const email = unique(
    role === "ADMIN" ? "shot.admin" : role === "IT_STAFF" ? "shot.staff" : "shot.requester"
  );
  const ctx = await asAdmin();
  let created;
  try {
    const res = await ctx.post("/api/admin/users", {
      headers: JSON_HEADERS,
      data: { name, email, role, active, initialPassword },
    });
    if (res.status() !== 201) throw new Error(`create user failed (${res.status()}): ${await res.text()}`);
    created = (await res.json()).user;
  } finally {
    await ctx.dispose();
  }
  return { ...created, initialPassword };
};

// An active REQUESTER whose mandatory password change is already done.
const makeActiveRequester = async (name = "Screenshot Requester") => {
  const created = await createUser(name, "REQUESTER", true);
  const ctx = await loginCtx(created.email, created.initialPassword);
  try {
    const pw = await ctx.post("/api/auth/change-password", {
      headers: JSON_HEADERS,
      data: {
        currentPassword: created.initialPassword,
        newPassword: "ReadyPass!23",
        confirmPassword: "ReadyPass!23",
      },
    });
    if (!pw.ok()) throw new Error(`change password failed (${pw.status()}) for ${created.email}`);
  } finally {
    await ctx.dispose();
  }
  return { id: created.id, email: created.email, password: "ReadyPass!23", name };
};

// A REQUESTER who still has to perform the mandatory first-login change.
const pendingRequester = async (name = "Pending Change Requester") => {
  const created = await createUser(name, "REQUESTER", true);
  return { id: created.id, email: created.email, initialPassword: created.initialPassword, name };
};

const createTicket = async (account, summary, description) => {
  const ctx = await loginCtx(account.email, account.password);
  try {
    const categories = await (await ctx.get("/api/categories")).json();
    const systems = (await (await ctx.get("/api/related-systems")).json()).items;
    const category = categories.find((c) => c.name === "Hardware");
    const system = systems.find((s) => s.name === "ERP System");
    if (!category || !system) throw new Error("reference data missing for Hardware/ERP System");
    const res = await ctx.post("/api/tickets", {
      headers: JSON_HEADERS,
      data: {
        summary,
        description,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
      },
    });
    if (res.status() !== 201) throw new Error(`create ticket failed (${res.status()}): ${await res.text()}`);
    return (await res.json()).ticket;
  } finally {
    await ctx.dispose();
  }
};

// Seed extra unassigned ticket rows so the staff queue paginates (verified >10).
const seedQueueExtras = async (account, n) => {
  const created = [];
  for (let i = 0; i < n; i += 1) {
    const t = await createTicket(
      account,
      `Capacity test ticket ${i + 1} — load row for pagination evidence`,
      "Generated by the Lab 3 screenshot script so the staff queue paginates."
    );
    created.push(t);
  }
  return created;
};

// --- UI helpers --------------------------------------------------------------

const login = async (page, email, password) => {
  await page.context().clearCookies();
  await page.goto(CLIENT_URL);
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
};

const loginToShell = async (page, account) => {
  await login(page, account.email, account.password);
  await page.getByRole("button", { name: "Logout" }).waitFor();
};

const openTicketById = async (page, ticketNumber) => {
  await page.locator("#queue-search").fill(ticketNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForTimeout(500);
  await page.locator(`[aria-label="Open ticket ${ticketNumber}"]:visible`).first().click();
  await page.getByRole("heading", { name: ticketNumber }).waitFor();
};

// Reads the queue result-count line "N tickets · Page X of Y · sorted by …".
const queueResultText = async (page) => {
  const el = page.getByText(/^[\d,]+ tickets · Page/).first();
  await el.waitFor();
  return (await el.textContent()) ?? "";
};

// ---------------------------------------------------------------------------
// Part 5 — Authentication (login + mandatory change password)
// ---------------------------------------------------------------------------
async function auth(browser) {
  const dir = "authentication";
  const page = await browser.newPage({ viewport: VIEWPORTS.desktop });

  const inactive = await createUser("Inactive Screen Account", "REQUESTER", false);
  const pending = await pendingRequester("Mandatory Change Requester");
  const requester = await makeActiveRequester("Requester Shell Account");

  // 01 — login form (valid pre-filled, ready to sign in).
  await page.goto(CLIENT_URL);
  await page.locator("#login-email").fill(ADMIN.email);
  await page.locator("#login-password").fill(ADMIN.password);
  await screenshot(page, dir, "auth-01-login-form-desktop.png");

  // 02 — required-field validation.
  await page.locator("#login-email").fill("");
  await page.locator("#login-password").fill("");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByText("Email is required.").waitFor();
  await page.getByText("Password is required.").waitFor();
  await screenshot(page, dir, "auth-02-required-validation-desktop.png");

  // 03 — invalid email format.
  await page.locator("#login-email").fill("not-an-email");
  await page.locator("#login-password").fill("Whatever!23");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByText("Enter a valid email address.").waitFor();
  await screenshot(page, dir, "auth-03-invalid-email-format-desktop.png");

  // 04 — invalid credentials stay generic and safe (AC-05).
  await login(page, STAFF.email, "WrongPass!999");
  await page.getByText("Invalid email or password.").waitFor();
  await screenshot(page, dir, "auth-04-invalid-credentials-desktop.png");

  // 05 — inactive account gets a clear, safe message.
  await login(page, inactive.email, inactive.initialPassword);
  await page.getByText("This account is not active. Contact an administrator.").waitFor();
  await screenshot(page, dir, "auth-05-inactive-account-desktop.png");

  // 06 — busy state (submitting).
  await page.route("**/api/auth/login**", async (route) => {
    await sleep(3500);
    await route.continue();
  });
  await page.context().clearCookies();
  await page.goto(CLIENT_URL);
  await page.locator("#login-email").fill(STAFF.email);
  await page.locator("#login-password").fill(STAFF.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByRole("button", { name: "Signing in…" }).waitFor();
  await screenshot(page, dir, "auth-06-submit-busy-desktop.png");
  await page.unroute("**/api/auth/login**");
  await page.getByRole("button", { name: "Logout" }).waitFor();

  // 07 — safe failure: a network error never reveals account details (AC-05).
  await page.route("**/api/auth/login**", (route) => route.abort());
  await page.context().clearCookies();
  await page.goto(CLIENT_URL);
  await page.locator("#login-email").fill(STAFF.email);
  await page.locator("#login-password").fill(STAFF.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByText("Invalid email or password.").waitFor();
  await screenshot(page, dir, "auth-07-safe-failure-desktop.png");
  await page.unroute("**/api/auth/login**");

  // 08 — mandatory first-login password change (AC-02).
  await login(page, pending.email, pending.initialPassword);
  await page.getByRole("heading", { name: "Change your password" }).waitFor();
  await screenshot(page, dir, "auth-08-mandatory-change-password-desktop.png");

  // 09 — mismatch validation.
  await page.locator("#current-password").fill(pending.initialPassword);
  await page.locator("#new-password").fill("ReadyPass!23");
  await page.locator("#confirm-password").fill("Different!23");
  await page.getByRole("button", { name: "Update Password" }).click();
  await page.getByText("Passwords do not match.").waitFor();
  await screenshot(page, dir, "auth-09-change-password-mismatch-desktop.png");

  // 10 — change completed -> requester shell with "Password updated." notice.
  await page.locator("#confirm-password").fill("ReadyPass!23");
  await page.getByRole("button", { name: "Update Password" }).click();
  await page.getByText("Password updated.").waitFor();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await screenshot(page, dir, "auth-10-password-updated-shell-desktop.png");

  // 11 — requester shell: name + role badge + Logout, requester-only nav.
  await loginToShell(page, requester);
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await screenshot(page, dir, "auth-11-requester-shell-desktop.png");

  // 12 — staff shell: Ticket Queue home with IT Staff role badge.
  await loginToShell(page, STAFF);
  await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
  await screenshot(page, dir, "auth-12-staff-shell-desktop.png");

  // 13 — administrator shell: User Management home with Administrator badge.
  await loginToShell(page, ADMIN);
  await page.getByRole("heading", { name: "User Management" }).waitFor();
  await screenshot(page, dir, "auth-13-admin-shell-desktop.png");

  // 14 — after logout (or reload) only Login is reachable; protected views blocked.
  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByRole("button", { name: "Sign In" }).waitFor();
  await screenshot(page, dir, "auth-14-post-logout-login-desktop.png");
  await page.close();

  // 15/16 — login form at tablet + mobile.
  for (const [num, suffix, size] of [
    [15, "tablet", VIEWPORTS.tablet],
    [16, "mobile", VIEWPORTS.mobile],
  ]) {
    const p = await browser.newPage({ viewport: size });
    await p.goto(CLIENT_URL);
    await p.locator("#login-email").fill(ADMIN.email);
    await p.locator("#login-password").fill(ADMIN.password);
    await screenshot(p, dir, `auth-${num}-login-form-${suffix}.png`);
    await p.close();
  }

  // 17/18 — mandatory change-password screen at tablet + mobile.
  for (const [num, suffix, size] of [
    [17, "tablet", VIEWPORTS.tablet],
    [18, "mobile", VIEWPORTS.mobile],
  ]) {
    const next = await pendingRequester("Responsive Change Requester");
    const p = await browser.newPage({ viewport: size });
    await login(p, next.email, next.initialPassword);
    await p.getByRole("heading", { name: "Change your password" }).waitFor();
    await screenshot(p, dir, `auth-${num}-change-password-${suffix}.png`);
    await p.close();
  }
}

// ---------------------------------------------------------------------------
// Part 6 — IT Staff Ticket Queue
// ---------------------------------------------------------------------------
async function queue(browser) {
  const dir = "staff-queue";
  const filler = await makeActiveRequester("Queue Load Requester");
  await seedQueueExtras(filler, 14);

  const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
  await loginToShell(page, STAFF);
  await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();

  // 01 — queue with realistic data.
  await page.getByRole("button", { name: "Reset" }).click();
  await queueResultText(page);
  await screenshot(page, dir, "queue-01-queue-full-data-desktop.png", true);

  // 02 — search by summary / ticket number.
  await page.locator("#queue-search").fill("VPN");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("cell", { name: "Cannot log into VPN from lab", exact: true }).waitFor();
  await screenshot(page, dir, "queue-02-search-desktop.png", true);

  // 03 — filters applied (status).
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("#filter-status").selectOption("RESOLVED");
  await page.getByRole("cell", { name: "Email sync timeout after upgrade", exact: true }).waitFor();
  await screenshot(page, dir, "queue-03-filters-applied-desktop.png", true);

  // 04 — sort: IT Priority high → low.
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("#filter-sort").selectOption("-itPriority");
  await page.getByRole("cell", { name: "Network slowness in lab 4", exact: true }).waitFor();
  await screenshot(page, dir, "queue-04-sort-desktop.png", true);

  // 05 — pagination: Next to page 2.
  await page.getByRole("button", { name: "Reset" }).click();
  const firstLine = await queueResultText(page);
  const pages = Number(firstLine.match(/Page \d+ of (\d+)/)?.[1] ?? 1);
  if (pages > 1) {
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByText(/Page 2 of \d+/).first().waitFor();
    await screenshot(page, dir, "queue-05-pagination-page-2-desktop.png", true);
  } else {
    console.log("queue: skipping pagination capture (single page of results)");
  }

  // 06 — owner filter: unassigned tickets.
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("#filter-owner").fill("unassigned");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const unassignedLine = await queueResultText(page);
  const unassignedTotal = Number((unassignedLine.match(/^([\d,]+) tickets/)?.[1] ?? "0").replaceAll(",", ""));
  if (unassignedTotal === 0) throw new Error("owner filter 'unassigned' returned no rows");
  await screenshot(page, dir, "queue-06-owner-unassigned-desktop.png", true);

  // 07 — loading state (delayed response).
  await page.route("**/api/staff/tickets**", async (route) => {
    await sleep(2500);
    await route.continue();
  });
  await page.locator("#queue-search").fill("Capacity");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("Loading the ticket queue…").waitFor();
  await screenshot(page, dir, "queue-07-loading-desktop.png");
  await queueResultText(page);
  await page.waitForTimeout(500);
  await page.unroute("**/api/staff/tickets**");

  // 08 — empty queue (no filters, zero tickets). Response is stubbed so the
  // distinct "no tickets at all" state can be captured without wiping the DB.
  await page.route(
    /\/api\/staff\/tickets(\?.*)?$/,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          filtersApplied: {},
          pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        }),
      })
  );
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByText("No tickets in the queue yet. New requests will appear here as they are submitted.").waitFor();
  await screenshot(page, dir, "queue-08-empty-desktop.png");
  await page.unroute(/\/api\/staff\/tickets(\?.*)?$/);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await queueResultText(page);

  // 09 — no results for a real search.
  await page.locator("#queue-search").fill("zzz-no-such-ticket");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("No tickets match your current search and filters. Try adjusting them.").waitFor();
  await screenshot(page, dir, "queue-09-no-results-desktop.png");

  // 10 — safe failure (network error).
  await page.route(/\/api\/staff\/tickets\?/, (route) => route.abort());
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("Unable to load the ticket queue. Please try again later.").waitFor();
  await screenshot(page, dir, "queue-10-failure-desktop.png");
  await page.unroute(/\/api\/staff\/tickets\?/);
  await page.close();

  // 11/12 — queue list at tablet + mobile.
  for (const [num, suffix, size] of [
    [11, "tablet", VIEWPORTS.tablet],
    [12, "mobile", VIEWPORTS.mobile],
  ]) {
    const p = await browser.newPage({ viewport: size });
    await loginToShell(p, STAFF);
    await p.getByRole("heading", { name: "Ticket Queue" }).waitFor();
    await p.getByRole("button", { name: "Reset" }).click();
    await queueResultText(p);
    await screenshot(p, dir, `queue-${num}-list-${suffix}.png`);
    await p.close();
  }
}

// ---------------------------------------------------------------------------
// Part 7 — Requester screens, then IT Staff Ticket Detail
// ---------------------------------------------------------------------------
async function requester(browser) {
  const dir = "staff-ticket-detail";
  const me = await makeActiveRequester("Requester Screens Account");
  const ticketA = await createTicket(
    me,
    "Laptop battery drains overnight",
    "Battery drops from 100% to 12% overnight. No background processes were running."
  );
  await createTicket(
    me,
    "VPN drops every 20 minutes",
    "The VPN session disconnects roughly every 20 minutes during the afternoon."
  );

  const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
  await loginToShell(page, me);
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await screenshot(page, dir, "requester-01-my-tickets-list-desktop.png", true);

  // 02 — create-ticket form (realistic values).
  await page.getByRole("button", { name: "Create a new ticket" }).click();
  await page.locator("#summary").waitFor();
  await page.locator("#summary").fill("New monitor flickers on HDMI input");
  await page.locator("#description").fill("The monitor flickers only on the HDMI input after switching source.");
  await screenshot(page, dir, "requester-02-create-ticket-form-desktop.png", true);
  await page.reload();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();

  // 03 — requester ticket detail.
  await page.locator(`[aria-label="Open ticket ${ticketA.ticketNumber}"]:visible`).first().click();
  await page.getByText(ticketA.summary).first().waitFor();
  await screenshot(page, dir, "requester-03-ticket-detail-desktop.png", true);

  // 04 — public comment posted.
  await page.locator("#comment-content").fill("The issue still happens after a full restart.");
  await page.getByRole("button", { name: "Post Comment" }).click();
  await page.getByTestId("public-comments-list").getByText("The issue still happens after a full restart.").waitFor();
  await screenshot(page, dir, "requester-04-public-comment-posted-desktop.png", true);

  // 05 — "Problem Appears Resolved" indication (FR-11).
  await page.getByRole("button", { name: "Mark as appears resolved" }).click();
  await page.getByTestId("resolved-indicated").waitFor();
  await screenshot(page, dir, "requester-05-resolved-indication-desktop.png", true);

  // 06 — a requester cannot open a ticket they do not own: the list row is
  // injected (SPA has no URLs) and the real detail fetch is rejected with a 404
  // by the server's ownership rule, which the UI surfaces as a safe page.
  const other = await makeActiveRequester("Foreign Ticket Requester");
  await page.context().clearCookies();
  await page.goto(CLIENT_URL);
  await page.locator("#login-email").fill(other.email);
  await page.locator("#login-password").fill(other.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByRole("button", { name: "Logout" }).waitFor();
  await page.route(/\/api\/tickets\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: ticketA.id,
            ticketNumber: ticketA.ticketNumber,
            summary: ticketA.summary,
            category: { name: "Hardware" },
            requestedPriority: "HIGH",
            currentStatus: "NEW",
            createdAt: ticketA.createdAt,
            updatedAt: ticketA.updatedAt,
          },
        ],
        filtersApplied: {},
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      }),
    })
  );
  await page.goto(CLIENT_URL);
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await page.locator(`[aria-label="Open ticket ${ticketA.ticketNumber}"]:visible`).first().click();
  await page.getByText("Unable to load the ticket details. Please try again later.").waitFor();
  await screenshot(page, dir, "requester-06-foreign-ticket-safe-failure-desktop.png", true);
  await page.unroute(/\/api\/tickets\?/);

  // 07 — requester shell shows no Staff / Administration navigation.
  await page.reload();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await screenshot(page, dir, "requester-07-requester-nav-role-restriction-desktop.png", true);
  await page.close();

  // 08/09 — requester list at tablet + mobile.
  for (const [num, suffix, size] of [
    [8, "tablet", VIEWPORTS.tablet],
    [9, "mobile", VIEWPORTS.mobile],
  ]) {
    const p = await browser.newPage({ viewport: size });
    await loginToShell(p, me);
    await p.getByRole("heading", { name: "My Tickets" }).waitFor();
    await screenshot(p, dir, `requester-0${num}-my-tickets-list-${suffix}.png`);
    await p.close();
  }

  // 10/11 — requester ticket detail at tablet + mobile.
  for (const [num, suffix, size] of [
    [10, "tablet", VIEWPORTS.tablet],
    [11, "mobile", VIEWPORTS.mobile],
  ]) {
    const p = await browser.newPage({ viewport: size });
    await loginToShell(p, me);
    await p.locator(`[aria-label="Open ticket ${ticketA.ticketNumber}"]:visible`).first().click();
    await p.getByText(ticketA.summary).first().waitFor();
    await screenshot(p, dir, `requester-${num}-ticket-detail-${suffix}.png`);
    await p.close();
  }
}

async function detail(browser) {
  const dir = "staff-ticket-detail";
  const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
  await loginToShell(page, STAFF);

  // 01 — overview of the seeded ticket (Public Comment + Internal Note present).
  await openTicketById(page, "TK-001001");
  await screenshot(page, dir, "detail-01-overview-desktop.png", true);

  // Fixture ticket mutated through the operational flow.
  const opsReq = await makeActiveRequester("Detail Operations Requester");
  const opsTicket = await createTicket(
    opsReq,
    "Printer intermittently jams after firmware update",
    "After the quarterly firmware update the shared printer jams roughly every fifth job; a restart clears it."
  );
  await page.getByRole("button", { name: "Back to Queue" }).click();
  await openTicketById(page, opsTicket.ticketNumber);

  // 02 — claim (FR-14).
  await page.getByRole("button", { name: "Claim ticket" }).click();
  await page.getByRole("button", { name: "You own this ticket" }).waitFor();
  await screenshot(page, dir, "detail-02-claim-desktop.png", true);

  // 03 — reassign to another eligible owner.
  await page.locator("#assign-owner").selectOption({ label: "Frank Gao" });
  await page.getByRole("button", { name: "Assign owner" }).click();
  await page.getByTestId("ticket-owner").getByText("Frank Gao").waitFor();
  await screenshot(page, dir, "detail-03-reassign-desktop.png", true);

  // 04 — IT Priority update (FR-15).
  await page.locator("#it-priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Save IT Priority" }).click();
  await page.waitForTimeout(400);
  await screenshot(page, dir, "detail-04-it-priority-desktop.png", true);

  // 05 — permitted status transitions NEW → OPEN → IN_PROGRESS (FR-16).
  await page.locator("#status-transition").selectOption("OPEN");
  await page.getByRole("button", { name: "Update Status" }).click();
  await page.locator("span.badge.badge-status-open").waitFor();
  await page.locator("#status-transition").selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Update Status" }).click();
  await page.locator("span.badge.badge-status-in-progress").waitFor();
  await screenshot(page, dir, "detail-05-status-in-progress-desktop.png", true);

  // 06 — the UI surfaces a server-rejected transition. The status select only
  // offers permitted targets, so the rejection is simulated at the network
  // layer; the real server 409 is evidenced separately in the API step.
  await page.route(/\/api\/staff\/tickets\/\d+\/status$/, (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "INVALID_TRANSITION",
          message: "A Ticket cannot move from IN_PROGRESS to RESOLVED.",
        },
      }),
    })
  );
  await page.locator("#status-transition").selectOption("RESOLVED");
  await page.getByRole("button", { name: "Update Status" }).click();
  await page.getByText("A Ticket cannot move from IN_PROGRESS to RESOLVED.").waitFor();
  await screenshot(page, dir, "detail-06-status-transition-rejected-desktop.png", true);
  await page.unroute(/\/api\/staff\/tickets\/\d+\/status$/);

  // 07 — Public Comment posted; 08 — comment required.
  await page.locator("#staff-comment-content").fill("Checked with the vendor — a replacement pickup roller is being scheduled.");
  await page.getByRole("button", { name: "Post Comment" }).click();
  await page.getByTestId("staff-public-comments-list").getByText(/replacement pickup roller/).waitFor();
  await screenshot(page, dir, "detail-07-public-comment-posted-desktop.png", true);
  await page.locator("#staff-comment-content").fill("");
  await page.getByRole("button", { name: "Post Comment" }).click();
  await page.getByText("Comment is required.").waitFor();
  await screenshot(page, dir, "detail-08-public-comment-required-desktop.png", true);

  // 09 — Internal Note posted; 10 — note required.
  await page.locator("#staff-note-content").fill("Ticket escalated to L3 for the printer firmware bundle review.");
  await page.getByRole("button", { name: "Save Note" }).click();
  await page.getByTestId("staff-internal-notes-list").getByText(/escalated to L3/).waitFor();
  await screenshot(page, dir, "detail-09-internal-note-posted-desktop.png", true);
  await page.locator("#staff-note-content").fill("");
  await page.getByRole("button", { name: "Save Note" }).click();
  await page.getByText("Note is required.").waitFor();
  await screenshot(page, dir, "detail-10-internal-note-required-desktop.png", true);

  // 11/12 — Requester resolution indication + Attachment continuity on one ticket.
  const resolver = await makeActiveRequester("Resolver Requester");
  const resolvedTicket = await createTicket(
    resolver,
    "Login prompts keep failing for two colleagues",
    "Two colleagues in the same office report intermittent session timeouts after login."
  );
  const rctx = await loginCtx(resolver.email, resolver.password);
  const ind = await rctx.post(`/api/tickets/${resolvedTicket.id}/resolved-indication`, {
    headers: CSR,
  });
  if (!ind.ok()) throw new Error(`resolved-indication failed (${ind.status()}): ${await ind.text()}`);
  const up = await rctx.post(`/api/tickets/${resolvedTicket.id}/attachments`, {
    headers: CSR,
    multipart: {
      file: {
        name: "evidence.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "base64"
        ),
      },
    },
  });
  if (!up.ok()) throw new Error(`attachment upload failed (${up.status()}): ${await up.text()}`);
  await rctx.dispose();

  await page.getByRole("button", { name: "Back to Queue" }).click();
  await openTicketById(page, resolvedTicket.ticketNumber);
  await page.getByTestId("requester-indication").waitFor();
  await page.getByRole("heading", { name: "Attachments" }).scrollIntoViewIfNeeded();
  await page.getByText("evidence.png").waitFor();
  await screenshot(page, dir, "detail-12-requester-resolved-indication-desktop.png", true);
  await page.getByRole("heading", { name: "Attachments" }).scrollIntoViewIfNeeded();
  await screenshot(page, dir, "detail-11-attachments-desktop.png", true);

  // 13 — safe failure on the detail load (network error).
  const safeReq = await makeActiveRequester("Safe Failure Requester");
  const safeTicket = await createTicket(
    safeReq,
    "New laptop cluster connection issue",
    "The machine cannot reach the storage cluster after the network profile update."
  );
  await page.getByRole("button", { name: "Back to Queue" }).click();
  await page.route(/\/api\/staff\/tickets\/\d+(\?|$)/, (route) => route.abort());
  await openTicketById(page, safeTicket.ticketNumber);
  await page.getByText("Unable to load the ticket. Please try again later.").waitFor();
  await screenshot(page, dir, "detail-13-safe-failure-desktop.png", true);
  await page.unroute(/\/api\/staff\/tickets\/\d+(\?|$)/);
  await page.close();

  // 14/15 — staff ticket detail at tablet + mobile (use the fully-populated ops ticket).
  for (const [num, suffix, size] of [
    [14, "tablet", VIEWPORTS.tablet],
    [15, "mobile", VIEWPORTS.mobile],
  ]) {
    const p = await browser.newPage({ viewport: size });
    await loginToShell(p, STAFF);
    await openTicketById(p, opsTicket.ticketNumber);
    await screenshot(p, dir, `detail-${num}-detail-${suffix}.png`);
    await p.close();
  }
}

// ---------------------------------------------------------------------------
// Part 8 — Administrator User Management
// ---------------------------------------------------------------------------
async function users(browser) {
  const dir = "user-management";
  const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
  await loginToShell(page, ADMIN);
  await page.getByRole("heading", { name: "User Management" }).waitFor();

  // 01 — user list.
  await screenshot(page, dir, "users-01-list-desktop.png", true);

  // 02 — search by name.
  await page.locator("#user-search").fill("Frank");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("cell", { name: "Frank Gao", exact: true }).waitFor();
  await screenshot(page, dir, "users-02-name-search-desktop.png", true);

  // 03 — optional role filter shows "(filtered)" on the count line.
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("#user-role-filter").selectOption("IT_STAFF");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText(/\(filtered\)/).first().waitFor();
  await screenshot(page, dir, "users-03-role-filter-desktop.png", true);

  // 04 — create form with initial password (AC-19).
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "Create user" }).click();
  await page.locator("#user-initial-password").waitFor();
  await screenshot(page, dir, "users-04-create-form-desktop.png", true);

  // 05 — server validation on an empty submit.
  await page.locator('section[aria-label="Create user"]').getByRole("button", { name: "Create user" }).click();
  await page.getByText("Name is required.", { exact: true }).first().waitFor();
  await screenshot(page, dir, "users-05-create-required-validation-desktop.png", true);

  // 06 — duplicate email rejected.
  await page.locator("#user-name").fill("Duplicate User");
  await page.locator("#user-email").fill(STAFF.email);
  await page.locator("#user-initial-password").fill("InitPass!23");
  await page.locator('section[aria-label="Create user"]').getByRole("button", { name: "Create user" }).click();
  await page.getByText("A user with this email already exists.").waitFor();
  await screenshot(page, dir, "users-06-create-duplicate-email-desktop.png", true);

  // 07 — create success notice.
  const created = { name: "Evidence Editor", email: unique("shot.editor"), initialPassword: "InitPass!23" };
  await page.locator("#user-name").fill(created.name);
  await page.locator("#user-email").fill(created.email);
  await page.locator("#user-initial-password").fill(created.initialPassword);
  await page.locator('section[aria-label="Create user"]').getByRole("button", { name: "Create user" }).click();
  await page.getByText(new RegExp(`User "${created.name}" created.*next login`)).waitFor();
  await screenshot(page, dir, "users-07-create-success-desktop.png", true);

  // 08 — edit form (rename via search; panel also has the Set-new-initial-password block).
  await page.locator("#user-search").fill(created.name);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForTimeout(400);
  await page.locator(`[aria-label="Edit user ${created.name}"]`).first().click();
  await page.locator("#user-new-initial-password").waitFor();
  await screenshot(page, dir, "users-08-edit-form-desktop.png", true);

  // 09 — edit saved (role changed to IT Staff) with updated notice.
  await page.locator("#user-name").fill(`${created.name} (edited)`);
  await page.locator("#user-role").selectOption("IT_STAFF");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("status").getByText(/updated\./).waitFor();
  await screenshot(page, dir, "users-09-edit-save-success-desktop.png", true);

  // 10 — Set new initial password form; 11 — invalid value rejected.
  await page.locator(`[aria-label="Edit user ${created.name} (edited)"]`).first().click();
  await page.locator("#user-new-initial-password").waitFor();
  await screenshot(page, dir, "users-10-set-new-initial-password-desktop.png", true);
  await page.locator("#user-new-initial-password").fill("abc");
  await page.getByRole("button", { name: "Set new initial password" }).click();
  await page.getByText("Password must be at least 8 characters.", { exact: true }).waitFor();
  await screenshot(page, dir, "users-11-set-initial-password-invalid-desktop.png", true);
  await page.getByRole("button", { name: "Cancel" }).click();

  // 12 — the created user must change their password at next login (AC-20).
  const changePage = await browser.newPage({ viewport: VIEWPORTS.desktop });
  await login(changePage, created.email, created.initialPassword);
  await changePage.getByRole("heading", { name: "Change your password" }).waitFor();
  await screenshot(changePage, dir, "users-12-required-change-next-login-desktop.png");
  await changePage.close();

  // 13 — list no-results.
  await page.locator("#user-search").fill("zzz-no-such-user");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("No users match your search and filters. Try adjusting them.").waitFor();
  await screenshot(page, dir, "users-13-list-no-results-desktop.png", true);

  // 14 — safe failure on the user list load.
  await page.route(/\/api\/admin\/users(\?|$)/, (route) => route.abort());
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("Unable to load users. Please try again later.").waitFor();
  await screenshot(page, dir, "users-14-safe-failure-desktop.png", true);
  await page.unroute(/\/api\/admin\/users(\?|$)/);
  await page.reload();
  await page.getByRole("heading", { name: "User Management" }).waitFor();
  await ensureSingleActiveAdmin();

  // 15 — last active Administrator cannot be deactivated (BR-19).
  await page.locator("#user-search").fill("Henri Ito");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator('[aria-label^="Edit user Henri Ito"]').first().click();
  await page.locator("#user-active").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText(/last active Administrator/).waitFor();
  await screenshot(page, dir, "users-15-last-admin-blocked-desktop.png", true);
  await page.getByRole("button", { name: "Cancel" }).click();

  // 16 — self-deactivation is prevented even when another active Administrator exists.
  const secondAdmin = await createUser("Second Active Administrator", "ADMIN", true);
  await page.locator("#user-search").fill("Henri Ito");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator('[aria-label^="Edit user Henri Ito"]').first().click();
  await page.locator("#user-active").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("You cannot deactivate your own account.").waitFor();
  await screenshot(page, dir, "users-16-self-deactivation-blocked-desktop.png", true);
  await page.getByRole("button", { name: "Cancel" }).click();
  // Restore the invariant: only one active Administrator (Henri Ito) remains.
  const adminCtx = await asAdmin();
  try {
    const de = await adminCtx.patch(`/api/admin/users/${secondAdmin.id}`, {
      headers: JSON_HEADERS,
      data: { active: false },
    });
    if (!de.ok()) throw new Error(`cleanup of second admin failed (${de.status()})`);
  } finally {
    await adminCtx.dispose();
  }

  // 17 — an IT Staff shell shows no User Management navigation (role restriction).
  await page.getByRole("button", { name: "Logout" }).click();
  await loginToShell(page, STAFF);
  await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
  await screenshot(page, dir, "users-17-staff-no-management-nav-desktop.png", true);
  await page.close();

  // 18/19 — user management list at tablet + mobile.
  for (const [num, suffix, size] of [
    [18, "tablet", VIEWPORTS.tablet],
    [19, "mobile", VIEWPORTS.mobile],
  ]) {
    const p = await browser.newPage({ viewport: size });
    await loginToShell(p, ADMIN);
    await p.getByRole("heading", { name: "User Management" }).waitFor();
    await screenshot(p, dir, `users-${num}-list-${suffix}.png`);
    await p.close();
  }
}

// ---------------------------------------------------------------------------
// Direct API authorization evidence (non-UI)
// ---------------------------------------------------------------------------
async function partApi(browser) {
  // 5.x — protected endpoint rejects a logged-out client (401).
  const anon = await playwrightRequest.newContext({ baseURL: API_URL });
  const denied = await anon.get("/api/tickets");
  const deniedBody = await denied.json();
  await snapshot(
    browser,
    terminalHtml(
      "Part 5 — GET /api/tickets after logout (no session cookie) → 401",
      `HTTP ${denied.status()}\n${JSON.stringify(deniedBody, null, 2)}`
    ),
    "part-5-auth/05-api-401-after-logout.png"
  );
  await anon.dispose();

  const requester = await makeActiveRequester("API Evidence Requester");
  const myTicket = await createTicket(requester, "API evidence ticket", "Used only for direct API authorization evidence.");

  // 6.x — the staff queue endpoint is 403 for a Requester.
  const reqCtx = await loginCtx(requester.email, requester.password);
  const queueDenied = await reqCtx.get("/api/staff/tickets?page=1&pageSize=2");
  const queueDeniedBody = await queueDenied.json();
  await snapshot(
    browser,
    terminalHtml(
      `Part 6 — GET /api/staff/tickets as REQUESTER (${requester.email}) → ${queueDenied.status()} FORBIDDEN`,
      `HTTP ${queueDenied.status()}\n${JSON.stringify(queueDeniedBody, null, 2)}`
    ),
    "part-6-queue/api-403-requester-queue.png"
  );

  // 7.x — Internal Notes are IT-Staff-only: 403 for the ticket's own Requester.
  const notesDenied = await reqCtx.get(`/api/tickets/${myTicket.id}/notes`);
  const notesDeniedBody = await notesDenied.json();
  await snapshot(
    browser,
    terminalHtml(
      `Part 7 — GET /api/tickets/${myTicket.id}/notes as the ticket's own REQUESTER → ${notesDenied.status()} FORBIDDEN`,
      `HTTP ${notesDenied.status()}\n${JSON.stringify(notesDeniedBody, null, 2)}`
    ),
    "part-7-detail/api-403-requester-notes.png"
  );

  // 7.x — the ownership rule rejects a Requester fetching someone else's ticket (404).
  const foreign = await makeActiveRequester("API Foreign Ticket Requester");
  const foreignTicket = await createTicket(foreign, "Foreign ticket", "Owned by another Requester.");
  const foreignDenied = await reqCtx.get(`/api/tickets/${foreignTicket.id}`);
  const foreignDeniedBody = await foreignDenied.json();
  await snapshot(
    browser,
    terminalHtml(
      `Part 7 — GET /api/tickets/${foreignTicket.id} as a different REQUESTER → ${foreignDenied.status()} NOT_FOUND`,
      `HTTP ${foreignDenied.status()}\n${JSON.stringify(foreignDeniedBody, null, 2)}`
    ),
    "part-7-detail/api-404-foreign-ticket.png"
  );

  // 7.x — a forbidden status transition returns a safe 409 from the server.
  const staffCtx = await loginCtx(STAFF.email, STAFF.password);
  const me = await staffCtx.get("/api/auth/me").then((r) => r.json());
  const claim = await staffCtx.patch(`/api/staff/tickets/${myTicket.id}/owner`, {
    headers: JSON_HEADERS,
    data: { ownerId: me.user.id },
  });
  if (!claim.ok()) throw new Error(`claim failed (${claim.status()}): ${await claim.text()}`);
  const transition = await staffCtx.patch(`/api/staff/tickets/${myTicket.id}/status`, {
    headers: JSON_HEADERS,
    data: { status: "RESOLVED" },
  });
  const transitionBody = await transition.json();
  await snapshot(
    browser,
    terminalHtml(
      `Part 7 — PATCH /api/staff/tickets/${myTicket.id}/status to RESOLVED from NEW → ${transition.status()} ${transitionBody?.error?.code ?? "ERROR"}`,
      `HTTP ${transition.status()}\n${JSON.stringify(transitionBody, null, 2)}`
    ),
    "part-7-detail/api-409-forbidden-transition.png"
  );
  await staffCtx.dispose();

  // 8.x — Administrator-only user management is 403 for IT Staff.
  const staffCtx2 = await loginCtx(STAFF.email, STAFF.password);
  const adminDenied = await staffCtx2.get("/api/admin/users");
  const adminDeniedBody = await adminDenied.json();
  await snapshot(
    browser,
    terminalHtml(
      `Part 8 — GET /api/admin/users as IT_STAFF (${STAFF.email}) → ${adminDenied.status()} FORBIDDEN`,
      `HTTP ${adminDenied.status()}\n${JSON.stringify(adminDeniedBody, null, 2)}`
    ),
    "part-8-users/08-users-api-403-for-staff.png"
  );
  await staffCtx2.dispose();

  await reqCtx.dispose();
}

// --- Run ----------------------------------------------------------------------

const browser = await chromium.launch();
const wanted = (process.env.STEPS || "all")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const steps = [
  ["auth", auth],
  ["queue", queue],
  ["requester", requester],
  ["detail", detail],
  ["users", users],
  ["api", partApi],
];
const failures = [];
for (const [name, fn] of steps) {
  if (!wanted.includes(name) && !wanted.includes("all")) continue;
  try {
    console.log(`\n=== ${name} ===`);
    await fn(browser);
  } catch (err) {
    failures.push([name, err]);
    console.error(`FAILED ${name}:`, err.message);
  }
}
await browser.close();
console.log(`\nDone — ${shotCount} screenshots written under artifacts/lab-03`);
if (failures.length > 0) {
  console.log("\nFailed steps:");
  for (const [name, err] of failures) console.log(` - ${name}: ${err.message}`);
  process.exitCode = 1;
}