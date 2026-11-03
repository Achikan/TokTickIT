#!/usr/bin/env node
// Lab 4 (Issue 37) — Full visual screenshot set at desktop, tablet, and mobile
// viewports for Sprint 4 features, matching SE Lab 4 sheet §12 & §14 Parts 5–9.

import { chromium, request as playwrightRequest } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.all_proxy;
delete process.env.ALL_PROXY;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-04", "screenshots");

const CLIENT_URL = process.env.CLIENT_URL ?? "http://127.0.0.1:5173";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 900 },
  mobile: { width: 390, height: 844 },
};

const CSR = { "X-CSRF-Protected": "1" };
const JSON_HEADERS = { ...CSR, "Content-Type": "application/json" };

const ADMIN = { email: "henri.ito@example.com", password: "DevPass!23" };
const STAFF = { email: "dan.das@example.com", password: "DevPass!23" };
const REQUESTER = { email: "alice.anderson@example.com", password: "ReadyPass!23" };
const ZERO_REQUESTER = { email: "ivy.ing@example.com", password: "ReadyPass!23" };
const CAROL = { email: "carol.chen@example.com", password: "ReadyPass!23" };

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

async function captureScreenshot(page, relDir, fileName) {
  const target = path.join(OUT, relDir, fileName);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: true });
  console.log(`Saved screenshot: ${path.join(relDir, fileName)}`);
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

async function run() {
  console.log("Preparing requester test accounts...");
  await prepareRequesterPasswords();

  console.log("Launching Chromium...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-proxy-server"],
  });

  try {
    // -------------------------------------------------------------------------
    // 1. IT STAFF DASHBOARD
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing IT Staff Dashboard ---");
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport: vp });
      await performLogin(page, STAFF.email, STAFF.password);
      
      const dashBtn = page.locator('button:has-text("Staff Dashboard")').first();
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForTimeout(600);
      }

      await page.waitForTimeout(800);
      const prefix = vpName === "desktop" ? "01" : vpName === "tablet" ? "02" : "03";
      await captureScreenshot(page, "staff-dashboard", `${prefix}-staff-dashboard-${vpName}.png`);
      await page.close();
    }

    // Admin view with user counts card
    {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await performLogin(page, ADMIN.email, ADMIN.password);
      const dashBtn = page.locator('button:has-text("Staff Dashboard")').first();
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(800);
      await captureScreenshot(page, "staff-dashboard", "04-staff-dashboard-admin-view-desktop.png");
      await page.close();
    }

    // Staff dashboard drill-down to queue
    {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await performLogin(page, STAFF.email, STAFF.password);
      const dashBtn = page.locator('button:has-text("Staff Dashboard")').first();
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(500);

      const unassignedCard = page.locator('a[aria-label="View unassigned tickets"], a:has-text("Unassigned Tickets")').first();
      if (await unassignedCard.isVisible()) {
        await unassignedCard.click();
        await page.waitForTimeout(800);
        await captureScreenshot(page, "staff-dashboard", "05-staff-dashboard-drilldown-queue.png");
      }
      await page.close();
    }

    // -------------------------------------------------------------------------
    // 2. REQUESTER DASHBOARD
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing Requester Dashboard ---");
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport: vp });
      await performLogin(page, REQUESTER.email, REQUESTER.password);
      const dashBtn = page.locator('button:has-text("Dashboard")').first();
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(800);
      const prefix = vpName === "desktop" ? "01" : vpName === "tablet" ? "02" : "03";
      await captureScreenshot(page, "requester-dashboard", `${prefix}-requester-dashboard-${vpName}.png`);
      await page.close();
    }

    // Requester dashboard drill-down to My Tickets
    {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await performLogin(page, REQUESTER.email, REQUESTER.password);
      const dashBtn = page.locator('button:has-text("Dashboard")').first();
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(500);

      const openCard = page.locator('a[aria-label="My Open Tickets"], a:has-text("My Open Tickets")').first();
      if (await openCard.isVisible()) {
        await openCard.click();
        await page.waitForTimeout(800);
        await captureScreenshot(page, "requester-dashboard", "04-requester-dashboard-drilldown-mytickets.png");
      }
      await page.close();
    }

    // Requester zero-state dashboard (Ivy Ing has 0 tickets)
    {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await performLogin(page, ZERO_REQUESTER.email, ZERO_REQUESTER.password);
      const dashBtn = page.locator('button:has-text("Dashboard")').first();
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(800);
      await captureScreenshot(page, "requester-dashboard", "05-requester-dashboard-zero-state.png");
      await page.close();
    }

    // -------------------------------------------------------------------------
    // 3. ACTIONS TAKEN & TICKET WORKFLOW
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing Actions Taken on Ticket Detail ---");
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport: vp });
      await performLogin(page, STAFF.email, STAFF.password);
      
      // Ensure we navigate to Ticket Queue where all tickets are listed
      const queueNavBtn = page.locator('button:has-text("Ticket Queue")').first();
      if (await queueNavBtn.isVisible()) {
        await queueNavBtn.click();
        await page.waitForTimeout(600);
      }
      
      // Target ticket TK-001003 (Printer jams on floor 3, IN_PROGRESS with 3 actions)
      const openBtn = page.locator('button[aria-label="Open ticket TK-001003"]:visible').first();
      await openBtn.waitFor({ state: "visible", timeout: 10000 });
      await openBtn.click();
      await page.waitForSelector('#actions-taken-heading', { timeout: 10000 });
      await page.waitForTimeout(800);

      const prefix = vpName === "desktop" ? "01" : vpName === "tablet" ? "02" : "03";
      await captureScreenshot(page, "actions-taken", `${prefix}-actions-taken-list-${vpName}.png`);

      if (vpName === "desktop") {
        // Record Action form modal/inline
        const addBtn = page.locator('button:has-text("Add Action")');
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForSelector('#action-actionDescription', { timeout: 5000 });
          await page.waitForTimeout(500);
          await captureScreenshot(page, "actions-taken", "04-actions-taken-create-form.png");

          // Validation test: check followUpRequired, fill description, submit without follow-up note
          await page.fill("#action-actionDescription", "Investigated network gateway connectivity issues");
          await page.check("#action-followUpRequired");
          await page.click('button[type="submit"]:has-text("Save Action")');
          await page.waitForTimeout(500);
          await captureScreenshot(page, "actions-taken", "05-actions-taken-followup-validation.png");

          // Cancel form
          const cancelBtn = page.locator('button:has-text("Cancel")').first();
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
            await page.waitForTimeout(400);
          }
        }

        // Edit action form (TK-001003 has 3 actions, so edit button is present)
        await page.waitForSelector('button[aria-label^="Edit action"]', { timeout: 5000 });
        const editBtn = page.locator('button[aria-label^="Edit action"]').first();
        if (await editBtn.isVisible()) {
          await editBtn.click();
          await page.waitForSelector('form[aria-label="Edit action"]', { timeout: 5000 });
          await page.waitForTimeout(500);
          await captureScreenshot(page, "actions-taken", "06-actions-taken-edit-mode.png");
          const cancelEdit = page.locator('button:has-text("Cancel")').first();
          if (await cancelEdit.isVisible()) {
            await cancelEdit.click();
            await page.waitForTimeout(400);
          }
        }

        // Workflow status transitions (TK-001003 is IN_PROGRESS with permitted transition buttons rendered)
        const workflowSection = page.locator('[data-testid="ticket-workflow"]');
        if (await workflowSection.isVisible()) {
          await captureScreenshot(page, "workflow", "01-workflow-status-transitions.png");
        }
      }

      await page.close();
    }

    // Requester view: read-only actions list and "Problem appears resolved"
    // Using Carol Chen (carol.chen@example.com) who owns TK-001003
    {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await performLogin(page, CAROL.email, CAROL.password);
      
      const myTicketsBtn = page.locator('button:has-text("My Tickets")').first();
      if (await myTicketsBtn.isVisible()) {
        await myTicketsBtn.click();
        await page.waitForTimeout(600);
      }
      const openReqBtn = page.locator('button[aria-label="Open ticket TK-001003"]:visible').first();
      await openReqBtn.waitFor({ state: "visible", timeout: 10000 });
      await openReqBtn.click();
      await page.waitForSelector('#actions-taken-heading', { timeout: 10000 });
      await page.waitForTimeout(800);
      await captureScreenshot(page, "actions-taken", "07-actions-taken-requester-readonly.png");

      // Requester advisory: click "Mark as appears resolved" if not already indicated
      const markResolvedBtn = page.locator('button:has-text("Mark as appears resolved")');
      if (await markResolvedBtn.isVisible().catch(() => false)) {
        await markResolvedBtn.click();
        await page.waitForTimeout(600);
      }
      await captureScreenshot(page, "workflow", "02-workflow-requester-advisory.png");
      await page.close();
    }

    console.log("\nAll Lab 4 screenshots successfully generated!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
