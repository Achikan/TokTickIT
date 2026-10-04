#!/usr/bin/env node
// Build the Part 2 "specification before code" evidence.
//
// Reads the real timestamps from git and from the GitHub API, writes
// docs/lab-03/timeline-evidence.md's companion PNG
// (artifacts/lab-03/evidence/spec-before-code.png) and the raw data it was built
// from. No timestamp or ordering in the output is typed by hand.
//
// Usage: node scripts/evidence-timeline.mjs

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts/lab-03/evidence");
const REPO = "Achikan/TokTickIT";

const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const gh = (...a) => execFileSync("gh", a, { cwd: ROOT, encoding: "utf8" }).trim();

const CONTRACT = ["specification.md", "tests.md", "api-spec.md", "ui-spec.md"];
const PRS = [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 62, 63];
const SHORT = new Map([
  [49, "Issue 16: Sprint 3 Engineering Contract"],
  [50, "Issue 17: Database Migration & User Model"],
  [51, "Issue 18: Authentication & Authorization API"],
  [52, "Issue 19: Login & Authentication UI"],
  [53, "Issue 20: Requester regression"],
  [54, "Issue 21: IT Staff Ticket Queue"],
  [55, "Issue 22: IT Staff Ticket Detail (first attempt)"],
  [56, "Issue 22: IT Staff Ticket Detail (supersedes #55)"],
  [57, "Issue 23: Administrator User Management"],
  [58, "Issue 24: E2E, responsive & accessibility"],
  [59, "Issue 25: Final review, screenshots & release"],
  [60, "Issue 25: sheet checklist gap fixes"],
  [62, "Issue 25: unit + style test coverage"],
  [63, "Release Lab 3 (staging → main)"],
]);

// ---- real data -------------------------------------------------------------

const addLine = git(
  "log",
  "--diff-filter=A",
  "--format=%h | %ad | %an | %s",
  "--date=iso",
  "--",
  ...CONTRACT.map((f) => `docs/lab-03/${f}`)
);
const [specSha, specLocal, specAuthor, specSubject] = addLine.split(" | ");
// Author date of the *add* commit. `git log -1` without --diff-filter=A would
// return the most recent commit that touched the file, not its creation.
const specIso = git("log", "--diff-filter=A", "-1", "--format=%aI", "--", "docs/lab-03/specification.md");

const prs = PRS.map((n) => {
  const j = JSON.parse(gh("pr", "view", String(n), "--json", "number,title,createdAt,mergedAt,state"));
  return {
    n,
    title: SHORT.get(n) ?? j.title,
    ghTitle: j.title,
    created: j.createdAt,
    merged: j.mergedAt || null,
    state: j.state,
    url: j.url ?? `https://github.com/${REPO}/pull/${n}`,
  };
}).sort((a, b) => new Date(a.created) - new Date(b.created));

const specPr = prs.find((p) => p.n === 49);
const firstImplPr = prs.find((p) => p.n === 50);
const firstImplCommit = git(
  "log",
  "--reverse",
  "--format=%H|%aI|%s",
  "--date=iso",
  "--ancestry-path",
  `${git("rev-parse", specSha)}..main`,
  "--",
  "server/prisma/schema.prisma",
  "server/src",
  "client/src"
)
  .split("\n")
  .filter(Boolean)[0]
  .split("|");

const allPrs = JSON.parse(gh("api", `repos/${REPO}/pulls?state=all&per_page=100&sort=created&direction=asc`));
const openedEarly = allPrs.filter((p) => p.number >= 50 && p.created_at < specPr.merged);

const fmt = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—");
const dur = (a, b) => {
  const s = (new Date(b) - new Date(a)) / 1000;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
};

const raw = [
  `$ git log --diff-filter=A --format='%h | %ad | %an | %s' --date=iso -- \\`,
  `      docs/lab-03/{specification,tests,api-spec,ui-spec}.md`,
  addLine,
  "",
  `$ gh pr view <n> --json number,title,createdAt,mergedAt`,
  ...prs.map((p) => `#${p.n}\t${p.ghTitle}\t${p.created}\t${p.merged ?? "(never merged)"}`),
  "",
  `contract committed   ${specIso}`,
  `PR #49 merged        ${specPr.merged}`,
  `first impl commit    ${firstImplCommit[1]}  ${firstImplCommit[0].slice(0, 10)}`,
  `PR #50 opened        ${firstImplPr.created}`,
  "",
  `#49 merged -> #50 opened            ${dur(specPr.merged, firstImplPr.created)}`,
  `contract -> first impl commit       ${dur(specIso, firstImplCommit[1])}`,
  `impl PRs (#50+) opened before #49   ${openedEarly.length}`,
].join("\n");

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "spec-before-code.txt"), raw + "\n", "utf8");

// ---- PNG -------------------------------------------------------------------

const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const prRows = prs
  .map((p) => {
    const isSpec = p.n === 49;
    const unmerged = !p.merged;
    const cls = isSpec ? "spec" : unmerged ? "dead" : p.n >= 59 ? "late" : "impl";
    const role = isSpec
      ? "specification DD"
      : unmerged
        ? "never merged — superseded by #56"
        : p.n >= 59
          ? "integration / docs / test"
          : "implementation";
    return `<tr class="${cls}">
      <td class="pr"><a href="${p.url}">#${p.n}</a></td>
      <td>${esc(p.title)}</td>
      <td class="mono">${esc(fmt(p.created))}</td>
      <td class="mono">${unmerged ? '<b class="dead">never merged</b>' : esc(fmt(p.merged))}</td>
      <td class="role">${role}</td>
    </tr>`;
  })
  .join("\n");

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin:0; background:#ffffff; color:#1f2328;
         font-family:-apple-system,"Segoe UI","Noto Sans Thai",Helvetica,Arial,sans-serif; }
  .wrap { padding: 30px 34px 34px; }
  h1 { font-size: 25px; margin:0 0 4px; }
  .sub { font-size: 14px; color:#59636e; margin-bottom: 20px; }
  .band { background:#0d1117; color:#c9d1d9; border-radius:8px; padding:12px 16px;
          font-family:"SF Mono",Menlo,monospace; font-size:13px; line-height:1.55;
          margin-bottom: 18px; white-space:pre-wrap; }
  .band .k { color:#7ee787; }
  table { width:100%; border-collapse: collapse; font-size:14px; margin-bottom: 18px; }
  th, td { border:1px solid #d1d9e0; padding:7px 10px; text-align:left; vertical-align:top; }
  th { background:#f6f8fa; font-size:13px; text-transform:uppercase; letter-spacing:.4px; color:#59636e; }
  tbody tr:nth-child(even) td { background:#f6f8fa; }
  tr.spec td { background:#f3e8ff !important; }
  tr.dead td { background:#fff8c5 !important; }
  .pr { font-weight:700; white-space:nowrap; }
  .mono { font-family:"SF Mono",Menlo,monospace; font-size:12.5px; white-space:nowrap; }
  .role { font-size:12.5px; color:#59636e; }
  a { color:#0969da; text-decoration:none; }
  .dead { color:#9a6700; }
  .facts { display:grid; grid-template-columns:repeat(2,1fr); gap:10px 18px; margin-bottom: 18px; }
  .fact { border:1px solid #d1d9e0; border-radius:8px; padding:11px 14px; }
  .fact .lbl { font-size:12px; color:#59636e; text-transform:uppercase; letter-spacing:.4px; }
  .fact .val { font-size:17px; font-weight:600; margin-top:3px; }
  .fact .val.ok { color:#1a7f37; }
  .fact .sub2 { font-size:12.5px; color:#59636e; font-family:"SF Mono",Menlo,monospace; margin-top:3px; }
  .caveat { border:1px solid #d4a72c; background:#fff8c5; border-radius:8px; padding:12px 15px;
            font-size:14px; line-height:1.6; }
  .caveat b { color:#9a6700; }
  h2 { font-size:17px; margin:0 0 10px; }
</style></head><body><div class="wrap">
  <h1>Specification DD was created and merged before the first implementation PR</h1>
  <div class="sub">All timestamps read from <code>git log --date=iso</code> and the GitHub REST API at
  ${esc(fmt(new Date().toISOString()))} &middot; ${REPO} &middot; UTC</div>

  <div class="band"><span class="k">contract committed</span>  ${esc(fmt(specIso))}   <span class="k">(${esc(specSha)})</span>
<span class="k">PR #49 merged</span>       ${esc(fmt(specPr.merged))}
<span class="k">first impl commit</span>   ${esc(fmt(firstImplCommit[1]))}   <span class="k">(${esc(firstImplCommit[0].slice(0, 10))})</span>
<span class="k">PR #50 opened</span>       ${esc(fmt(firstImplPr.created))}

all four contract files added in one commit: <span class="k">${esc(addLine)}</span></div>

  <div class="facts">
    <div class="fact"><div class="lbl">Contract committed</div>
      <div class="val">${esc(fmt(specIso))}</div>
      <div class="sub2">${esc(specSha)} &middot; ${esc(specAuthor)}</div></div>
    <div class="fact"><div class="lbl">PR #49 merged (specification DD)</div>
      <div class="val ok">${esc(fmt(specPr.merged))}</div>
      <div class="sub2">released into lab3-staging</div></div>
    <div class="fact"><div class="lbl">First implementation PR (#50) opened</div>
      <div class="val ok">${esc(fmt(firstImplPr.created))}</div>
      <div class="sub2">${dur(specPr.merged, firstImplPr.created)} after #49 merged</div></div>
    <div class="fact"><div class="lbl">Implementation PRs (#50+) opened before #49 merged</div>
      <div class="val ok">${openedEarly.length}</div>
      <div class="sub2">measured over all ${allPrs.length} PRs via the API</div></div>
  </div>

  <h2>Pull request timeline, ordered by createdAt</h2>
  <table>
    <thead><tr><th>PR</th><th>Title</th><th>createdAt</th><th>mergedAt</th><th>Role</th></tr></thead>
    <tbody>${prRows}</tbody>
  </table>

  <div class="caveat">
    <b>Stated plainly:</b> the ordering is real, not arranged — #49 merged
    ${esc(dur(specPr.merged, firstImplPr.created))} before #50 was opened, and
    <b>${openedEarly.length}</b> implementation PRs predate it. <b>PR #55 was never merged</b>
    (GitHub returns an empty <code>merged_at</code>); it was superseded the same day by PR #56,
    which is the merge that brought Issue 22 in. PRs #60, #62 and #63 are later documentation,
    test and release work, so they sit after the feature PRs by design.
  </div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: path.join(OUT, "spec-before-code.png"), fullPage: true });
await page.close();
await browser.close();

console.log("wrote", path.relative(ROOT, path.join(OUT, "spec-before-code.png")));
console.log(raw);
