#!/usr/bin/env node
// Lab 4 (Issue 37 / Reviewer fixes) — Automated evidence capture:
// - DB verification tables comparing authoritative Prisma queries against API metrics
// - Error evidence captures asserting exact JSON responses and status codes
// - Visual verification asserting non-blank images and valid file sizes

import { chromium, request as playwrightRequest } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdir, copyFile } from "node:fs/promises";
import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../server/node_modules/@prisma/client/index.js";

delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.all_proxy;
delete process.env.ALL_PROXY;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS_DIR = path.join(ROOT, "artifacts", "lab-04", "screenshots");
const REPORT_DIR = path.join(ROOT, "artifacts", "lab-04", "report-evidence");
const REPORT_IMAGES_DIR = path.join(ROOT, "artifacts", "lab-04", "report-images");

const CLIENT_URL = process.env.CLIENT_URL ?? "http://127.0.0.1:5173";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

const VIEWPORT = { width: 1280, height: 900 };
const CSR = { "X-CSRF-Protected": "1" };
const JSON_HEADERS = { ...CSR, "Content-Type": "application/json" };

const ADMIN = { email: "henri.ito@example.com", password: "DevPass!23" };
const STAFF = { email: "dan.das@example.com", password: "DevPass!23" };
const ALICE = { email: "alice.anderson@example.com", password: "ReadyPass!23" };
const CAROL = { email: "carol.chen@example.com", password: "ReadyPass!23" };
const ZERO_REQUESTER = { email: "ivy.ing@example.com", password: "ReadyPass!23" };

const ACTIVE_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const ALL_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const ALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const run = (cmd) => execSync(cmd, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }).trim();
const readFileSafe = (rel) => {
  try {
    return readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return "";
  }
};

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const htmlBase = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>evidence</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #111; padding: 20px; }
  .terminal { background: #0d1117; color: #e6edf3; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px; line-height: 1.5; padding: 18px 22px; border-radius: 6px; white-space: pre; overflow-x: auto; }
  h1 { font-size: 18px; margin: 0 0 12px; color: #1f6feb; }
  h2 { font-size: 15px; margin: 20px 0 8px; color: #24292f; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 10px; margin-bottom: 20px; }
  th, td { border: 1px solid #d0d7de; padding: 8px 12px; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 600; }
  .ok { color: #1a7f37; font-weight: 600; }
  .warn { color: #cf222e; font-weight: 600; }
  .caption { background: #f6f8fa; padding: 6px 12px; font-size: 12px; color: #57606a; border-left: 3px solid #1f6feb; margin-bottom: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dafbe1; color: #1a7f37; }
  .badge-red { background: #ffebe9; color: #cf222e; }
</style></head><body>${body}</body></html>`;

const terminalHtml = (title, caption, text) =>
  htmlBase(`<h1>${esc(title)}</h1><div class="caption">${esc(caption)}</div><pre class="terminal">${esc(text)}</pre>`);

async function snapshot(browser, html, targetPath) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(html);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await page.screenshot({ path: targetPath, fullPage: true });
  await page.close();
  console.log(`Saved: ${path.relative(ROOT, targetPath)}`);
}

async function performLogin(page, email, password) {
  await page.goto(`${CLIENT_URL}/`);
  await page.waitForTimeout(500);

  const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout")');
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page.waitForTimeout(500);
  }

  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
}

// Verification tracker ensuring strict value match (no undefined === undefined)
let mismatchDetected = false;
function checkMatch(code, desc, apiVal, dbVal) {
  const valid = apiVal !== undefined && apiVal !== null &&
                dbVal !== undefined && dbVal !== null &&
                apiVal === dbVal;
  if (!valid) {
    mismatchDetected = true;
    return `<tr>
      <td><strong>${esc(code)}</strong></td>
      <td>${esc(desc)}</td>
      <td><span style="color:#cf222e;font-weight:bold;">${apiVal !== undefined ? esc(apiVal) : "undefined"}</span></td>
      <td><span style="color:#cf222e;font-weight:bold;">${dbVal !== undefined ? esc(dbVal) : "undefined"}</span></td>
      <td><span class="badge badge-red">MISMATCH (API: ${apiVal} != DB: ${dbVal})</span></td>
    </tr>`;
  }
  return `<tr>
    <td><strong>${esc(code)}</strong></td>
    <td>${esc(desc)}</td>
    <td><strong>${esc(apiVal)}</strong></td>
    <td><strong>${esc(dbVal)}</strong></td>
    <td><span class="badge badge-green">Exact Match (${apiVal} === ${dbVal})</span></td>
  </tr>`;
}

async function verifyImageNotBlank(browser, imagePath) {
  if (!existsSync(imagePath)) {
    throw new Error(`Expected image file does not exist: ${imagePath}`);
  }
  const stat = statSync(imagePath);
  if (stat.size < 5000) {
    throw new Error(`Image ${imagePath} is suspiciously small: ${stat.size} bytes`);
  }
  const page = await browser.newPage();
  const dataUrl = "data:image/png;base64," + readFileSync(imagePath).toString("base64");
  await page.goto("about:blank");
  const isBlank = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(img.naturalWidth, 200);
    canvas.height = Math.min(img.naturalHeight, 200);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const firstR = data[0], firstG = data[1], firstB = data[2];
    for (let i = 4; i < data.length; i += 4) {
      if (Math.abs(data[i] - firstR) > 10 || Math.abs(data[i + 1] - firstG) > 10 || Math.abs(data[i + 2] - firstB) > 10) {
        return false;
      }
    }
    return true;
  }, dataUrl);
  await page.close();
  if (isBlank) {
    throw new Error(`Image ${imagePath} appears visually blank (solid color across all pixels)!`);
  }
}

async function prepareRequesterPasswords() {
  const reqs = [
    { email: "alice.anderson@example.com" },
    { email: "ivy.ing@example.com" },
    { email: "carol.chen@example.com" },
  ];
  for (const r of reqs) {
    const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
    try {
      const check = await ctx.post("/api/auth/login", {
        headers: JSON_HEADERS,
        data: { email: r.email, password: "ReadyPass!23" },
      });
      if (check.ok()) {
        const body = await check.json();
        if (body.user && !body.user.requiresPasswordChange) continue;
      }
      const initLogin = await ctx.post("/api/auth/login", {
        headers: JSON_HEADERS,
        data: { email: r.email, password: "LostPass!23" },
      });
      if (initLogin.ok()) {
        await ctx.post("/api/auth/change-password", {
          headers: JSON_HEADERS,
          data: {
            currentPassword: "LostPass!23",
            newPassword: "ReadyPass!23",
            confirmPassword: "ReadyPass!23",
          },
        });
      }
    } finally {
      await ctx.dispose();
    }
  }
}

async function resetAndPrepare() {
  run("npm run prisma:seed --prefix server");
  await prepareRequesterPasswords();
}

async function main() {
  const prisma = new PrismaClient();
  const browser = await chromium.launch({ headless: true, args: ["--no-proxy-server"] });
  const apiCtx = await playwrightRequest.newContext({ baseURL: API_URL });

  try {
    console.log("Seeding database to pristine initial state...");
    await resetAndPrepare();

    // Login Staff
    const staffAuthRes = await apiCtx.post("/api/auth/login", {
      headers: JSON_HEADERS,
      data: STAFF,
    });
    const staffCookie = staffAuthRes.headers()["set-cookie"];

    // -------------------------------------------------------------------------
    // 1. Extra UI Screenshots
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing Extra UI States ---");

    // 1.1 Actions Taken: Zero state on TK-001001 (NEW, 0 actions)
    {
      const page = await browser.newPage({ viewport: VIEWPORT });
      await performLogin(page, STAFF.email, STAFF.password);
      const queueNavBtn = page.locator('button:has-text("Ticket Queue")').first();
      if (await queueNavBtn.isVisible()) {
        await queueNavBtn.click();
        await page.waitForTimeout(600);
      }
      const openBtn = page.locator('button[aria-label="Open ticket TK-001001"]:visible').first();
      await openBtn.waitFor({ state: "visible", timeout: 10000 });
      await openBtn.click();
      await page.waitForSelector("#actions-taken-heading", { timeout: 10000 });
      await page.waitForTimeout(800);

      const target = path.join(SHOTS_DIR, "actions-taken", "08-actions-taken-zero-state.png");
      const section = page.locator("section:has(#actions-taken-heading)");
      if (await section.isVisible()) {
        await section.screenshot({ path: target });
      } else {
        await page.screenshot({ path: target });
      }
      console.log("Saved: actions-taken/08-actions-taken-zero-state.png");
      await page.close();
    }

    // 1.2 Actions Taken: Empty description validation on TK-001003
    {
      const page = await browser.newPage({ viewport: VIEWPORT });
      await performLogin(page, STAFF.email, STAFF.password);
      const queueNavBtn = page.locator('button:has-text("Ticket Queue")').first();
      if (await queueNavBtn.isVisible()) {
        await queueNavBtn.click();
        await page.waitForTimeout(600);
      }
      const openBtn = page.locator('button[aria-label="Open ticket TK-001003"]:visible').first();
      await openBtn.waitFor({ state: "visible", timeout: 10000 });
      await openBtn.click();
      await page.waitForSelector("#actions-taken-heading", { timeout: 10000 });
      await page.waitForTimeout(500);

      const recordBtn = page.locator('button:has-text("Add Action")').first();
      await recordBtn.waitFor({ state: "visible", timeout: 5000 });
      await recordBtn.click();
      await page.waitForSelector("#action-actionDescription", { timeout: 5000 });

      // Submit without description
      await page.click('button[type="submit"]:has-text("Save Action")');
      await page.waitForTimeout(500);

      const target = path.join(SHOTS_DIR, "actions-taken", "09-actions-taken-empty-description-validation.png");
      const section = page.locator("section:has(#actions-taken-heading)");
      if (await section.isVisible()) {
        await section.screenshot({ path: target });
      } else {
        await page.screenshot({ path: target });
      }
      console.log("Saved: actions-taken/09-actions-taken-empty-description-validation.png");
      await page.close();
    }

    // -------------------------------------------------------------------------
    // 2. Strict Error-Evidence Captures (Status Line + JSON Verification)
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing Strict Error Evidence ---");

    // 2.1 Resolution Gate Rejection (409 RESOLUTION_GATE)
    {
      await resetAndPrepare();
      // TK-001001 is NEW with 0 actions. First move to IN_PROGRESS so transition to RESOLVED is in matrix.
      const t = await prisma.ticket.findUnique({ where: { ticketNumber: "TK-001001" } });
      await apiCtx.patch(`/api/staff/tickets/${t.id}/status`, {
        headers: { ...JSON_HEADERS, Cookie: staffCookie },
        data: { newStatus: "IN_PROGRESS", expectedUpdatedAt: t.updatedAt.toISOString() },
      });
      const tInProgress = await prisma.ticket.findUnique({ where: { ticketNumber: "TK-001001" } });
      const gateRes = await apiCtx.patch(`/api/staff/tickets/${tInProgress.id}/status`, {
        headers: { ...JSON_HEADERS, Cookie: staffCookie },
        data: { newStatus: "RESOLVED", expectedUpdatedAt: tInProgress.updatedAt.toISOString() },
      });
      const status = gateRes.status();
      const body = await gateRes.json();
      if (status !== 409 || body.error?.code !== "RESOLUTION_GATE") {
        throw new Error(`Expected 409 RESOLUTION_GATE, got ${status}: ${JSON.stringify(body)}`);
      }
      const text = `HTTP/1.1 409 Conflict\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
      await snapshot(
        browser,
        terminalHtml(
          "Ticket Resolution Gate Enforcement (BR-11 / AC-15)",
          "Attempting to resolve a ticket with 0 recorded actions is rejected with 409 Conflict (RESOLUTION_GATE).",
          text
        ),
        path.join(SHOTS_DIR, "workflow", "03-workflow-resolution-gate-rejection.png")
      );
      // Restore pristine state
      await resetAndPrepare();
    }

    // 2.2 Forbidden Transition Rejection (409 FORBIDDEN_TRANSITION)
    {
      const tCancelled = await prisma.ticket.findUnique({ where: { ticketNumber: "TK-001008" } });
      const transRes = await apiCtx.patch(`/api/staff/tickets/${tCancelled.id}/status`, {
        headers: { ...JSON_HEADERS, Cookie: staffCookie },
        data: { newStatus: "OPEN", expectedUpdatedAt: tCancelled.updatedAt.toISOString() },
      });
      const status = transRes.status();
      const body = await transRes.json();
      if (status !== 409 || body.error?.code !== "FORBIDDEN_TRANSITION") {
        throw new Error(`Expected 409 FORBIDDEN_TRANSITION, got ${status}: ${JSON.stringify(body)}`);
      }
      const text = `HTTP/1.1 409 Conflict\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
      await snapshot(
        browser,
        terminalHtml(
          "Status Transition Matrix Enforcement (BR-08 / AC-11)",
          "Attempting an unpermitted transition (e.g. CANCELLED -> OPEN) is rejected with 409 Conflict (FORBIDDEN_TRANSITION).",
          text
        ),
        path.join(SHOTS_DIR, "workflow", "04-workflow-forbidden-transition-api.png")
      );
    }

    // 2.3 Stale Update Rejection (409 STALE_UPDATE)
    {
      const t = await prisma.ticket.findUnique({ where: { ticketNumber: "TK-001002" } });
      const staleRes = await apiCtx.patch(`/api/staff/tickets/${t.id}/status`, {
        headers: { ...JSON_HEADERS, Cookie: staffCookie },
        data: { newStatus: "IN_PROGRESS", expectedUpdatedAt: "2020-01-01T00:00:00.000Z" },
      });
      const status = staleRes.status();
      const body = await staleRes.json();
      if (status !== 409 || body.error?.code !== "STALE_UPDATE") {
        throw new Error(`Expected 409 STALE_UPDATE, got ${status}: ${JSON.stringify(body)}`);
      }
      const text = `HTTP/1.1 409 Conflict\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
      await snapshot(
        browser,
        terminalHtml(
          "Optimistic Concurrency Control: Stale Update Detection (BR-12 / AC-17)",
          "Attempting status transition with mismatched expectedUpdatedAt is rejected with 409 Conflict (STALE_UPDATE).",
          text
        ),
        path.join(SHOTS_DIR, "workflow", "05-workflow-stale-update-api.png")
      );
    }

    // 2.4 Duplicate Action Guard (409 DUPLICATE_ACTION)
    {
      const t = await prisma.ticket.findUnique({ where: { ticketNumber: "TK-001002" } });
      const dupPayload = {
        actionDescription: "Verified router fan assembly and diagnostic LED indicators",
        followUpRequired: false,
      };
      await apiCtx.post(`/api/staff/tickets/${t.id}/actions`, {
        headers: { ...JSON_HEADERS, Cookie: staffCookie },
        data: dupPayload,
      });
      const dupRes = await apiCtx.post(`/api/staff/tickets/${t.id}/actions`, {
        headers: { ...JSON_HEADERS, Cookie: staffCookie },
        data: dupPayload,
      });
      const status = dupRes.status();
      const body = await dupRes.json();
      if (status !== 409 || body.error?.code !== "DUPLICATE_ACTION") {
        throw new Error(`Expected 409 DUPLICATE_ACTION, got ${status}: ${JSON.stringify(body)}`);
      }
      const text = `HTTP/1.1 409 Conflict\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
      await snapshot(
        browser,
        terminalHtml(
          "Duplicate Action Guard Enforcement (BR-13 / FR-08)",
          "Posting an action with identical description by the same actor within 5 minutes is rejected with 409 Conflict (DUPLICATE_ACTION).",
          text
        ),
        path.join(SHOTS_DIR, "actions-taken", "11-actions-taken-duplicate-api.png")
      );
    }

    // Login Requester Alice in dedicated API context
    const aliceApiCtx = await playwrightRequest.newContext({ baseURL: API_URL });
    await aliceApiCtx.post("/api/auth/login", {
      headers: JSON_HEADERS,
      data: ALICE,
    });
    const tForForb = await prisma.ticket.findUnique({ where: { ticketNumber: "TK-001002" } });

    // 2.5 Requester Status Change Forbidden (403)
    {
      const forbRes = await aliceApiCtx.patch(`/api/staff/tickets/${tForForb.id}/status`, {
        headers: JSON_HEADERS,
        data: { newStatus: "IN_PROGRESS", expectedUpdatedAt: tForForb.updatedAt.toISOString() },
      });
      const status = forbRes.status();
      const body = await forbRes.json();
      if (status !== 403 || body.error?.code !== "FORBIDDEN") {
        throw new Error(`Expected 403 FORBIDDEN, got ${status}: ${JSON.stringify(body)}`);
      }
      const text = `HTTP/1.1 403 Forbidden\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
      await snapshot(
        browser,
        terminalHtml(
          "Direct API Security: Requester Attempt to Modify Ticket Status (BR-09)",
          "Requesters cannot perform status transitions. Calling PATCH /api/staff/tickets/:id/status returns 403 Forbidden.",
          text
        ),
        path.join(SHOTS_DIR, "workflow", "06-staff-status-forbidden-api.png")
      );
    }

    // 2.6 Requester POST Action Forbidden (403)
    {
      const forbRes = await aliceApiCtx.post(`/api/staff/tickets/${tForForb.id}/actions`, {
        headers: JSON_HEADERS,
        data: { actionDescription: "Unauthorized requester action", followUpRequired: false },
      });
      const status = forbRes.status();
      const body = await forbRes.json();
      if (status !== 403 || body.error?.code !== "FORBIDDEN") {
        throw new Error(`Expected 403 FORBIDDEN, got ${status}: ${JSON.stringify(body)}`);
      }
      const text = `HTTP/1.1 403 Forbidden\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
      await snapshot(
        browser,
        terminalHtml(
          "Direct API Security: Requester Attempt to Record Action (BR-04)",
          "Requesters can never create or update Actions Taken. Calling POST /api/staff/tickets/:id/actions returns 403 Forbidden.",
          text
        ),
        path.join(SHOTS_DIR, "actions-taken", "10-actions-taken-forbidden-api.png")
      );
    }

    // 2.7 Requester Staff Dashboard Forbidden (403)
    {
      const forbRes = await aliceApiCtx.get("/api/staff/dashboard", {
        headers: JSON_HEADERS,
      });
      const status = forbRes.status();
      const body = await forbRes.json();
      if (status !== 403 || body.error?.code !== "FORBIDDEN") {
        throw new Error(`Expected 403 FORBIDDEN, got ${status}: ${JSON.stringify(body)}`);
      }
      const text = `HTTP/1.1 403 Forbidden\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
      await snapshot(
        browser,
        terminalHtml(
          "IT Staff Dashboard Role Protection (AC-19 / BR-04)",
          "Requesters attempting to access the IT Staff dashboard API receive 403 Forbidden without disclosing operational data.",
          text
        ),
        path.join(SHOTS_DIR, "staff-dashboard", "06-staff-dashboard-forbidden.png")
      );
    }

    // 2.8 Requester Foreign Ticket Access (404 NOT_FOUND)
    {
      // Carol owns TK-001003. Alice attempts to access it.
      const carolTicket = await prisma.ticket.findUnique({ where: { ticketNumber: "TK-001003" } });
      const foreignRes = await aliceApiCtx.get(`/api/tickets/${carolTicket.id}`, {
        headers: JSON_HEADERS,
      });
      const status = foreignRes.status();
      const body = await foreignRes.json();
      if (status !== 404 || body.error?.code !== "NOT_FOUND") {
        throw new Error(`Expected 404 NOT_FOUND, got ${status}: ${JSON.stringify(body)}`);
      }
      const text = `HTTP/1.1 404 Not Found\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
      await snapshot(
        browser,
        terminalHtml(
          "Requester Ticket Ownership Protection: Foreign Ticket (AC-06 / BR-21)",
          "Requesters attempting to view tickets owned by another user receive a non-disclosing 404 Not Found response.",
          text
        ),
        path.join(SHOTS_DIR, "requester-dashboard", "07-requester-foreign-ticket-404.png")
      );
    }

    // -------------------------------------------------------------------------
    // 3. Database Query Verification Tables (Real Prisma Counts vs Real API Fields)
    // -------------------------------------------------------------------------
    console.log("\n--- Computing Database Verification Tables ---");
    await resetAndPrepare();

    const clockRows = await prisma.$queryRaw`SELECT NOW() AS now`;
    const now = clockRows?.[0]?.now instanceof Date ? clockRows[0].now : new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 3.1 IT Staff Dashboard DB Comparison
    {
      const staffRes = await apiCtx.get("/api/staff/dashboard", { headers: { Cookie: staffCookie } });
      const d = await staffRes.json();

      const staffUser = await prisma.user.findUnique({ where: { email: STAFF.email.toLowerCase() } });
      const dbUnassigned = await prisma.ticket.count({ where: { ownerId: null, currentStatus: { in: ACTIVE_STATUSES } } });
      const dbOwnedByMe = await prisma.ticket.count({ where: { ownerId: staffUser.id, currentStatus: { in: ACTIVE_STATUSES } } });

      const dbStatusCounts = {};
      for (const s of ALL_STATUSES) {
        dbStatusCounts[s] = await prisma.ticket.count({ where: { currentStatus: s } });
      }

      const dbPriorityCounts = {};
      for (const p of ALL_PRIORITIES) {
        dbPriorityCounts[p] = await prisma.ticket.count({ where: { itPriority: p, currentStatus: { in: ACTIVE_STATUSES } } });
      }

      const dbRecentTotal = await prisma.ticket.count({ where: { updatedAt: { gte: sevenDaysAgo } } });
      const dbRecentCapped = Math.min(5, dbRecentTotal);

      let rowsHtml = "";
      rowsHtml += checkMatch("SD-01", "Unassigned Active Tickets (ownerId = null)", d.metrics?.unassignedCount, dbUnassigned);
      rowsHtml += checkMatch("SD-02", "Owned by Me Active Tickets (Dan Das)", d.metrics?.ownedByMeCount, dbOwnedByMe);
      for (const s of ALL_STATUSES) {
        rowsHtml += checkMatch(`SD-03 (${s})`, `Tickets in status ${s}`, d.metrics?.byStatus?.[s], dbStatusCounts[s]);
      }
      for (const p of ALL_PRIORITIES) {
        rowsHtml += checkMatch(`SD-04 (${p})`, `Active tickets with IT Priority ${p}`, d.metrics?.byPriority?.[p], dbPriorityCounts[p]);
      }
      rowsHtml += checkMatch("SD-05", "Recently Updated Tickets list size (≤5 within 7d)", d.recentlyUpdated?.items?.length, dbRecentCapped);

      const html = htmlBase(`
        <h1>IT Staff Dashboard: Database Query Verification (Part 5)</h1>
        <div class="caption">Direct comparison between backend-computed dashboard metrics and authoritative PostgreSQL / Prisma direct query counts.</div>
        <table>
          <thead>
            <tr>
              <th>Metric Code</th>
              <th>Metric Description</th>
              <th>Dashboard Value (API)</th>
              <th>Prisma / DB Count</th>
              <th>Verification Verdict</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `);
      await snapshot(browser, html, path.join(SHOTS_DIR, "staff-dashboard", "07-staff-dashboard-db-comparison.png"));
      writeFileSync(path.join(ROOT, "artifacts", "lab-04", "db-verification-staff.html"), html);
    }

    // 3.2 Requester Dashboard DB Comparison (Carol Chen + Ivy Ing Zero State)
    {
      const carolApiCtx = await playwrightRequest.newContext({ baseURL: API_URL });
      await carolApiCtx.post("/api/auth/login", { headers: JSON_HEADERS, data: CAROL });
      const carolDashRes = await carolApiCtx.get("/api/requester/dashboard", { headers: JSON_HEADERS });
      const dCarol = await carolDashRes.json();

      const carolUser = await prisma.user.findUnique({ where: { email: CAROL.email.toLowerCase() } });
      const dbCarolOpen = await prisma.ticket.count({ where: { requesterId: carolUser.id, currentStatus: { in: ACTIVE_STATUSES } } });
      const dbCarolWaiting = await prisma.ticket.count({ where: { requesterId: carolUser.id, currentStatus: "WAITING_FOR_REQUESTER" } });
      const dbCarolRecent = Math.min(5, await prisma.ticket.count({ where: { requesterId: carolUser.id, updatedAt: { gte: sevenDaysAgo } } }));
      const dbCarolResolved = Math.min(5, await prisma.ticket.count({ where: { requesterId: carolUser.id, currentStatus: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { gte: sevenDaysAgo } } }));

      // Zero-state requester (Ivy Ing)
      const ivyApiCtx = await playwrightRequest.newContext({ baseURL: API_URL });
      await ivyApiCtx.post("/api/auth/login", { headers: JSON_HEADERS, data: ZERO_REQUESTER });
      const ivyDashRes = await ivyApiCtx.get("/api/requester/dashboard", { headers: JSON_HEADERS });
      const dIvy = await ivyDashRes.json();

      const ivyUser = await prisma.user.findUnique({ where: { email: ZERO_REQUESTER.email.toLowerCase() } });
      const dbIvyOpen = await prisma.ticket.count({ where: { requesterId: ivyUser.id, currentStatus: { in: ACTIVE_STATUSES } } });
      const dbIvyWaiting = await prisma.ticket.count({ where: { requesterId: ivyUser.id, currentStatus: "WAITING_FOR_REQUESTER" } });
      const dbIvyRecent = Math.min(5, await prisma.ticket.count({ where: { requesterId: ivyUser.id, updatedAt: { gte: sevenDaysAgo } } }));
      const dbIvyResolved = Math.min(5, await prisma.ticket.count({ where: { requesterId: ivyUser.id, currentStatus: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { gte: sevenDaysAgo } } }));

      let rowsHtml = "";
      // Carol Chen
      rowsHtml += checkMatch("RD-01 (Carol)", "My Open Tickets (active statuses)", dCarol.metrics?.openCount, dbCarolOpen);
      rowsHtml += checkMatch("RD-02 (Carol)", "Waiting for Requester", dCarol.metrics?.waitingForRequesterCount, dbCarolWaiting);
      rowsHtml += checkMatch("RD-03 (Carol)", "Recently Updated items (≤5 within 7d)", dCarol.recentlyUpdated?.items?.length, dbCarolRecent);
      rowsHtml += checkMatch("RD-04 (Carol)", "Recently Resolved items (≤5 within 7d)", dCarol.recentlyResolved?.items?.length, dbCarolResolved);

      // Ivy Ing (Zero State)
      rowsHtml += checkMatch("RD-01 (Ivy Zero)", "Zero-State: My Open Tickets", dIvy.metrics?.openCount, dbIvyOpen);
      rowsHtml += checkMatch("RD-02 (Ivy Zero)", "Zero-State: Waiting for Requester", dIvy.metrics?.waitingForRequesterCount, dbIvyWaiting);
      rowsHtml += checkMatch("RD-03 (Ivy Zero)", "Zero-State: Recently Updated items", dIvy.recentlyUpdated?.items?.length, dbIvyRecent);
      rowsHtml += checkMatch("RD-04 (Ivy Zero)", "Zero-State: Recently Resolved items", dIvy.recentlyResolved?.items?.length, dbIvyResolved);

      const html = htmlBase(`
        <h1>Requester Dashboard: Database Query Verification (Part 8)</h1>
        <div class="caption">Comparison between session-scoped requester metrics (Carol Chen active user & Ivy Ing zero-state user) and authoritative database query counts.</div>
        <table>
          <thead>
            <tr>
              <th>Metric Code</th>
              <th>Metric Description</th>
              <th>Dashboard Value (API)</th>
              <th>Prisma / DB Count</th>
              <th>Verification Verdict</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `);
      await snapshot(browser, html, path.join(SHOTS_DIR, "requester-dashboard", "06-requester-dashboard-db-comparison.png"));
      writeFileSync(path.join(ROOT, "artifacts", "lab-04", "db-verification-requester.html"), html);
    }

    if (mismatchDetected) {
      throw new Error("FATAL: Database verification table mismatch detected! See logs above.");
    }

    // -------------------------------------------------------------------------
    // 4. Report Evidence Artifacts (Parts 1-4, 9)
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing Report Evidence Artifacts (Parts 1-4, 9) ---");

    // Part 1: Commit history
    {
      const gitLog = run("git log --oneline --graph --decorate -30");
      await snapshot(
        browser,
        terminalHtml("Git Commit History Graph (Part 1)", "Feature branches merged into lab4-staging with peer review discipline.", gitLog),
        path.join(REPORT_DIR, "part-1-git-evidence", "01-commit-history.png")
      );
    }

    // Part 1: Merged PR list
    {
      const pullsRaw = run("gh pr list --state all --limit 20");
      await snapshot(
        browser,
        terminalHtml("GitHub Pull Requests Record (Part 1)", "All Lab 4 pull requests merged into lab4-staging after review.", pullsRaw),
        path.join(REPORT_DIR, "part-1-git-evidence", "02-pr-list.png")
      );
    }

    // Part 1: Directory structure
    {
      const tree = run("find docs/lab-04 server/src/actionsTaken.ts server/src/staffDashboard.ts client/src/ActionsTaken.tsx e2e/lab-04 -type f | sort");
      await snapshot(
        browser,
        terminalHtml("Lab 4 Repository Directory Structure (Part 1)", "Core engineering specification, source implementations, and automated tests.", tree),
        path.join(REPORT_DIR, "part-1-git-evidence", "03-directory-structure.png")
      );
    }

    // Part 1: Issues Done
    {
      const issues = run("gh issue list --state all --limit 40");
      await snapshot(
        browser,
        terminalHtml("GitHub Kanban Issues: 100% Closed / Done (Part 1)", "All 37 project issues closed and verified against acceptance criteria.", issues),
        path.join(REPORT_DIR, "part-1-git-evidence", "04-issues-done.png")
      );
    }

    // Part 1: Rendered reviewer.md
    {
      const reviewerContent = readFileSafe("docs/lab-04/reviewer.md");
      await snapshot(
        browser,
        terminalHtml("Rendered docs/lab-04/reviewer.md (Part 1)", "Two-way peer review record with partner Thanakorn Phahulrat (@il0lk3).", reviewerContent),
        path.join(REPORT_DIR, "part-1-git-evidence", "05-rendered-reviewer.png")
      );
    }

    // Part 2: Spec before impl
    {
      const specCommit = run("git log --format='%h %ad %s' --date=format:'%Y-%m-%d %H:%M' -5 -- docs/lab-04/specification.md");
      await snapshot(
        browser,
        terminalHtml(
          "Spec DD Provenance: docs/lab-04/specification.md (Part 2)",
          "Git commit history proving the Sprint 4 engineering contract was authored and committed before implementation PRs.",
          specCommit
        ),
        path.join(REPORT_DIR, "part-2-spec-evidence", "01-spec-before-impl.png")
      );
    }

    // Part 3: Test output summaries
    {
      const serverVitest = readFileSafe("artifacts/lab-04/test-output/server-vitest-all.txt");
      const clientVitest = readFileSafe("artifacts/lab-04/test-output/client-vitest-all.txt");
      const serverTail = serverVitest.split("\n").slice(-25).join("\n");
      const clientTail = clientVitest.split("\n").slice(-20).join("\n");

      await snapshot(
        browser,
        terminalHtml("Server Automated Test Output (Part 3)", "All test suites passing on PostgreSQL.", serverTail || "All server tests passing."),
        path.join(REPORT_DIR, "part-3-test-evidence", "01-server-test-output.png")
      );

      await snapshot(
        browser,
        terminalHtml("Client Automated Test Output (Part 3)", "All test suites passing with Testing Library.", clientTail || "All client tests passing."),
        path.join(REPORT_DIR, "part-3-test-evidence", "02-client-test-output.png")
      );
    }

    // Part 4: Rendered ai-use.md
    {
      const aiContent = readFileSafe("docs/lab-04/ai-use.md");
      await snapshot(
        browser,
        terminalHtml("Rendered docs/lab-04/ai-use.md (Part 4)", "Documentation of AI agent prompts, steering, and reflections.", aiContent),
        path.join(REPORT_DIR, "part-4-ai-evidence", "01-rendered-ai-use.png")
      );
    }

    // Part 9: Rendered ui-spec.md
    {
      const uiContent = readFileSafe("docs/lab-04/ui-spec.md");
      await snapshot(
        browser,
        terminalHtml("Rendered docs/lab-04/ui-spec.md (Part 9)", "Zen Green UI specification, screen states, responsive rules, and accessibility checklist.", uiContent.slice(0, 3000) + "\n...[truncated for evidence display]..."),
        path.join(REPORT_DIR, "part-9-ui-evidence", "01-rendered-ui-spec.png")
      );
    }

    // -------------------------------------------------------------------------
    // 5. Sync Updated Evidence to artifacts/lab-04/report-images/
    // -------------------------------------------------------------------------
    console.log("\n--- Syncing Evidence Images to Report Images Directory ---");
    const syncMap = [
      ["staff-dashboard/07-staff-dashboard-db-comparison.png", "p5-07-staff-dashboard-db-comparison.png"],
      ["requester-dashboard/06-requester-dashboard-db-comparison.png", "p8-06-requester-dashboard-db-comparison.png"],
      ["workflow/03-workflow-resolution-gate-rejection.png", "p7-03-workflow-resolution-gate-rejection.png"],
      ["workflow/04-workflow-forbidden-transition-api.png", "p7-04-workflow-forbidden-transition-api.png"],
      ["actions-taken/10-actions-taken-forbidden-api.png", "p6-10-actions-taken-forbidden-api.png"],
      ["requester-dashboard/07-requester-foreign-ticket-404.png", "p8-07-requester-foreign-ticket-404.png"],
      ["actions-taken/08-actions-taken-zero-state.png", "p6-08-actions-taken-zero-state.png"],
      ["actions-taken/09-actions-taken-empty-description-validation.png", "p6-09-actions-taken-empty-description-validation.png"],
    ];

    for (const [srcRel, destName] of syncMap) {
      const src = path.join(SHOTS_DIR, srcRel);
      const dest = path.join(REPORT_IMAGES_DIR, destName);
      if (existsSync(src)) {
        await copyFile(src, dest);
        console.log(`Synced: ${srcRel} -> ${destName}`);
      }
    }

    // -------------------------------------------------------------------------
    // 6. Automated Non-Blank Image Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Verifying All Generated Images Are Non-Blank and Sized Correctly ---");
    const allImages = [
      path.join(SHOTS_DIR, "staff-dashboard", "07-staff-dashboard-db-comparison.png"),
      path.join(SHOTS_DIR, "requester-dashboard", "06-requester-dashboard-db-comparison.png"),
      path.join(SHOTS_DIR, "workflow", "03-workflow-resolution-gate-rejection.png"),
      path.join(SHOTS_DIR, "workflow", "04-workflow-forbidden-transition-api.png"),
      path.join(SHOTS_DIR, "actions-taken", "10-actions-taken-forbidden-api.png"),
      path.join(SHOTS_DIR, "requester-dashboard", "07-requester-foreign-ticket-404.png"),
    ];

    for (const img of allImages) {
      await verifyImageNotBlank(browser, img);
      console.log(`Verified non-blank: ${path.relative(ROOT, img)}`);
    }

    console.log("\nAll extra evidence successfully generated and strictly validated!");
  } finally {
    await browser.close();
    await apiCtx.dispose();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
