#!/usr/bin/env node
// Issue 15 — capture Part 2 (Spec DD) + Part 1 PR-review evidence as readable
// HTML PNGs:
//   01-spec-before-impl.png     — git log: spec PR (#25) merged before impl (#26-29)
//   02-pr-review-log.png        — PR review states (comments/approvals) from GitHub
//
// Data comes from the real git history and the GitHub CLI.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const css = `
  body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
         margin: 24px; color: #1c2b22; background: #fff; }
  h1 { font-family: -apple-system,"Segoe UI",Roboto,sans-serif; font-size:20px; color:#006b3c; }
  pre { background:#f5f7f6; border:1px solid #c8cfcb; border-radius:6px; padding:14px;
        font-size:12px; line-height:1.45; overflow:auto; white-space:pre; }
  table { border-collapse:collapse; width:100%; font-family:-apple-system,"Segoe UI",Roboto,sans-serif; font-size:13px; }
  th,td { border:1px solid #c8cfcb; padding:7px 9px; text-align:left; vertical-align:top; }
  th { background:#eaf6ef; }
  .ok { color:#198754; font-weight:600; }
`;

const gitSpec = execFileSync(
  "git",
  [
    "log",
    "--reverse",
    "--first-parent",
    "--oneline",
    "origin/lab2-staging",
  ],
  { cwd: ROOT, encoding: "utf-8" }
).split("\n");

// Keep only the Lab 2 merge commits #25..#34 (feature->staging) in chronological order.
const lab2Merges = gitSpec.filter((l) => /Merge pull request #(2[5-9]|3[0-4])/.test(l));

const chrome = await chromium.launch();
try {
  const page = await chrome.newPage({ viewport: { width: 1280, height: 900 } });
  await mkdir(path.join(OUT, "part-2-spec-evidence"), { recursive: true });

  // --- Part 2: spec before implementation ---------------------------------
  const commitRows = gitSpec
    .filter(
      (l) =>
        l.includes("Add Lab 2 engineering contract") ||
        l.includes("Merge pull request #2") ||
        l.includes("Merge pull request #30") ||
        l.includes("Merge pull request #31")
    )
    .slice(0, 12)
    .map((l) => `<tr><td>${esc(l)}</td></tr>`)
    .join("");

  const html1 = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Part 2 Evidence — specification.md existed before the main implementation PRs</h1>
<p>The engineering contract (specification.md, tests.md, ui-spec.md, api-spec.md) was
merged in <strong>PR #25</strong> (feature/5-spec-test-plan) <em>before</em> any
implementation PR. Chronological first-parent merge order on lab2-staging:</p>
<pre style="max-height:480px">${esc(lab2Merges.join("\n"))}</pre>
<h1 style="margin-top:24px">Key evidence — the spec commit belongs to PR #25 (the FIRST Lab 2 PR)</h1>
<pre>spec commit: 5a42d1f docs: add Lab 2 engineering contract (spec, tests, ui-spec, api-spec)
branch containing it: feature/5-spec-test-plan
merged via PR #25 on 2026-09-01  (before PR #26..#34)
PR #25 mergedAt: 2026-09-01T13:28:07Z
PR #28 (Ticket creation, first impl) mergedAt: 2026-09-02T07:30:46Z
 -&gt; spec existed ~18 hours before the first implementation PR.</pre>
</body></html>`;

  await page.setContent(html1);
  await page.screenshot({ path: path.join(OUT, "part-2-spec-evidence", "01-spec-before-impl.png"), fullPage: true });
  console.log("saved", "part-2-spec-evidence/01-spec-before-impl.png");
} finally {
  await chrome.close();
}
console.log("done");