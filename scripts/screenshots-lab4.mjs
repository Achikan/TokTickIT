#!/usr/bin/env node
// Lab 4 (Issue 37) — Full visual screenshot set at desktop, tablet, and mobile
// viewports for Sprint 4 features, matching SE Lab 4 sheet §12 & §14 Parts 5–9.

import { chromium, request as playwrightRequest } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdir, copyFile } from "node:fs/promises";
import { existsSync, statSync, readFileSync } from "node:fs";
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
const REPORT_IMAGES_DIR = path.join(ROOT, "artifacts", "lab-04", "report-images");

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
        await ctx.post("/api/auth/change-password", {
          headers: JSON_HEADERS,
          data: {
            currentPassword: "ReadyPass!23",
            newPassword: "ReadyPass!23",
            confirmPassword: "ReadyPass!23",
          },
        });
        continue;
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

async function captureScreenshot(page, relDir, fileName, selector) {
  const target = path.join(OUT, relDir, fileName);
  await mkdir(path.dirname(target), { recursive: true });

  if (selector) {
    const loc = page.locator(selector).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.screenshot({ path: target });
      console.log(`Saved element screenshot: ${path.join(relDir, fileName)}`);
      return;
    }
  }

  // Clip to container to avoid tall blank vertical whitespace
  const container = page.locator("main.container, #root > div").first();
  if (await container.isVisible().catch(() => false)) {
    await container.screenshot({ path: target });
  } else {
    await page.screenshot({ path: target, fullPage: true });
  }
  console.log(`Saved screenshot: ${path.join(relDir, fileName)}`);
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
  execSync("npm run prisma:seed --prefix server", { cwd: ROOT, stdio: "inherit" });
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
      await captureScreenshot(page, "staff-dashboard", `${prefix}-staff-dashboard-${vpName}.png`, "main.container");
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
      await captureScreenshot(page, "staff-dashboard", "04-staff-dashboard-admin-view-desktop.png", "main.container");
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
        await captureScreenshot(page, "staff-dashboard", "05-staff-dashboard-drilldown-queue.png", "main.container");
      }
      await page.close();
    }

    // -------------------------------------------------------------------------
    // 2. REQUESTER DASHBOARD
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing Requester Dashboard ---");
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport: vp });
      await performLogin(page, CAROL.email, CAROL.password);
      const dashBtn = page.locator('button:has-text("Dashboard")').first();
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(800);
      const prefix = vpName === "desktop" ? "01" : vpName === "tablet" ? "02" : "03";
      await captureScreenshot(page, "requester-dashboard", `${prefix}-requester-dashboard-${vpName}.png`, "main.container");
      await page.close();
    }

    // Requester dashboard drill-down to My Tickets
    {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await performLogin(page, CAROL.email, CAROL.password);
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
        await captureScreenshot(page, "requester-dashboard", "04-requester-dashboard-drilldown-mytickets.png", "main.container");
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
      await captureScreenshot(page, "requester-dashboard", "05-requester-dashboard-zero-state.png", "main.container");
      await page.close();
    }

    // -------------------------------------------------------------------------
    // 3. ACTIONS TAKEN & TICKET WORKFLOW
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing Actions Taken on Ticket Detail ---");
    // Ensure clean state before actions captures
    execSync("npm run prisma:seed --prefix server", { cwd: ROOT, stdio: "inherit" });
    await prepareRequesterPasswords();

    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport: vp });
      await performLogin(page, STAFF.email, STAFF.password);

      const queueNavBtn = page.locator('button:has-text("Ticket Queue")').first();
      if (await queueNavBtn.isVisible()) {
        await queueNavBtn.click();
        await page.waitForTimeout(600);
      }

      // Target ticket TK-001003 (Printer jams on floor 3, IN_PROGRESS with 3 actions)
      const openBtn = page.locator('button[aria-label="Open ticket TK-001003"]:visible').first();
      await openBtn.waitFor({ state: "visible", timeout: 10000 });
      await openBtn.click();
      await page.waitForSelector("#actions-taken-heading", { timeout: 10000 });
      await page.waitForTimeout(800);

      const prefix = vpName === "desktop" ? "01" : vpName === "tablet" ? "02" : "03";
      await captureScreenshot(
        page,
        "actions-taken",
        `${prefix}-actions-taken-list-${vpName}.png`,
        "section:has(#actions-taken-heading)"
      );

      if (vpName === "desktop") {
        // Workflow status transitions (TK-001003 is IN_PROGRESS) - captured first while in pristine state
        const workflowSection = page.locator('[data-testid="ticket-workflow"]');
        if (await workflowSection.isVisible()) {
          await captureScreenshot(
            page,
            "workflow",
            "01-workflow-status-transitions.png",
            "section:has([data-testid='ticket-workflow'])"
          );
        }

        // Record Action form
        const addBtn = page.locator('button:has-text("Add Action")');
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForSelector("#action-actionDescription", { timeout: 5000 });
          await page.waitForTimeout(500);
          await captureScreenshot(
            page,
            "actions-taken",
            "04-actions-taken-create-form.png",
            "section:has(#actions-taken-heading)"
          );

          // Validation test: check followUpRequired, fill description, submit without follow-up note
          await page.fill("#action-actionDescription", "Investigated roller alignment and clean cycle");
          await page.check("#action-followUpRequired");
          await page.click('button[type="submit"]:has-text("Save Action")');
          await page.waitForTimeout(500);
          await captureScreenshot(
            page,
            "actions-taken",
            "05-actions-taken-followup-validation.png",
            "section:has(#actions-taken-heading)"
          );

          // Cancel form - scoped to form button to prevent clicking workflow Cancel Ticket button
          const cancelBtn = page.locator('form button:has-text("Cancel")').first();
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
            await page.waitForTimeout(400);
          }
        }

        // Edit action form
        await page.waitForSelector('button[aria-label^="Edit action"]', { timeout: 5000 });
        const editBtn = page.locator('button[aria-label^="Edit action"]').first();
        if (await editBtn.isVisible()) {
          await editBtn.click();
          await page.waitForSelector('form[aria-label="Edit action"]', { timeout: 5000 });
          await page.waitForTimeout(500);
          await captureScreenshot(
            page,
            "actions-taken",
            "06-actions-taken-edit-mode.png",
            "section:has(#actions-taken-heading)"
          );
          // Cancel form - scoped to form button to prevent clicking workflow Cancel Ticket button
          const cancelEdit = page.locator('form button:has-text("Cancel")').first();
          if (await cancelEdit.isVisible()) {
            await cancelEdit.click();
            await page.waitForTimeout(400);
          }
        }
      }

      await page.close();
    }

    // Requester view: read-only actions list and "Problem appears resolved"
    {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await performLogin(page, CAROL.email, CAROL.password);

      const myTicketsBtn = page.locator('button:has-text("My Tickets")').first();
      if (await myTicketsBtn.isVisible()) {
        await myTicketsBtn.click();
        await page.waitForTimeout(600);
      }
      await page.waitForSelector("table, .table-responsive", { timeout: 10000 });
      const openReqBtn = page.locator('button[aria-label="Open ticket TK-001003"]').first();
      await openReqBtn.waitFor({ state: "visible", timeout: 10000 });
      await openReqBtn.click();
      await page.waitForSelector("#actions-taken-heading", { timeout: 10000 });
      await page.waitForTimeout(800);
      await captureScreenshot(
        page,
        "actions-taken",
        "07-actions-taken-requester-readonly.png",
        "section:has(#actions-taken-heading)"
      );

      // Requester advisory
      const markResolvedBtn = page.locator('button:has-text("Mark as appears resolved")');
      if (await markResolvedBtn.isVisible().catch(() => false)) {
        await markResolvedBtn.click();
        await page.waitForTimeout(600);
      }
      await captureScreenshot(
        page,
        "workflow",
        "02-workflow-requester-advisory.png",
        ".callout-success, section:has-text('Resolution Feedback')"
      );
      await page.close();
    }

    // -------------------------------------------------------------------------
    // 4. Sync Generated Screenshots to artifacts/lab-04/report-images/
    // -------------------------------------------------------------------------
    console.log("\n--- Syncing Main Screenshots to Report Images Directory ---");
    const syncMap = [
      ["staff-dashboard/01-staff-dashboard-desktop.png", "p5-01-staff-dashboard-desktop.png"],
      ["staff-dashboard/02-staff-dashboard-tablet.png", "p5-02-staff-dashboard-tablet.png"],
      ["staff-dashboard/03-staff-dashboard-mobile.png", "p5-03-staff-dashboard-mobile.png"],
      ["staff-dashboard/04-staff-dashboard-admin-view-desktop.png", "p5-04-staff-dashboard-admin-view.png"],
      ["staff-dashboard/05-staff-dashboard-drilldown-queue.png", "p5-05-staff-dashboard-drilldown-queue.png"],
      ["requester-dashboard/01-requester-dashboard-desktop.png", "p8-01-requester-dashboard-desktop.png"],
      ["requester-dashboard/02-requester-dashboard-tablet.png", "p8-02-requester-dashboard-tablet.png"],
      ["requester-dashboard/03-requester-dashboard-mobile.png", "p8-03-requester-dashboard-mobile.png"],
      ["requester-dashboard/04-requester-dashboard-drilldown-mytickets.png", "p8-04-requester-dashboard-drilldown-mytickets.png"],
      ["requester-dashboard/05-requester-dashboard-zero-state.png", "p8-05-requester-dashboard-zero-state.png"],
      ["actions-taken/01-actions-taken-list-desktop.png", "p6-01-actions-taken-list-desktop.png"],
      ["actions-taken/02-actions-taken-list-tablet.png", "p6-02-actions-taken-list-tablet.png"],
      ["actions-taken/03-actions-taken-list-mobile.png", "p6-03-actions-taken-list-mobile.png"],
      ["actions-taken/04-actions-taken-create-form.png", "p6-04-actions-taken-create-form.png"],
      ["actions-taken/05-actions-taken-followup-validation.png", "p6-05-actions-taken-followup-validation.png"],
      ["actions-taken/06-actions-taken-edit-mode.png", "p6-06-actions-taken-edit-mode.png"],
      ["actions-taken/07-actions-taken-requester-readonly.png", "p6-07-actions-taken-requester-readonly.png"],
      ["workflow/01-workflow-status-transitions.png", "p7-01-workflow-status-transitions.png"],
      ["workflow/02-workflow-requester-advisory.png", "p7-02-workflow-requester-advisory.png"],
    ];

    for (const [srcRel, destName] of syncMap) {
      const src = path.join(OUT, srcRel);
      const dest = path.join(REPORT_IMAGES_DIR, destName);
      if (existsSync(src)) {
        await copyFile(src, dest);
        console.log(`Synced: ${srcRel} -> ${destName}`);
      }
    }

    // -------------------------------------------------------------------------
    // 5. Automated Blank Image Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Verifying Non-Blank Images ---");
    for (const [srcRel] of syncMap) {
      const src = path.join(OUT, srcRel);
      await verifyImageNotBlank(browser, src);
      console.log(`Verified non-blank: ${srcRel}`);
    }

    console.log("\nAll Lab 4 screenshots successfully generated, synced, and validated!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
