#!/usr/bin/env node
// Issue 25 (Lab 3) — visual screenshots at desktop / tablet / mobile viewports
// into artifacts/lab-03/screenshots/{authentication,staff-queue,
// staff-ticket-detail,user-management}/.
//
// Requires the API server on :3000 and the Vite client on :5173 to be running.
// Uses the session-authenticated UI (Lab 3) end to end, including the
// mandatory first-login password change.

import { chromium, request as playwrightRequest } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-03", "screenshots");

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

const unique = (prefix) => `${prefix}.${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;

let shotCount = 0;

const screenshot = async (page, dir, file) => {
  const target = path.join(OUT, dir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: false });
  shotCount += 1;
  console.log("saved", path.relative(ROOT, target));
};

const asAdmin = async () => {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const login = await ctx.post("/api/auth/login", {
    headers: JSON_HEADERS,
    data: { email: ADMIN.email, password: ADMIN.password },
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
  if (!login.ok()) {
    await ctx.dispose();
    throw new Error(`login failed (${login.status()}) for ${email}`);
  }
  return ctx;
};

// --- Fixtures --------------------------------------------------------------

// A Requester whose mandatory first-login password change is already complete,
// so the browser and API can sign in freely (used for the ticket fixture).
const createRequesterActive = async () => {
  const email = unique("shot.requester");
  const initialPassword = "InitPass!23";
  const ctx = await asAdmin();
  try {
    const res = await ctx.post("/api/admin/users", {
      headers: JSON_HEADERS,
      data: { name: "Screenshot Requester", email, role: "REQUESTER", active: true, initialPassword },
    });
    if (res.status() !== 201) throw new Error(`create user failed (${res.status()}): ${await res.text()}`);
  } finally {
    await ctx.dispose();
  }
  const ctx2 = await loginCtx(email, initialPassword);
  try {
    const pw = await ctx2.post("/api/auth/change-password", {
      headers: JSON_HEADERS,
      data: { currentPassword: initialPassword, newPassword: "ReadyPass!23", confirmPassword: "ReadyPass!23" },
    });
    if (!pw.ok()) throw new Error(`change password failed (${pw.status()}): ${await pw.text()}`);
  } finally {
    await ctx2.dispose();
  }
  return { email, password: "ReadyPass!23" };
};

// A Requester whose first-login password change is still pending, so the
// browser can demonstrate the Change Password screen and, after completing it,
// the authenticated shell.
const createRequesterPending = async () => {
  const email = unique("shot.pending");
  const initialPassword = "InitPass!23";
  const ctx = await asAdmin();
  try {
    const res = await ctx.post("/api/admin/users", {
      headers: JSON_HEADERS,
      data: { name: "Pending Change Requester", email, role: "REQUESTER", active: true, initialPassword },
    });
    if (res.status() !== 201) throw new Error(`create user failed (${res.status()}): ${await res.text()}`);
  } finally {
    await ctx.dispose();
  }
  return { email, initialPassword };
};

const createTicket = async (requester) => {
  const ctx = await loginCtx(requester.email, requester.password);
  try {
    const categories = (await (await ctx.get("/api/categories")).json());
    const systems = (await (await ctx.get("/api/related-systems")).json()).items;
    const category = categories.find((c) => c.name === "Hardware");
    const system = systems.find((s) => s.name === "ERP System");
    if (!category || !system) throw new Error("reference data missing for Hardware/ERP System");
    const res = await ctx.post("/api/tickets", {
      headers: JSON_HEADERS,
      data: {
        summary: "Screenshot fixture — battery drains overnight",
        description:
          "Laptop battery drops from 100% to 12% overnight. Claims, IT Priority, status, comments and notes are shown here.",
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
      },
    });
    if (res.status() !== 201) throw new Error(`create ticket failed (${res.status()}): ${await res.text()}`);
    const ticket = (await res.json()).ticket;
    return { id: ticket.id, ticketNumber: ticket.ticketNumber };
  } finally {
    await ctx.dispose();
  }
};

// --- Browser flows ----------------------------------------------------------

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

const openFirstFromQueue = async (page) => {
  await page.locator("#queue-search").fill("1001");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
  const btn = page.locator('[aria-label^="Open ticket "]:visible').first();
  await btn.click();
  await page.getByRole("heading", { name: /TK-/ }).waitFor();
};

// --- Run ---------------------------------------------------------------------

const browser = await chromium.launch();

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  const page = await browser.newPage({ viewport: size });
  const pending = await createRequesterPending();
  const requester = await createRequesterActive();
  const { ticketNumber } = await createTicket(requester);

  // 1) authentication — login form.
  await page.goto(CLIENT_URL);
  await page.getByRole("button", { name: "Sign In" }).waitFor();
  await screenshot(page, "authentication", `login-${vp}.png`);

  // 2) authentication — mandatory first-login Change Password screen.
  await login(page, pending.email, pending.initialPassword);
  await page.getByRole("heading", { name: "Change your password" }).waitFor();
  await screenshot(page, "authentication", `change-password-${vp}.png`);

  await page.locator("#current-password").fill(pending.initialPassword);
  await page.locator("#new-password").fill("ReadyPass!23");
  await page.locator("#confirm-password").fill("ReadyPass!23");
  await page.getByRole("button", { name: "Update Password" }).click();
  await page.getByText("Password updated.").waitFor();

  // 3) authentication — authenticated shell with logout + role badge.
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await screenshot(page, "authentication", `shell-${vp}.png`);

  // 4) staff-queue — queue with realistic data.
  await loginToShell(page, STAFF);
  await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
  await screenshot(page, "staff-queue", `queue-${vp}.png`);

  // 5) staff-ticket-detail — claim, IT Priority, status, comment, note.
  await page.locator("#queue-search").fill("1001");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const openBtn = page.locator('[aria-label^="Open ticket "]:visible').first();
  await openBtn.click();
  await page.getByRole("heading", { name: /TK-/ }).waitFor();
  await screenshot(page, "staff-ticket-detail", `seeded-details-${vp}.png`);

  await page.getByRole("button", { name: "Back to Queue" }).click();
  await page.locator("#queue-search").fill(ticketNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.locator(`[aria-label="Open ticket ${ticketNumber}"]:visible`).first().click();
  await page.getByRole("heading", { name: ticketNumber }).waitFor();

  await page.getByRole("button", { name: "Claim ticket" }).click();
  await page.getByRole("button", { name: /You own this ticket/ }).waitFor();
  await page.locator("#it-priority").selectOption("URGENT");
  await page.getByRole("button", { name: "Save IT Priority" }).click();
  await page.locator("#status-transition").selectOption("OPEN");
  await page.getByRole("button", { name: "Update Status" }).click();
  await page.locator("#staff-comment-content").fill("Screenshot run — public update from IT Staff.");
  await page.getByRole("button", { name: "Post Comment" }).click();
  await page.locator("#staff-note-content").fill("Screenshot run — internal diagnostics note.");
  await page.getByRole("button", { name: "Save Note" }).click();
  await page.getByTestId("staff-internal-notes-list").getByText(/Screenshot run — internal/).waitFor();
  await screenshot(page, "staff-ticket-detail", `operations-${vp}.png`);

  // 6) user-management — list, create, edit + set initial password.
  await loginToShell(page, ADMIN);
  await page.getByRole("heading", { name: "User Management" }).waitFor();
  await screenshot(page, "user-management", `list-${vp}.png`);

  await page.getByRole("button", { name: "Create user" }).click();
  await page.locator("#user-initial-password").waitFor();
  await screenshot(page, "user-management", `create-${vp}.png`);
  await page.getByRole("button", { name: "Cancel" }).click();

  const editBtn = page.locator('[aria-label^="Edit user "]:visible').first();
  await editBtn.click();
  await page.locator("#user-new-initial-password").waitFor();
  await screenshot(page, "user-management", `edit-set-initial-password-${vp}.png`);

  await page.close();
}

await browser.close();
console.log(`\nDone — ${shotCount} screenshots in ${path.relative(ROOT, OUT)}`);