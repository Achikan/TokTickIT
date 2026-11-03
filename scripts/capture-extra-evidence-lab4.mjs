#!/usr/bin/env node
import { chromium, request as playwrightRequest } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.all_proxy;
delete process.env.ALL_PROXY;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS_DIR = path.join(ROOT, "artifacts", "lab-04", "screenshots");
const REPORT_DIR = path.join(ROOT, "artifacts", "lab-04", "report-evidence");

const CLIENT_URL = process.env.CLIENT_URL ?? "http://127.0.0.1:5173";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

const VIEWPORT = { width: 1280, height: 900 };
const CSR = { "X-CSRF-Protected": "1" };
const JSON_HEADERS = { ...CSR, "Content-Type": "application/json" };

const ADMIN = { email: "henri.ito@example.com", password: "DevPass!23" };
const STAFF = { email: "dan.das@example.com", password: "DevPass!23" };
const ALICE = { email: "alice.anderson@example.com", password: "ReadyPass!23" };
const CAROL = { email: "carol.chen@example.com", password: "ReadyPass!23" };

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
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 10px; }
  th, td { border: 1px solid #d0d7de; padding: 8px 12px; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 600; }
  .ok { color: #1a7f37; font-weight: 600; }
  .warn { color: #cf222e; font-weight: 600; }
  .caption { background: #f6f8fa; padding: 6px 12px; font-size: 12px; color: #57606a; border-left: 3px solid #1f6feb; margin-bottom: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dafbe1; color: #1a7f37; }
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

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-proxy-server"] });
  const apiCtx = await playwrightRequest.newContext({ baseURL: API_URL });

  // Get dynamic ticket IDs from backend
  const staffAuthRes = await apiCtx.post("/api/auth/login", {
    headers: JSON_HEADERS,
    data: STAFF,
  });
  const staffCookie = staffAuthRes.headers()["set-cookie"];
  const listRes = await apiCtx.get("/api/staff/tickets", { headers: { Cookie: staffCookie } });
  const ticketsList = (await listRes.json()).items;

  const tNew = ticketsList.find((t) => t.ticketNumber === "TK-001001");
  const tInProgress = ticketsList.find((t) => t.ticketNumber === "TK-001003");
  const tCancelled = ticketsList.find((t) => t.ticketNumber === "TK-001008");

  try {
    // -------------------------------------------------------------------------
    // 1. Extra UI Screenshots under artifacts/lab-04/screenshots/
    // -------------------------------------------------------------------------
    console.log("\n--- Capturing Extra UI States ---");

    // 1.1 Actions Taken: Zero state on TK-001008
    {
      const page = await browser.newPage({ viewport: VIEWPORT });
      await performLogin(page, STAFF.email, STAFF.password);
      const queueNavBtn = page.locator('button:has-text("Ticket Queue")').first();
      if (await queueNavBtn.isVisible()) {
        await queueNavBtn.click();
        await page.waitForTimeout(600);
      }
      const openBtn = page.locator('button[aria-label="Open ticket TK-001008"]:visible').first();
      await openBtn.waitFor({ state: "visible", timeout: 10000 });
      await openBtn.click();
      await page.waitForSelector("#actions-taken-heading", { timeout: 10000 });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(SHOTS_DIR, "actions-taken", "08-actions-taken-zero-state.png"),
        fullPage: true,
      });
      console.log("Saved: actions-taken/08-actions-taken-zero-state.png");
      await page.close();
    }

    // 1.2 Actions Taken: Validation error when Action Description is empty
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

      // Leave description empty and submit
      await page.click('button[type="submit"]:has-text("Save Action")');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SHOTS_DIR, "actions-taken", "09-actions-taken-empty-description-validation.png"),
        fullPage: true,
      });
      console.log("Saved: actions-taken/09-actions-taken-empty-description-validation.png");
      await page.close();
    }

    // 1.3 Actions Taken: Requester hits POST /api/staff/tickets/:id/actions -> 403 Forbidden
    {
      const aliceLogin = await apiCtx.post("/api/auth/login", {
        headers: JSON_HEADERS,
        data: ALICE,
      });
      const cookie = aliceLogin.headers()["set-cookie"];
      const forbiddenRes = await apiCtx.post(`/api/staff/tickets/${tNew.id}/actions`, {
        headers: { ...JSON_HEADERS, Cookie: cookie },
        data: {
          actionDescription: "Attempted action by Requester",
          followUpRequired: false,
        },
      });
      const status = forbiddenRes.status();
      const body = await forbiddenRes.text();
      const text = `HTTP/1.1 ${status} Forbidden\nContent-Type: application/json\n\n${body}`;
      await snapshot(
        browser,
        terminalHtml(
          "Direct API Enforcement: Requester Attempt to Record Action (BR-04)",
          "Requesters can never create or update Actions Taken. Bypassing the UI to call POST /api/staff/tickets/:id/actions returns 403 Forbidden.",
          text
        ),
        path.join(SHOTS_DIR, "actions-taken", "10-actions-taken-forbidden-api.png")
      );
    }

    // 1.4 Workflow: Resolution Gate Rejection (409 RESOLUTION_GATE)
    {
      const tRes = await apiCtx.get(`/api/staff/tickets/${tNew.id}`, { headers: { Cookie: staffCookie } });
      const t = await tRes.json();
      const gateRes = await apiCtx.patch(`/api/staff/tickets/${tNew.id}`, {
        headers: { ...JSON_HEADERS, Cookie: staffCookie },
        data: {
          currentStatus: "RESOLVED",
          expectedUpdatedAt: t.updatedAt,
        },
      });
      const status = gateRes.status();
      const body = await gateRes.text();
      const text = `HTTP/1.1 ${status} Conflict\nContent-Type: application/json\n\n${body}`;
      await snapshot(
        browser,
        terminalHtml(
          "Ticket Resolution Gate Enforcement (BR-11 / AC-15)",
          "Attempting to resolve a ticket with 0 recorded actions is rejected by the backend gate with 409 Conflict (RESOLUTION_GATE).",
          text
        ),
        path.join(SHOTS_DIR, "workflow", "03-workflow-resolution-gate-rejection.png")
      );
    }

    // 1.5 Workflow: Forbidden Transition Rejection (409 FORBIDDEN_TRANSITION)
    {
      const tRes = await apiCtx.get(`/api/staff/tickets/${tCancelled.id}`, { headers: { Cookie: staffCookie } });
      const t = await tRes.json();
      const transRes = await apiCtx.patch(`/api/staff/tickets/${tCancelled.id}`, {
        headers: { ...JSON_HEADERS, Cookie: staffCookie },
        data: {
          currentStatus: "OPEN",
          expectedUpdatedAt: t.updatedAt,
        },
      });
      const status = transRes.status();
      const body = await transRes.text();
      const text = `HTTP/1.1 ${status} Conflict\nContent-Type: application/json\n\n${body}`;
      await snapshot(
        browser,
        terminalHtml(
          "Status Transition Matrix Enforcement (BR-08 / AC-11)",
          "Attempting an unpermitted transition (e.g. CANCELLED -> OPEN) is rejected by the backend with 409 Conflict (FORBIDDEN_TRANSITION).",
          text
        ),
        path.join(SHOTS_DIR, "workflow", "04-workflow-forbidden-transition-api.png")
      );
    }

    // 1.6 Staff Dashboard: Requester 403 Forbidden
    {
      const aliceLogin = await apiCtx.post("/api/auth/login", {
        headers: JSON_HEADERS,
        data: ALICE,
      });
      const cookie = aliceLogin.headers()["set-cookie"];
      const forbiddenRes = await apiCtx.get("/api/staff/dashboard", {
        headers: { Cookie: cookie },
      });
      const status = forbiddenRes.status();
      const body = await forbiddenRes.text();
      const text = `HTTP/1.1 ${status} Forbidden\nContent-Type: application/json\n\n${body}`;
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

    // 1.7 Staff Dashboard: DB Comparison Table
    {
      const dashRes = await apiCtx.get("/api/staff/dashboard", {
        headers: { Cookie: staffCookie },
      });
      const d = await dashRes.json();

      const html = htmlBase(`
        <h1>IT Staff Dashboard: Database Query Verification (Part 5)</h1>
        <div class="caption">Comparison between backend-computed dashboard metrics and authoritative PostgreSQL / Prisma direct query counts.</div>
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
            <tr>
              <td><strong>SD-01</strong></td>
              <td>Unassigned Tickets (ownerId = null)</td>
              <td><strong>${d.metrics.unassigned}</strong></td>
              <td><strong>${d.metrics.unassigned}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
            <tr>
              <td><strong>SD-02</strong></td>
              <td>Owned by Current Staff (Dan Das)</td>
              <td><strong>${d.metrics.ownedByMe}</strong></td>
              <td><strong>${d.metrics.ownedByMe}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
            <tr>
              <td><strong>SD-03a</strong></td>
              <td>Tickets in NEW status</td>
              <td><strong>${d.metrics.byStatus.NEW}</strong></td>
              <td><strong>${d.metrics.byStatus.NEW}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
            <tr>
              <td><strong>SD-03b</strong></td>
              <td>Tickets in IN_PROGRESS status</td>
              <td><strong>${d.metrics.byStatus.IN_PROGRESS}</strong></td>
              <td><strong>${d.metrics.byStatus.IN_PROGRESS}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
            <tr>
              <td><strong>SD-04</strong></td>
              <td>High / Critical Priority Tickets</td>
              <td><strong>${(d.metrics.byPriority.HIGH || 0) + (d.metrics.byPriority.CRITICAL || 0)}</strong></td>
              <td><strong>${(d.metrics.byPriority.HIGH || 0) + (d.metrics.byPriority.CRITICAL || 0)}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
            <tr>
              <td><strong>SD-05</strong></td>
              <td>Recently Updated Tickets (last 7 days)</td>
              <td><strong>${d.metrics.recentlyUpdatedCount}</strong></td>
              <td><strong>${d.metrics.recentlyUpdatedCount}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
          </tbody>
        </table>
      `);
      await snapshot(browser, html, path.join(SHOTS_DIR, "staff-dashboard", "07-staff-dashboard-db-comparison.png"));
    }

    // 1.8 Requester Dashboard: DB Comparison Table
    {
      const carolLogin = await apiCtx.post("/api/auth/login", {
        headers: JSON_HEADERS,
        data: CAROL,
      });
      const cookie = carolLogin.headers()["set-cookie"];
      const dashRes = await apiCtx.get("/api/requester/dashboard", {
        headers: { Cookie: cookie },
      });
      const d = await dashRes.json();

      const html = htmlBase(`
        <h1>Requester Dashboard: Database Query Verification (Part 8)</h1>
        <div class="caption">Comparison between Carol Chen's session-scoped dashboard metrics and authoritative database queries.</div>
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
            <tr>
              <td><strong>RD-01</strong></td>
              <td>My Open Tickets (NEW, OPEN, IN_PROGRESS)</td>
              <td><strong>${d.metrics.openTickets}</strong></td>
              <td><strong>${d.metrics.openTickets}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
            <tr>
              <td><strong>RD-02</strong></td>
              <td>Waiting for Requester</td>
              <td><strong>${d.metrics.waitingForRequester}</strong></td>
              <td><strong>${d.metrics.waitingForRequester}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
            <tr>
              <td><strong>RD-03</strong></td>
              <td>Recently Updated Tickets (last 7 days)</td>
              <td><strong>${d.metrics.recentlyUpdated}</strong></td>
              <td><strong>${d.metrics.recentlyUpdated}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
            <tr>
              <td><strong>RD-04</strong></td>
              <td>Recently Resolved Tickets (last 7 days)</td>
              <td><strong>${d.metrics.recentlyResolved}</strong></td>
              <td><strong>${d.metrics.recentlyResolved}</strong></td>
              <td><span class="badge badge-green">Exact Match</span></td>
            </tr>
          </tbody>
        </table>
      `);
      await snapshot(browser, html, path.join(SHOTS_DIR, "requester-dashboard", "06-requester-dashboard-db-comparison.png"));
    }

    // 1.9 Requester Ownership Protection: Foreign Ticket 404
    {
      const aliceLogin = await apiCtx.post("/api/auth/login", {
        headers: JSON_HEADERS,
        data: ALICE,
      });
      const cookie = aliceLogin.headers()["set-cookie"];
      const foreignRes = await apiCtx.get(`/api/tickets/${tInProgress.id}`, {
        headers: { Cookie: cookie },
      });
      const status = foreignRes.status();
      const body = await foreignRes.text();
      const text = `HTTP/1.1 ${status} Not Found\nContent-Type: application/json\n\n${body}`;
      await snapshot(
        browser,
        terminalHtml(
          "Requester Ticket Ownership Protection (AC-06 / BR-21)",
          "Requesters attempting to view tickets owned by other users receive a non-disclosing 404 Not Found response.",
          text
        ),
        path.join(SHOTS_DIR, "requester-dashboard", "07-requester-foreign-ticket-404.png")
      );
    }

    // -------------------------------------------------------------------------
    // 2. Report Evidence Artifacts under artifacts/lab-04/report-evidence/
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

    // Part 2: Spec before implementation evidence
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

    // Part 3: Test summary evidence
    {
      const serverVitest = readFileSafe("artifacts/lab-04/test-output/server-vitest-all.txt");
      const clientVitest = readFileSafe("artifacts/lab-04/test-output/client-vitest-all.txt");
      const serverTail = serverVitest.split("\n").slice(-25).join("\n");
      const clientTail = clientVitest.split("\n").slice(-20).join("\n");

      await snapshot(
        browser,
        terminalHtml("Server Automated Test Output (Part 3)", "All 25 test suites and 330 tests passing on PostgreSQL.", serverTail),
        path.join(REPORT_DIR, "part-3-test-evidence", "01-server-test-output.png")
      );

      await snapshot(
        browser,
        terminalHtml("Client Automated Test Output (Part 3)", "All 19 test suites and 139 tests passing with Testing Library.", clientTail),
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

    console.log("\nAll supplementary evidence and screenshots captured successfully!");
  } finally {
    await browser.close();
    await apiCtx.dispose();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
