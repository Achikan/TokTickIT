#!/usr/bin/env node
// Render the Lab 3 markdown deliverables to PNGs so they can be embedded in the
// report itself, instead of only linking to them on GitHub.
//
// The sheet requires these files to be visible *inside* the report (Part 1:
// reviewer.md, Part 9: visual-inspection.md + ui-spec.md, Part 2: the spec). A
// bare GitHub link does not satisfy that, so each file is rendered to a
// GitHub-style page and screenshotted.
//
// Long documents are paginated on block boundaries (never mid-table-row or
// mid-sentence) so every page stays readable at 100% zoom in the printed PDF.
//
// Usage: node scripts/render-docs.mjs

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs", "lab-03");
const OUT = path.join(ROOT, "artifacts/lab-03/report-evidence");

// Page geometry. Width stays under the report's A4 text column so the PNG is not
// downscaled into illegibility when the PDF is built.
const PAGE_W = 1240;
const PAGE_H = 1754; // A4 at ~150dpi minus the header band
const HEADER_BAND = 96;

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #ffffff; color: #1f2328;
         font-family: -apple-system, "Segoe UI", "Noto Sans Thai", Helvetica, Arial, sans-serif;
         font-size: 16px; line-height: 1.6; }
  .page { width: ${PAGE_W}px; }
  .band { height: ${HEADER_BAND}px; display: flex; align-items: center; gap: 12px;
          padding: 0 40px; background: #0d1117; color: #ffffff; }
  .band .f { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 15px; color: #7ee787; }
  .band .t { font-size: 15px; color: #c9d1d9; margin-left: auto; }
  article { padding: 28px 40px 40px; }
  h1 { font-size: 30px; margin: 0 0 18px; padding-bottom: 10px; border-bottom: 1px solid #d1d9e0; }
  h2 { font-size: 23px; margin: 30px 0 12px; padding-bottom: 7px; border-bottom: 1px solid #d1d9e0; }
  h3 { font-size: 19px; margin: 24px 0 10px; }
  h4 { font-size: 17px; margin: 20px 0 8px; }
  p, li { font-size: 16px; }
  table { border-collapse: collapse; margin: 14px 0; font-size: 14.5px; width: 100%; }
  th, td { border: 1px solid #d1d9e0; padding: 7px 11px; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 600; }
  tr:nth-child(2n) td { background: #f6f8fa; }
  code { background: #eff1f3; padding: 2px 6px; border-radius: 6px;
         font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 14px; }
  pre { background: #f6f8fa; border: 1px solid #d1d9e0; border-radius: 8px;
        padding: 14px 16px; overflow: hidden; }
  pre code { background: none; padding: 0; font-size: 13.5px; }
  blockquote { margin: 14px 0; padding: 6px 16px; border-left: 4px solid #d1d9e0; color: #59636e; }
  a { color: #0969da; text-decoration: none; }
  hr { border: 0; border-top: 1px solid #d1d9e0; margin: 26px 0; }
  ol, ul { padding-left: 26px; }
`;

const JOBS = [
  {
    src: "reviewer.md",
    out: "part-1-git-evidence/07-rendered-reviewer-md",
    title: "docs/lab-03/reviewer.md",
    label: "Peer Review Record (Part 1)",
  },
  {
    src: "visual-inspection.md",
    out: "part-9-visual-evidence/01-rendered-visual-inspection-md",
    title: "docs/lab-03/visual-inspection.md",
    label: "Visual Inspection Checklist (Part 9)",
  },
  {
    src: "ui-spec.md",
    out: "part-9-visual-evidence/02-rendered-ui-spec-md",
    title: "docs/lab-03/ui-spec.md",
    label: "UI Specification (Part 9)",
  },
  {
    src: "specification.md",
    out: "part-2-spec-evidence/02-rendered-specification-md",
    title: "docs/lab-03/specification.md",
    label: "Specification DD (Part 2)",
  },
  {
    src: "api-spec.md",
    out: "part-2-spec-evidence/03-rendered-api-spec-md",
    title: "docs/lab-03/api-spec.md",
    label: "API Specification DD (Part 2)",
  },
  {
    src: "tests.md",
    out: "part-3-test-evidence/04-rendered-tests-md",
    title: "docs/lab-03/tests.md",
    label: "Test DD and Traceability (Part 3)",
  },
];

const tmp = mkdtempSync(path.join(tmpdir(), "lab3-docs-"));

async function renderOne(browser, job) {
  const raw = readFileSync(path.join(DOCS, job.src), "utf8");

  // Provenance header: which commit the rendered file came from. Keeps the
  // capture honest the same way the test logs do.
  let commit = "unknown";
  try {
    commit = execFileSync("git", ["log", "-1", "--format=%h %ad %s", "--date=short", "--", `docs/lab-03/${job.src}`], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    /* keep unknown */
  }

  const htmlFile = path.join(tmp, job.src.replace(/\.md$/, ".html"));
  execFileSync(
    "pandoc",
    [job.src, "-o", htmlFile, "--standalone", "--metadata", `title=${job.label}`, "--embed-resources"],
    { cwd: DOCS, stdio: "inherit" }
  );
  const body = readFileSync(htmlFile, "utf8");

  const shell = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="page">
  <div class="band"><span class="f">${job.title}</span><span class="t">${job.label} &middot; ${commit}</span></div>
  <article>${body.replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "")}</article>
</div></body></html>`;

  const page = await browser.newPage({ viewport: { width: PAGE_W, height: PAGE_H } });
  await page.setContent(shell, { waitUntil: "load" });

  // Slice at block boundaries so no table row or paragraph is cut in half.
  // If the final page ends up nearly empty, grow the page box and retry so the
  // document does not end with a 100px orphan page.
  const plan = await page.evaluate(
    ({ pageH, headerBand }) => {
      const article = document.querySelector("article");
      // Cut points: top-level blocks, plus every table row so a 90-row table is
      // split between rows instead of becoming one 5000px page.
      const cuts0 = Array.from(article.children).map((el) => el.offsetTop);
      for (const table of article.querySelectorAll("table")) {
        for (const row of table.rows) cuts0.push(row.offsetTop + table.offsetTop - article.offsetTop);
      }
      const tops = Array.from(new Set(cuts0.filter((t) => t > 0))).sort((a, b) => a - b);
      const total = article.scrollHeight;

      const slice = (h) => {
        const cuts = [0];
        let y = 0;
        while (y + h < total) {
          const target = y + h;
          let best = null;
          let bestDelta = Infinity;
          for (const t of tops) {
            if (t <= y) continue;
            const d = Math.abs(t - target);
            if (d < bestDelta) {
              bestDelta = d;
              best = t;
            }
          }
          if (best === null || best <= y) break;
          cuts.push(best);
          y = best;
        }
        return cuts;
      };

      let h = pageH;
      let cuts = slice(h);
      // Retry with a slightly taller box while the tail page is a near-empty
      // orphan. Row-level cut points keep the growth small.
      for (let i = 0; i < 6; i++) {
        const tail = total - cuts[cuts.length - 1];
        if (cuts.length < 2 || tail >= h * 0.4) break;
        h = Math.min(Math.round(h * 1.08), Math.round(pageH * 1.2));
        const next = slice(h);
        if (next.length >= cuts.length) break;
        cuts = next;
      }
      return { cuts, total, pageH: h, headerBand };
    },
    { pageH: PAGE_H - HEADER_BAND, headerBand: HEADER_BAND }
  );

  const outBase = path.join(OUT, job.out);
  mkdirSync(path.dirname(outBase), { recursive: true });

  const pages = [];
  for (let i = 0; i < plan.cuts.length; i++) {
    const top = plan.cuts[i] + plan.headerBand;
    const height = i + 1 < plan.cuts.length ? plan.cuts[i + 1] - plan.cuts[i] : plan.total - plan.cuts[i];
    const file =
      plan.cuts.length === 1 ? `${outBase}.png` : `${outBase}-p${i + 1}.png`;
    await page.screenshot({
      path: file,
      clip: { x: 0, y: top, width: PAGE_W, height },
      fullPage: true,
    });
    pages.push({ file, part: i + 1, of: plan.cuts.length });
  }

  const rel = path.relative(ROOT, outBase);
  console.log(
    `${job.src} -> ${plan.cuts.length} page(s)` +
      (plan.cuts.length === 1 ? ` (${path.basename(outBase)}.png)` : ` (${path.basename(outBase)}-p1..p${plan.cuts.length}.png)`)
  );
  await page.close();
  return { job, pages, rel, commit };
}

const browser = await chromium.launch();
const results = [];
for (const job of JOBS) results.push(await renderOne(browser, job));
await browser.close();

writeFileSync(
  path.join(OUT, "RENDERED-DOCS.md"),
  [
    "# Rendered markdown deliverables",
    "",
    "Each PNG below is a Playwright render of the markdown file named in the black",
    "header band, committed in `main`. Generated by `node scripts/render-docs.mjs`.",
    "",
    "| Render | Source file | Pages | Last commit touching the source |",
    "|---|---|---|---|",
    ...results.map(
      (r) =>
        `| ${r.job.label} | \`docs/lab-03/${r.job.src}\` | ${r.pages.length} | \`${r.commit}\` |`
    ),
    "",
  ].join("\n")
);
console.log("\nWrote", path.relative(ROOT, path.join(OUT, "RENDERED-DOCS.md")));
