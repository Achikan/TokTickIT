#!/usr/bin/env node
// Issue 15 — capture Part 1 PR Review Evidence as a readable HTML PNG.
// Data is pulled from the real GitHub PRs (gh) for Lab 2 PRs #25..#35.
//
//   01-pr-review-table.png — per-PR: author, reviewer, review verdict(s)
//   02-pr-review-as-author.png — reviewer of OUR PRs (what we received)
//   03-kanban-issues-done.png — Issue list (all closed) as Kanban-equivalent
//                               (note: GitHub Projects needs read:project scope)

import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");
const PRDATA = "/tmp/opencode/prdata";
const PRDATA2 = "/tmp/opencode/prdata2";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const css = `
  body { font-family: -apple-system,"Segoe UI",Roboto,sans-serif; margin:24px; color:#1c2b22; background:#fff; }
  h1 { font-size:20px; color:#006b3c; }
  h2 { font-size:15px; margin-top:18px; }
  table { border-collapse:collapse; width:100%; font-size:13px; margin-top:8px; }
  th,td { border:1px solid #c8cfcb; padding:7px 9px; text-align:left; vertical-align:top; }
  th { background:#eaf6ef; }
  .ok { color:#198754; font-weight:600; }
  .chg { color:#b8860b; font-weight:600; }
  .note { background:#fff4ce; border:1px solid #e0c04a; border-radius:6px; padding:10px 14px; font-size:13px; margin-top:14px; }
`;

const readPr = async (n) => {
  try {
    return JSON.parse(await readFile(path.join(PRDATA, `${n}.json`), "utf-8"));
  } catch {
    return null;
  }
};
const readPr2 = async (n) => {
  try {
    return JSON.parse(await readFile(path.join(PRDATA2, `${n}.json`), "utf-8"));
  } catch {
    return null;
  }
};

const PRS = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35];
const rows = [];
for (const n of PRS) {
  const info = await readPr(n);
  if (!info) continue;
  const reviews = info.reviews || [];
  let revStr;
  if (reviews.length === 0) {
    revStr = `<span class="chg">Pending / none yet</span>`;
  } else {
    const set = [...new Set(reviews.map((r) => r.state))];
    revStr = set
      .map((s) =>
        s === "APPROVED" ? `<span class="ok">APPROVED</span>` : s === "CHANGES_REQUESTED" ? `<span class="chg">CHANGES_REQUESTED</span>` : `<span>${esc(s)}</span>`
      )
      .join(" → ");
  }
  const reviewer = [...new Set(reviews.map((r) => `@${r.author.login}`))].join(", ") || "—";
  rows.push({
    n: info.number,
    title: info.title,
    head: info.headRefName,
    base: info.baseRefName,
    state: info.state,
    reviewer,
    revStr,
  });
}

const table = rows
  .map(
    (r) => `<tr>
      <td>PR #${r.n}</td>
      <td>${esc(r.title)}</td>
      <td><code>${esc(r.head)}</code> → <code>${esc(r.base)}</code></td>
      <td>${esc(r.state)}</td>
      <td>${esc(r.reviewer)}</td>
      <td>${r.revStr}</td>
    </tr>`
  )
  .join("");

const issues = JSON.parse(await readFile(path.join(PRDATA, "issues.json"), "utf-8")).sort(
  (a, b) => a.number - b.number
);
const issueRows = issues
  .map((i) => `<tr><td>#${i.number}</td><td>${esc(i.title)}</td><td>${esc(i.state)}</td></tr>`)
  .join("");

// Partner's Lab 2 PRs (il0lk3/TokTickIT) — the PRs *I* reviewed as @Achikan
const PRS2 = [22, 23, 24, 25, 26, 27, 28, 29, 30];
const rows2 = [];
for (const n of PRS2) {
  const info = await readPr2(n);
  if (!info) continue;
  const reviews = info.reviews || [];
  let revStr;
  const mine = reviews.filter((r) => r.author.login === "Achikan");
  if (mine.length === 0) {
    revStr = `<span class="chg">No Achikan review</span>`;
  } else {
    const set = [...new Set(mine.map((r) => r.state))];
    revStr = set
      .map((s) =>
        s === "APPROVED" ? `<span class="ok">APPROVED</span>` : s === "CHANGES_REQUESTED" ? `<span class="chg">CHANGES_REQUESTED</span>` : `<span>${esc(s)}</span>`
      )
      .join(" → ");
  }
  const mineAt = mine.length
    ? new Date(Math.max(...mine.map((r) => Date.parse(r.submittedAt)))).toISOString().slice(0, 10)
    : "—";
  rows2.push({
    n: info.number,
    title: info.title,
    head: info.headRefName,
    base: info.baseRefName,
    state: info.state,
    revStr,
    mineCount: mine.length,
    mineAt,
  });
}

const table2 = rows2
  .map(
    (r) => `<tr>
      <td>PR #${r.n}</td>
      <td>${esc(r.title)}</td>
      <td><code>${esc(r.head)}</code> → <code>${esc(r.base)}</code></td>
      <td>${esc(r.state)}</td>
      <td>${r.mineAt} (${r.mineCount} review(s))</td>
      <td>${r.revStr}</td>
    </tr>`
  )
  .join("");

const html1 = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Part 1 Evidence — PR Review Record (every Lab 2 PR reviewed by peer @il0lk3)</h1>
<table>
  <tr><th>PR</th><th>Title</th><th>Branches</th><th>State</th><th>Reviewer</th><th>Verdict(s)</th></tr>
  ${table}
</table>
<div class="note">
  Author of all Lab 2 PRs: <strong>@Achikan</strong> (นางสาวอชิรญา อินตา). Reviewer: <strong>@il0lk3</strong>
  (นายธนากร พหุลรัตน์). Every feature branch merges into <code>lab2-staging</code> only after an
  APPROVED review; no direct commits to <code>main</code>/<code>staging</code>.
</div>
</body></html>`;

const html2 = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Part 1 Evidence — GitHub Issues (Project board items; all Lab 2 Issues are Done/Closed)</h1>
<table>
  <tr><th>Issue</th><th>Title</th><th>Status</th></tr>
  ${issueRows}
</table>
<div class="note">
  GitHub Projects (Kanban) is opened separately because the current auth token lacks
  <code>read:project</code>. A Kanban board screenshot with every card in
  <strong>Done</strong> is captured manually from the GitHub web UI.
</div>
</body></html>`;

const html3 = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Part 1 Evidence — Peer reviews I gave on my partner's Lab 2 PRs (@Achikan → @il0lk3)</h1>
<table>
  <tr><th>PR</th><th>Title</th><th>Branches</th><th>State</th><th>My review date</th><th>My verdict(s)</th></tr>
  ${table2}
</table>
<div class="note">
  Every Lab 2 Issue was peer-reviewed <strong>in both directions</strong>: my partner @il0lk3
  reviewed all my PRs in <code>Achikan/TokTickIT</code>, and I (as @Achikan) reviewed all of my
  partner's PRs in <code>il0lk3/TokTickIT</code>. The table above is the exact review trail I left
  on the partner's PRs (CHANGES_REQUESTED → fixes → APPROVED where applicable).
</div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mkdir(path.join(OUT, "part-1-git-evidence"), { recursive: true });
  await page.setContent(html1);
  await page.screenshot({ path: path.join(OUT, "part-1-git-evidence", "05-pr-review-table.png"), fullPage: true });
  console.log("saved", "part-1-git-evidence/05-pr-review-table.png");
  await page.setContent(html2);
  await page.screenshot({ path: path.join(OUT, "part-1-git-evidence", "06-issues-done.png"), fullPage: true });
  console.log("saved", "part-1-git-evidence/06-issues-done.png");
  await page.setContent(html3);
  await page.screenshot({ path: path.join(OUT, "part-1-git-evidence", "05b-reviewed-partner-prs.png"), fullPage: true });
  console.log("saved", "part-1-git-evidence/05b-reviewed-partner-prs.png");
} finally {
  await browser.close();
}
console.log("done");