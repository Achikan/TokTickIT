// Renders Lab 3 test logs (.txt) into readable PNG screenshots with Playwright.
//
// Issue 25 follow-up — the Lab 3 sheet (Part 3, 10 points) requires actual
// terminal output captured from main, not a hand-written results table. Each
// capture shows the main commit header, the per-file pass lines and the final
// summary lines (Test Files / Tests / Duration). When a log is too tall to be
// readable on one page, the script slices a window around the summary and
// records what was trimmed.
//
// Usage: node scripts/render-test-logs.mjs

import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts/lab-03/test-output");
const PNG_OUT = path.join(OUT, "png");

const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// ANSI-free colouring by classification, so the palette matches the Zen Green
// tokens used elsewhere in the Lab 3 evidence.
const colorize = (line) => {
  const t = esc(line);
  if (/^ (Test Files|Tests|Duration|Start at)/.test(line)) return `<span class="sum">${t}</span>`;
  if (/^ [0-9]+ passed/.test(line) || /passed \(/.test(line)) return `<span class="ok">${t}</span>`;
  if (/\bfailed\b|\bFAIL\b|✗|×/.test(line)) return `<span class="bad">${t}</span>`;
  if (/\bskipped\b|\btodo\b|\bpending\b/.test(line)) return `<span class="warn">${t}</span>`;
  if (/^(main commit|Command|Branch|Lab 3|=====|-----|RUN | RUN|>) /.test(line)) {
    return `<span class="hdr">${t}</span>`;
  }
  if (/^\s*[✓✔]/.test(line)) return `<span class="ok">${t}</span>`;
  return t;
};

const pageHtml = (title, body, trimNote) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #0d1117; color: #c9d1d9;
         font-family: "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace; }
  .wrap { padding: 28px 32px; }
  h1 { font-size: 21px; margin: 0 0 4px; color: #7ee787; letter-spacing: .3px; }
  .sub { font-size: 13px; color: #8b949e; margin-bottom: 16px; }
  .trim { font-size: 12px; color: #d29922; border: 1px solid #9e6a03; background: #1c1500;
          border-radius: 6px; padding: 7px 10px; margin-bottom: 14px; }
  pre { margin: 0; font-size: 14px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
  .ok { color: #7ee787; } .bad { color: #ff7b72; } .warn { color: #d29922; }
  .sum { color: #79c0ff; font-weight: 600; } .hdr { color: #d2a8ff; }
</style></head><body><div class="wrap">
  <h1>${esc(title)}</h1>
  <div class="sub">Lab 3 — captured from <code>main</code> · TokTickIT</div>
  ${trimNote ? `<div class="trim">${esc(trimNote)}</div>` : ""}
  <pre>${body}</pre>
</div></body></html>`;

// Keep the header block (main commit + command) plus the file/summary lines.
// Long per-test runs are trimmed so the result stays readable without zooming.
const MAX_BODY_LINES = 46;

function pickLines(lines) {
  const isHeader = (l, i) => i < 12;
  const isSummary = (l) =>
    /^\s*(Test Files|Tests|Duration|Start at|RUN\s+|>|\d+ passed|\d+ failed)/.test(l);
  const isFileLine = (l) => /^\s*[✓✔✗×❯↓]/.test(l) || /^\s*(FAIL|PASS)\b/.test(l);

  const header = lines.slice(0, Math.min(12, lines.length));
  const fileLines = lines.filter(isFileLine);
  const summaryLines = lines.filter(isSummary);
  const summaryTail = lines.slice(-14);

  // Preferred: header + file lines + tail (captures the Test Files/Tests/Duration block).
  const body = [...header, "", ...(fileLines.length ? fileLines : []), "", "...", "", ...summaryTail];
  const seen = new Set();
  const uniq = [];
  for (const l of body) {
    if (l.trim() === "..." && uniq[uniq.length - 1]?.trim() === "...") continue;
    if (l.trim() !== "" && seen.has(l)) continue;
    if (l.trim() !== "") seen.add(l);
    uniq.push(l);
  }

  let trimNote = "";
  if (uniq.length > MAX_BODY_LINES) {
    // Drop middle per-test noise from the file-line block first.
    const kept = uniq.slice(0, 8).concat(["... [" + (uniq.length - 20) + " per-test lines trimmed] ..."], uniq.slice(-12));
    const dropped = uniq.length - kept.length;
    trimNote =
      `Trimmed ${dropped} per-test lines (kept: header, main commit, every passing test file, ` +
      `and the final Test Files / Tests / Duration summary). Full untrimmed log: artifacts/lab-03/test-output/*.txt`;
    return { lines: kept, trimNote };
  }
  return { lines: uniq, trimNote };
}

// The 4th flag renders the log in full. Used for 00-full-summary.txt, which is
// already a curated summary — slicing it would hide the totals it exists to show.
const JOBS = [
  ["01-unit.txt", "01-unit.png", "Lab 3 · UNIT tests", false],
  ["02-api.txt", "02-api.png", "Lab 3 · API / integration tests", false],
  ["03-authorization.txt", "03-authorization.png", "Lab 3 · Authorization / role-gate tests", false],
  ["04-regression.txt", "04-regression.png", "Lab 3 · Migration & regression tests", false],
  ["05-ui-component.txt", "05-ui-component.png", "Lab 3 · UI component + UI style tests", false],
  ["06-e2e.txt", "06-e2e.png", "Lab 3 · End-to-end, responsive & accessibility tests", false],
  ["00-full-summary.txt", "00-full-summary.png", "Lab 3 · FULL test summary (server + client + e2e)", true],
];

await mkdir(PNG_OUT, { recursive: true });
const browser = await chromium.launch();
const notes = [];

for (const [src, out, title, full] of JOBS) {
  const raw = await readFile(path.join(OUT, src), "utf8");
  const { lines: body, trimNote } = full
    ? { lines: raw.split("\n").filter((l, i, a) => l.trim() !== "" || i < a.length - 1), trimNote: "" }
    : pickLines(raw.split("\n"));
  const html = pageHtml(title, body.map(colorize).join("\n"), trimNote);
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  await page.setContent(html);
  const target = path.join(PNG_OUT, out);
  await page.screenshot({ path: target, fullPage: true });
  await page.close();
  notes.push(`| ${out} | ${src} | ${trimNote ? trimNote.split(".")[0] + "." : "shown in full"} |`);
  console.log("saved", path.relative(ROOT, target), trimNote ? "(trimmed)" : "");
}

await browser.close();
await writeFile(
  path.join(OUT, "CAPTIONS.md"),
  "# Test-output captures\n\n" +
    "Every PNG below is a render of the matching `.txt` in this folder, captured from `main` " +
    "(`d3e2be4`, Merge pull request #63). No result in this folder was written by hand.\n\n" +
    "| PNG | Source log | Note |\n|---|---|---|\n" +
    notes.join("\n") +
    "\n",
  "utf8"
);
console.log("\nDone —", JOBS.length, "PNGs in", path.relative(ROOT, PNG_OUT));
