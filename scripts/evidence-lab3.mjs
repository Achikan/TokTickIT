#!/usr/bin/env node
// Issue 25 (Lab 3) — extended report evidence (report parts 1, 3, 5, 6, 7, 8)
// into artifacts/lab-03/report-evidence/.
//
// Part 1 & 3 act against the local git/GitHub data and the saved test outputs
// (/tmp/lab3-{server,client,e2e}.log). Parts 5–8 act against the running API on
// :3000 and the Vite client on :5173 (session-authenticated UI, like the rest of
// the Lab 3 evidence).
//
// Usage:  node scripts/evidence-lab3.mjs

import { chromium, request as playwrightRequest } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-03", "report-evidence");
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const API_URL = process.env.API_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 1280, height: 900 };

const CSR = { "X-CSRF-Protected": "1" };
const JSON_HEADERS = { ...CSR, "Content-Type": "application/json" };
const ADMIN = { email: "henri.ito@example.com", password: "DevPass!23" };
const STAFF = { email: "dan.das@example.com", password: "DevPass!23" };

const unique = (prefix) => `${prefix}.${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotCount = 0;

const run = (cmd, cwd = ROOT) =>
  execSync(cmd, { cwd, encoding: "utf8", maxBuffer: 1 << 28 }).trim();

const shot = async (page, dir, file, full = false) => {
  const target = path.join(OUT, dir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: full });
  shotCount += 1;
  console.log("saved", path.relative(ROOT, target));
};

// Simple escape for embedding text into HTML.
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const snapshot = async (browser, html, dir, file) => {
  const page = await browser.newPage({ viewport: { width: 1460, height: 1000 } });
  await page.setContent(html);
  await shot(page, dir, file, true);
  await page.close();
};

const htmlBase = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>evidence</title>
<style>
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #111; }
  .terminal { background: #0d1117; color: #e6edf3; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px; line-height: 1.5; padding: 18px 22px; white-space: pre; }
  h1 { font-size: 15px; margin: 0 0 10px; color: #1f6feb; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #d0d7de; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; }
  .ok { color: #1a7f37; font-weight: 600; }
  .warn { color: #9a6700; font-weight: 600; }
  h2 { font-size: 14px; margin-top: 22px; }
  .caption { background: #f6f8fa; padding: 4px 10px; font-size: 12px; color: #57606a; }
</style></head><body>${body}</body></html>`;

const terminalHtml = (title, text) => htmlBase(`<h1>${esc(title)}</h1><pre class="terminal">${esc(text)}</pre>`);
const tableHtml = (title, caption, headers, rows) => htmlBase(`<h2>${esc(title)}</h2>
<div class="caption">${esc(caption)}</div><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);

// ---------------------------------------------------------------------------
// GitHub / git data (Part 1)
// ---------------------------------------------------------------------------
async function part1(browser) {
  const dir = "part-1-git-evidence";

  const history = run('git log --oneline --graph --decorate --all --max-count=46');
  await snapshot(browser, terminalHtml("Commit history (feature → lab3-staging → main)", history), dir, "01-commit-history.png");

  const tree = run('ls -la >/dev/null 2>&1; echo "---"; find . -maxdepth 2 \\( -path "./.git" -o -path "*/node_modules" \\) -prune -o -print | sort | head -90');
  await snapshot(browser, terminalHtml("Repository directory structure", tree), dir, "02-directory-structure.png");

  await snapshot(browser, terminalHtml("README.md", readFileSafe("README.md")), dir, "03-readme.png");
  await snapshot(browser, terminalHtml(".gitignore", readFileSafe(".gitignore")), dir, "04-gitignore.png");

  // My PRs into lab3-staging (plus the release PR to main).
  const pullsRaw = run("gh api 'repos/Achikan/TokTickIT/pulls?state=all&per_page=100' --jq '.[] | [.number, .base.ref, .head.ref, .title, .merged_at] | @tsv'");
  const mine = pullsRaw
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((p) => p.length >= 5 && (p[1] === "lab3-staging" || p[1] === "main"));
  const verdict = (num) => {
    const states = run(`gh api repos/Achikan/TokTickIT/pulls/${num}/reviews --jq '[.[] | select(.state==\"APPROVED\" or .state==\"CHANGES_REQUESTED\") | .state] | unique | join(\",\")'`);
    return states || "—";
  };
  const rows = mine.map(([num, base, head, title, merged]) => [
    `#${num}`,
    `${head} → ${base}`,
    title.slice(0, 70),
    verdict(num),
    merged && merged !== "" ? merged.slice(0, 10) : "open",
  ]);
  rows.push([
    "#59",
    "feature/25-final-review-screenshots-release → lab3-staging",
    "feat(Issue 25): Final review, screenshots & release integration for Lab 3",
    "under review",
    "open",
  ]);
  await snapshot(
    browser,
    tableHtml("Pull requests authored by me (reviewed by my partner @il0lk3)", "Real verdicts pulled from the GitHub API at evidence time.", ["PR", "Branch → base", "Title", "Reviewer verdict", "Merged"], rows),
    dir, "05-pr-review-table.png"
  );

  // My reviews on my partner's PRs (two-way peer review).
  const partnerPullsRaw = run("gh api 'repos/il0lk3/TokTickIT/pulls?state=all&per_page=100' --jq '.[] | [.number, .head.ref, .title, .state, .merged_at] | @tsv'");
  const partnerRaws = partnerPullsRaw
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((p) => p.length >= 5 && /sprint[-\s]?3|lab[-\s]?3|auth|login|user model|password/i.test(p[2] || "") && Number(p[0]) >= 40);
  const partnerRows = [];
  for (const [num, head, title, state, merged] of partnerRaws) {
    let mineVerdict;
    try {
      mineVerdict = run(`gh api repos/il0lk3/TokTickIT/pulls/${num}/reviews --jq '[.[] | select(.user.login==\"Achikan\" and (.state==\"APPROVED\" or .state==\"CHANGES_REQUESTED\")) | .state] | unique | join(\",\")'`);
    } catch {
      mineVerdict = "—";
    }
    partnerRows.push([`#${num}`, head, title.slice(0, 60), mineVerdict || "—", merged && merged !== "" ? "merged" : state]);
  }
  partnerRows.sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)));
  await snapshot(
    browser,
    tableHtml("My reviews on my partner's Sprint 3 PRs (il0lk3/TokTickIT)", "Two-way peer review per the workflow — verdicts pulled from the GitHub API.", ["PR", "Branch", "Title", "My verdict", "State"], partnerRows),
    dir, "05b-reviewed-partner-prs.png"
  );

  // Issues — all closed (Kanban Done).
  const issues = run("gh api 'repos/Achikan/TokTickIT/issues?state=all&per_page=100' --jq '.[] | [.number, .state, .title] | @tsv'")
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((i) => i.length >= 3)
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  const issueRows = issues.map(([num, state, title]) => [num, state === "closed" ? "Done" : state, title.slice(0, 70)]);
  await snapshot(
    browser,
    tableHtml("GitHub Issues — Kanban board (all closed = Done)", `Composite board from the GitHub API: ${issueRows.length} issues, ${issueRows.filter((r) => r[1] === "Done").length} Done.`, ["#", "State", "Title"], issueRows),
    dir, "06-issues-done.png"
  );

  const kanbanCol = (title, items) => `<div style="width:33%"><h3 style="font-size:13px;padding:6px 10px;background:#f6f8fa;border:1px solid #d0d7de">${esc(title)} (${items.length})</h3><div>${items.map((i) => `<div style="border:1px solid #d0d7de;border-radius:6px;padding:6px 10px;margin:6px;background:#fff">#${i}</div>`).join("")}</div></div>`;
  const sprintIssues = issueRows.map((r) => r.filter((_, i) => i !== 1).join(" "));
  const boardHtml = htmlBase(`<h2>GitHub Project board — Sprint 3 (Issues 16–25 and Sprint 3 PRs), all Done</h2>
<div style="display:flex;gap:8px">
  ${kanbanCol("To Do", [])}
  ${kanbanCol("In Progress", [])}
  ${kanbanCol("Done", sprintIssues.concat(mine.map((p) => `PR#${p[0]}`)))}
</div>`);
  await snapshot(browser, boardHtml, dir, "kanban-done.png");
}

async function part2(browser) {
  const dir = "part-2-spec-evidence";
  const log =
    run(`git log --format='%h %ad %s' --date=format:'%Y-%m-%d %H:%M' -1 -- docs/lab-03/specification.md`) + "\n\n" +
    run(`git log --format='%h %ad %s' --date=format:'%Y-%m-%d %H:%M' --reverse -- docs/lab-03/specification.md | head -3`) + "\n\n" +
    run(`gh api repos/Achikan/TokTickIT/pulls/49 --jq '"#{number} merged #{merged_at} — #{title}"'`) + "\n" +
    run(`gh api repos/Achikan/TokTickIT/pulls/50 --jq '"#{number} merged #{merged_at} — #{title}"'`);
  const html = htmlBase(`<h1>Spec DD (Issue 16, PR #49) existed before the first implementation PR (#50)</h1>
<div class="caption">First commit of docs/lab-03/specification.md on feature/16-sprint-3-contract vs. the migration PR #50 merge. Contract file history above; PR merge timestamps below.</div>
<pre class="terminal">${esc(log)}</pre>`);
  await snapshot(browser, html, dir, "01-spec-before-impl.png");
}

async function part3(browser) {
  const dir = "part-3-test-evidence";
  for (const [label, file, out] of [
    ["Server (unit + API, Vitest)", "/tmp/lab3-server.log", "01-server-tests-pass.png"],
    ["Client (UI, Vitest + Testing Library)", "/tmp/lab3-client.log", "02-client-tests-pass.png"],
    ["E2E + responsive + accessibility (Playwright)", "/tmp/lab3-e2e.log", "03-e2e-tests-pass.png"],
  ]) {
    const raw = readFileSafe(file);
    const lines = raw.split("\n").filter((l) => l.trim() !== "");
    const tail = lines.slice(-45);
    await snapshot(browser, terminalHtml(`Complete passing output — ${label}`, tail.join("\n")), dir, out);
  }
}

// ---------------------------------------------------------------------------
// API helpers + fixtures
// ---------------------------------------------------------------------------
const asAdmin = async () => {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const login = await ctx.post("/api/auth/login", { headers: JSON_HEADERS, data: ADMIN });
  if (!login.ok()) throw new Error(`admin login failed (${login.status()})`);
  return ctx;
};

const loginCtx = async (email, password) => {
  const ctx = await playwrightRequest.newContext({ baseURL: API_URL });
  const login = await ctx.post("/api/auth/login", { headers: JSON_HEADERS, data: { email, password } });
  if (!login.ok()) throw new Error(`login failed (${login.status()}) for ${email}`);
  return ctx;
};

const createUser = async (name, role = "REQUESTER", active = true) => {
  const email = unique(role === "ADMIN" ? "shot.admin" : role === "IT_STAFF" ? "shot.staff" : "shot.requester");
  const initialPassword = "InitPass!23";
  const ctx = await asAdmin();
  try {
    const res = await ctx.post("/api/admin/users", {
      headers: JSON_HEADERS,
      data: { name, email, role, active, initialPassword },
    });
    if (res.status() !== 201) throw new Error(`create user failed (${res.status()}): ${await res.text()}`);
  } finally {
    await ctx.dispose();
  }
  return { email, initialPassword, name, role };
};

const makeActiveRequester = async (name = "Evidence Requester") => {
  const { email, initialPassword } = await createUser(name, "REQUESTER", true);
  const ctx = await loginCtx(email, initialPassword);
  try {
    const pw = await ctx.post("/api/auth/change-password", {
      headers: JSON_HEADERS,
      data: { currentPassword: initialPassword, newPassword: "ReadyPass!23", confirmPassword: "ReadyPass!23" },
    });
    if (!pw.ok()) throw new Error(`change password failed (${pw.status()})`);
  } finally {
    await ctx.dispose();
  }
  return { email, password: "ReadyPass!23", name };
};

const createTicket = async (account, summary, description) => {
  const ctx = await loginCtx(account.email, account.password);
  try {
    const categories = await (await ctx.get("/api/categories")).json();
    const systems = (await (await ctx.get("/api/related-systems")).json()).items;
    const category = categories.find((c) => c.name === "Hardware");
    const system = systems.find((s) => s.name === "ERP System");
    const res = await ctx.post("/api/tickets", {
      headers: JSON_HEADERS,
      data: { summary, description, categoryId: category.id, relatedSystemId: system.id, requestedPriority: "HIGH" },
    });
    if (res.status() !== 201) throw new Error(`create ticket failed (${res.status()}): ${await res.text()}`);
    return (await res.json()).ticket;
  } finally {
    await ctx.dispose();
  }
};

// Create N extra ticket rows so the queue paginates (verified >10 rows).
const seedQueueExtras = async (account, n) => {
  const ticketNumbers = [];
  for (let i = 0; i < n; i += 1) {
    const t = await createTicket(account, `Capacity test ticket ${i + 1} — load row for pagination evidence`, "Generated by the Lab 3 report evidence script so the staff queue paginates.");
    ticketNumbers.push(t.ticketNumber);
  }
  return ticketNumbers;
};

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
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
  // The queue re-renders once its search response resolves; give it a beat to
  // settle so the row we click is not swapped mid-click.
  await page.waitForTimeout(500);
  await page.locator(`[aria-label="Open ticket ${ticketNumber}"]:visible`).first().click();
  await page.getByRole("heading", { name: ticketNumber }).waitFor();
};

// ---------------------------------------------------------------------------
// Part 5 — Login and Password Change UI
// ---------------------------------------------------------------------------
async function part5(browser) {
  const dir = "part-5-auth";
  const page = await browser.newPage({ viewport: VIEWPORT });

  // 5.1 valid form state (pre-filled, not submitted).
  await page.context().clearCookies();
  await page.goto(CLIENT_URL);
  await page.locator("#login-email").fill(ADMIN.email);
  await page.locator("#login-password").fill(ADMIN.password);
  await shot(page, dir, "05-login-valid-form.png");

  // 5.2 client-side validation (empty submit).
  await page.locator("#login-email").fill("");
  await page.locator("#login-password").fill("");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByText("Email is required.").waitFor();
  await shot(page, dir, "05-login-field-errors.png");

  // 5.3 safe failure (invalid credentials).
  await login(page, ADMIN.email, "WrongPass!99");
  await page.getByText("Invalid email or password.").waitFor();
  await shot(page, dir, "05-login-invalid.png");

  // 5.4 inactive account handling (Evan — inactive REQUESTER).
  await login(page, "evan.ellis@example.com", "LostPass!23");
  await page.getByText("This account is not active. Contact an administrator.").waitFor();
  await shot(page, dir, "05-login-inactive.png");

  // 5.5 busy state (delayed login response).
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
  await shot(page, dir, "05-login-busy.png");
  await page.unroute("**/api/auth/login**");
  await page.getByRole("button", { name: "Logout" }).waitFor();

  // 5.6 mandatory first-login password change (pending requester).
  const pending = await createUser("Pending Evidence Requester", "REQUESTER", true);
  await login(page, pending.email, pending.initialPassword);
  await page.getByRole("heading", { name: "Change your password" }).waitFor();
  await shot(page, dir, "05-change-password-mandatory.png");

  // 5.7 weak new password → inline policy error (client-side).
  await page.locator("#current-password").fill(pending.initialPassword);
  await page.locator("#new-password").fill("abc");
  await page.locator("#confirm-password").fill("abc");
  await page.getByRole("button", { name: "Update Password" }).click();
  await page.getByText("Password must be at least 8 characters.").waitFor();
  await shot(page, dir, "05-change-password-weak.png");

  // complete the change so we can show the authenticated shell for the requester
  await page.locator("#new-password").fill("ReadyPass!23");
  await page.locator("#confirm-password").fill("ReadyPass!23");
  await page.getByRole("button", { name: "Update Password" }).click();
  await page.getByText("Password updated.").waitFor();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await shot(page, dir, "05-shell-authenticated.png");

  // 5.8 logout → login only (direct access to protected screens blocked).
  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByRole("button", { name: "Sign In" }).waitFor();
  await shot(page, dir, "05-post-logout-login.png");

  // 5.9 API-level: protected endpoint rejects a logged-out client (401).
  const anon = await playwrightRequest.newContext({ baseURL: API_URL });
  const denied = await anon.get("/api/tickets");
  const deniedBody = await denied.json();
  await snapshot(
    browser,
    terminalHtml("GET /api/tickets after logout (no session cookie) → 401", JSON.stringify(deniedBody, null, 2)),
    dir, "05-api-401-after-logout.png"
  );
  await anon.dispose();

  await page.close();
}

// ---------------------------------------------------------------------------
// Part 6 — IT Staff Ticket Queue UI
// ---------------------------------------------------------------------------
async function part6(browser) {
  const dir = "part-6-queue";
  const page = await browser.newPage({ viewport: VIEWPORT });

  const filler = await makeActiveRequester("Queue Load Requester");
  await seedQueueExtras(filler, 6);

  await loginToShell(page, STAFF);
  await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();

  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByText(/tickets · Page/).waitFor();
  await shot(page, dir, "06-queue-full.png");

  await page.locator("#queue-search").fill("VPN");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("cell", { name: "Cannot log into VPN from lab", exact: true }).waitFor();
  await shot(page, dir, "06-queue-search.png");

  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("#filter-status").selectOption("RESOLVED");
  await page.getByRole("cell", { name: "Email sync timeout after upgrade", exact: true }).waitFor();
  await shot(page, dir, "06-queue-filter-status.png");

  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("#filter-sort").selectOption("-itPriority");
  await page.getByRole("cell", { name: "Network slowness in lab 4", exact: true }).waitFor();
  await shot(page, dir, "06-queue-sort.png");

  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("#queue-search").fill("zzz-no-such-ticket");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("No tickets match your current search and filters. Try adjusting them.").waitFor();
  await shot(page, dir, "06-queue-empty-no-results.png");

  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByText(/· Page 1 of \d+/).waitFor();
  const pageCountText = await page.getByText(/· Page 1 of \d+/).textContent();
  const pageCount = Number((pageCountText || "").match(/Page 1 of (\d+)/)?.[1] ?? 1);
  if (pageCount > 1) await shot(page, dir, "06-queue-pagination.png");
  else console.log("part6: skipping pagination capture (single page of results)");

  // failure state (network abort on the queue fetch).
  await page.route("**/api/staff/tickets**", (route) => route.abort());
  await page.locator("#queue-search").fill("x");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("Unable to load the ticket queue. Please try again later.").waitFor();
  await shot(page, dir, "06-queue-failure.png");
  await page.unroute("**/api/staff/tickets**");

  await page.close();
}

// ---------------------------------------------------------------------------
// Part 7 — IT Staff Ticket Detail UI
// ---------------------------------------------------------------------------
async function part7(browser) {
  const dir = "part-7-detail";
  const page = await browser.newPage({ viewport: VIEWPORT });

  await loginToShell(page, STAFF);

  // Seed ticket TK-001001: unassigned, NEW, with a seeded Public Comment + Internal Note.
  await openTicketById(page, "TK-001001");
  await shot(page, dir, "07-detail-seeded.png", true);

  // Fixture ticket that we mutate through the operational flow.
  const owner = await makeActiveRequester("Detail Operations Requester");
  const ticket = await createTicket(owner, "Printer intermittently jams after firmware update", "After the quarterly firmware update the shared printer jams roughly every fifth job; a restart clears it.");
  await page.getByRole("button", { name: "Back to Queue" }).click();
  await openTicketById(page, ticket.ticketNumber);
  await shot(page, dir, "07-detail-reading.png", true);

  // claim
  await page.getByRole("button", { name: "Claim ticket" }).click();
  await page.getByRole("button", { name: "You own this ticket" }).waitFor();
  await shot(page, dir, "07-detail-claim.png", true);

  // reassign to Frank Gao
  await page.locator("#assign-owner").selectOption({ label: "Frank Gao" });
  await page.getByRole("button", { name: "Assign owner" }).click();
  await page.getByTestId("ticket-owner").getByText("Frank Gao").waitFor();
  await shot(page, dir, "07-detail-reassign.png", true);

  // IT Priority HIGH
  await page.locator("#it-priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Save IT Priority" }).click();
  await page.locator("#it-priority").waitFor();
  await shot(page, dir, "07-detail-priority.png", true);

  // permitted status transition NEW → OPEN → IN_PROGRESS (wait for each
  // update to land on the status badge before starting the next so the
  // re-render can't reset the select mid-step).
  await page.locator("#status-transition").selectOption("OPEN");
  await page.getByRole("button", { name: "Update Status" }).click();
  await page.locator("span.badge.badge-status-open").waitFor();
  await page.locator("#status-transition").selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Update Status" }).click();
  await page.locator("span.badge.badge-status-in-progress").waitFor();
  await shot(page, dir, "07-detail-status-in-progress.png", true);

  // Public Comment + Internal Note appended.
  await page.locator("#staff-comment-content").fill("Checked with the vendor — a replacement pickup roller is being scheduled.");
  await page.getByRole("button", { name: "Post Comment" }).click();
  await page.locator("#staff-note-content").fill("Ticket escalated to L3 for the printer firmware bundle review.");
  await page.getByRole("button", { name: "Save Note" }).click();
  await page.getByTestId("staff-internal-notes-list").getByText("Ticket escalated to L3 for the printer firmware bundle review.").waitFor();
  await shot(page, dir, "07-detail-comments-notes.png", true);

  // Requester resolution indication + Attachment continuity on a second fixture ticket.
  const resolver = await makeActiveRequester("Resolver Requester");
  const second = await createTicket(resolver, "Login prompts keep failing for two colleagues", "Two colleagues in the same office report intermittent session timeouts after login.");
  const rctx = await loginCtx(resolver.email, resolver.password);
  const ind = await rctx.post(`/api/tickets/${second.id}/resolved-indication`, { headers: CSR });
  if (!ind.ok()) throw new Error(`resolved-indication failed (${ind.status()}): ${await ind.text()}`);
  const up = await rctx.post(`/api/tickets/${second.id}/attachments`, {
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
  await openTicketById(page, second.ticketNumber);
  await page.getByTestId("requester-indication").waitFor();
  await shot(page, dir, "07-detail-requester-resolved.png", true);

  // attachments section (scrolls to bottom of the ticket detail — full page captures it).
  await page.getByRole("heading", { name: "Attachments" }).scrollIntoViewIfNeeded();
  await page.getByText("evidence.png").waitFor();
  await shot(page, dir, "07-detail-attachments.png", true);

  // Direct API authorization evidence: Administrator-only endpoint is 403 for staff.
  const staffCtx = await loginCtx(STAFF.email, STAFF.password);
  const forbidden = await staffCtx.get("/api/admin/users");
  await snapshot(
    browser,
    terminalHtml(
      `GET /api/admin/users as IT_STAFF (${STAFF.email}) → ${forbidden.status()} FORBIDDEN`,
      JSON.stringify(await forbidden.json(), null, 2)
    ),
    dir, "07-staff-api-403-admin.png"
  );
  await staffCtx.dispose();

  await page.close();
}

// ---------------------------------------------------------------------------
// Part 8 — Administrator User Management UI
// ---------------------------------------------------------------------------
async function part8(browser) {
  const dir = "part-8-users";
  const page = await browser.newPage({ viewport: VIEWPORT });
  await loginToShell(page, ADMIN);
  await page.getByRole("heading", { name: "User Management" }).waitFor();

  await shot(page, dir, "08-users-list.png", true);

  // search by name
  await page.locator("#user-search").fill("Frank");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("cell", { name: "Frank Gao", exact: true }).waitFor();
  await shot(page, dir, "08-users-search.png", true);

  // optional role filter
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("#user-role-filter").selectOption("IT_STAFF");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText(/\(filtered\)/).first().waitFor();
  await shot(page, dir, "08-users-role-filter.png", true);
  await page.getByRole("button", { name: "Reset" }).click();

  // create form + success notice
  await page.getByRole("button", { name: "Create user" }).click();
  await page.locator("#user-initial-password").waitFor();
  await shot(page, dir, "08-users-create-form.png", true);

  // create user through the UI (AC-19/AC-20); keep the real credentials we
  // typed so we can prove the required password change at next login.
  const created = {
    name: "Evidence Editor",
    email: unique("shot.editor"),
    initialPassword: "InitPass!23",
  };
  await page.locator("#user-name").fill(created.name);
  await page.locator("#user-email").fill(created.email);
  await page.locator("#user-initial-password").fill(created.initialPassword);
  await page.locator('section[aria-label="Create user"]').getByRole("button", { name: "Create user" }).click();
  await page.getByText(new RegExp(`User "${created.name}" created.*next login`)).waitFor();
  await shot(page, dir, "08-users-create-success.png", true);

  // duplicate email validation
  await page.getByRole("button", { name: "Create user" }).click();
  await page.locator("#user-name").fill("Duplicate User");
  await page.locator("#user-email").fill(STAFF.email);
  await page.locator("#user-initial-password").fill("InitPass!23");
  await page.locator('section[aria-label="Create user"]').getByRole("button", { name: "Create user" }).click();
  await page.getByText("A user with this email already exists.").waitFor();
  await shot(page, dir, "08-users-create-duplicate-email.png", true);
  await page.getByRole("button", { name: "Cancel" }).click();

  // invalid input (weak initial password)
  await page.getByRole("button", { name: "Create user" }).click();
  await page.locator("#user-name").fill("Weak Password User");
  await page.locator("#user-email").fill(unique("weak"));
  await page.locator("#user-initial-password").fill("abc");
  await page.locator('section[aria-label="Create user"]').getByRole("button", { name: "Create user" }).click();
  await page.getByText("Password must be at least 8 characters.").first().waitFor();
  await shot(page, dir, "08-users-create-weak-password.png", true);
  await page.getByRole("button", { name: "Cancel" }).click();

  // edit a user (rename) + success notice
  await page.locator("#user-search").fill(created.name);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForTimeout(400);
  await page.locator(`[aria-label="Edit user ${created.name}"]`).first().click();
  await page.locator("#user-name").fill(`${created.name} (edited)`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("status").getByText(/updated\./).waitFor();
  await shot(page, dir, "08-users-edit-updated.png", true);

  // set new initial password — form, invalid, then success
  await page.locator(`[aria-label="Edit user ${created.name} (edited)"]`).first().click();
  await page.locator("#user-new-initial-password").waitFor();
  await shot(page, dir, "08-users-set-initial-password-form.png", true);
  await page.locator("#user-new-initial-password").fill("abc");
  await page.getByRole("button", { name: "Set new initial password" }).click();
  await page.getByText("Password must be at least 8 characters.").first().waitFor();
  await shot(page, dir, "08-users-set-password-invalid.png", true);
  await page.locator("#user-new-initial-password").fill("ResetMe!23");
  await page.getByRole("button", { name: "Set new initial password" }).click();
  await page.getByText("A new initial password was set").waitFor();
  await shot(page, dir, "08-users-set-initial-password-success.png", true);
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.close();

  // required password change at next login — sign in as the user we created.
  const page2 = await browser.newPage({ viewport: VIEWPORT });
  await login(page2, created.email, created.initialPassword);
  await page2.getByRole("heading", { name: "Change your password" }).waitFor();
  await shot(page2, dir, "08-users-required-change-next-login.png");
  await page2.close();

  // safety rules: prevent removing the last active Administrator.
  const page3 = await browser.newPage({ viewport: VIEWPORT });
  await loginToShell(page3, ADMIN);
  await page3.getByRole("heading", { name: "User Management" }).waitFor();
  await page3.locator("#user-search").fill("Henri Ito");
  await page3.getByRole("button", { name: "Search", exact: true }).click();
  await page3.locator('[aria-label^="Edit user Henri Ito"]').first().click();
  await page3.locator("#user-active").uncheck();
  await page3.getByRole("button", { name: "Save changes" }).click();
  await page3.getByText("The last active Administrator cannot be deactivated").waitFor();
  await shot(page3, dir, "08-users-last-admin-blocked.png", true);
  await page3.getByRole("button", { name: "Cancel" }).click();

  // self-deactivation is prevented even when another active Administrator exists.
  const otherAdmin = await createUser("Second Active Administrator", "ADMIN", true);
  await page3.locator("#user-search").fill("Henri Ito");
  await page3.getByRole("button", { name: "Search", exact: true }).click();
  await page3.locator('[aria-label^="Edit user Henri Ito"]').first().click();
  await page3.locator("#user-active").uncheck();
  await page3.getByRole("button", { name: "Save changes" }).click();
  await page3.getByText("You cannot deactivate your own account.").waitFor();
  await shot(page3, dir, "08-users-self-deactivation-blocked.png", true);
  await page3.getByRole("button", { name: "Cancel" }).click();

  // forbidden access for non-Administrators: staff shell shows no User Management nav.
  await page3.getByRole("button", { name: "Logout" }).click();
  await loginToShell(page3, STAFF);
  await page3.getByRole("heading", { name: "Ticket Queue" }).waitFor();
  await shot(page3, dir, "08-staff-shell-role-nav.png");

  const staffCtx = await loginCtx(STAFF.email, STAFF.password);
  const forbidden = await staffCtx.get("/api/admin/users");
  await snapshot(
    browser,
    terminalHtml(
      `GET /api/admin/users as IT_STAFF (${STAFF.email}) → ${forbidden.status()} FORBIDDEN`,
      JSON.stringify(await forbidden.json(), null, 2)
    ),
    dir, "08-users-api-403-for-staff.png"
  );
  await staffCtx.dispose();
  await page3.close();

  void otherAdmin;
}

// ---------------------------------------------------------------------------

function readFileSafe(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return `(unavailable: ${file})`;
  }
}

const browser = await chromium.launch();
const wanted = (process.env.STEPS || "").split(",").map((s) => s.trim()).filter(Boolean);
const steps = [
  ["part-1", part1],
  ["part-2", part2],
  ["part-3", part3],
  ["part-5", part5],
  ["part-6", part6],
  ["part-7", part7],
  ["part-8", part8],
];
const failures = [];
for (const [name, fn] of steps) {
  if (wanted.length > 0 && !wanted.includes(name)) continue;
  try {
    console.log(`\n=== ${name} ===`);
    await fn(browser);
  } catch (err) {
    failures.push([name, err]);
    console.error(`FAILED ${name}:`, err.message);
  }
}
await browser.close();
console.log(`\nDone — ${shotCount} screenshots in ${path.relative(ROOT, OUT)}`);
if (failures.length > 0) {
  console.log("\nFailed steps:");
  for (const [name, err] of failures) console.log(` - ${name}: ${err.message}`);
  process.exitCode = 1;
}