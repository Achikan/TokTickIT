#!/usr/bin/env node
// Build the Lab 3 submission PDF from docs/lab-03/report.md.
//
//   node scripts/build-report.mjs            # full build
//   QUALITY=70 node scripts/build-report.mjs # smaller file, softer images
//   KEEP_ASSETS=1 node scripts/build-report.mjs
//
// Pipeline
//   1. pandoc: report.md -> a single self-contained HTML document.
//   2. Chromium: every embedded PNG is re-encoded (downscaled to print resolution and
//      saved as JPEG) so the PDF stays small without making UI text unreadable. Very
//      tall stitched captures are sliced so each slice still prints at A4 width.
//   3. Chromium print: A4 with a cover page, a clickable contents page, running header
//      and footer, 2-4 figures per page, and no figure or table split across pages.
//   4. Self-check with pypdf: page count, file size, per-page image counts, and that
//      "Answer Part 1..9" appear in order with clickable link annotations.
//
// Outputs (git-ignored): docs/lab-03/report_lab03_67070505229.pdf and
// docs/report_lab03_67070505229.pdf. Derived images land in artifacts/lab-03/pdf-assets/.
import { chromium } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs", "lab-03");
const ASSETS = path.join(ROOT, "artifacts", "lab-03", "pdf-assets");
const WORK = path.join(ASSETS, ".work");
const STUDENT_ID = "67070505229";

// Print geometry (A4 = 210 x 297 mm).
const PAGE = { width: "210mm", height: "297mm" };
const MARGIN = { top: "16mm", bottom: "14mm", left: "13mm", right: "13mm" };
const CONTENT_MM = 297 - MARGIN.top - MARGIN.bottom; // 267mm of usable height

// Figure height budget. Two 100mm figures plus captions fit on one page with room for
// a line of text; four 58mm figures fit on a page of pure evidence.
const FIG = { tall: 115, large: 90, medium: 70, small: 50 };
const MAX_WIDTH_PX = Number(process.env.MAX_WIDTH ?? 1040); // ≈ 142 dpi at 186mm of printable width
const QUALITY = Number(process.env.QUALITY ?? 64);
// Anything taller than this is sliced, so each slice still prints at A4 width
// instead of shrinking to an unreadable column.
const SLICE_ASPECT = 1.75;

const studentName = "อชิรญา อินตา (Achiraya Intha)";
const reviewerName = "ธนากร พหุลรัตน์ (Thanakorn Phahulrat) — 67070505217";

fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

// --- 1. markdown -> html ------------------------------------------------------

// pandoc runs with cwd = docs/lab-03 so the report's relative image paths
// (../../artifacts/...) resolve against the markdown, not against this script.
const pandocHtml = path.join(WORK, "report.html");
const rawMd = fs.readFileSync(path.join(DOCS, "report.md"), "utf8");
execFileSync(
  "pandoc",
  [
    "report.md",
    // implicit_figures off: this script owns the <figure>/<figcaption> so the
    // height caps and captions are applied exactly once per image.
    "-f",
    "markdown-implicit_figures",
    "-o",
    pandocHtml,
    "--standalone",
    "--metadata",
    "title=Lab 3 Report",
    "--wrap=none",
  ],
  { cwd: DOCS, stdio: "inherit" }
);
let html = fs.readFileSync(pandocHtml, "utf8");

// --- 2. cover page + clickable contents ---------------------------------------

const partHeadings = [...rawMd.matchAll(/^##\s+Answer Part (\d+):\s*(.+)$/gm)].map((m) => ({
  part: m[1],
  title: m[2].trim(),
  id: `part-${m[1]}`,
}));

const STYLE = `
:root { --ink: #14201a; --muted: #4a5a52; --line: #d7e2db; --green: #006b3c; --green-2: #0b7a46; }
@page { size: ${PAGE.width} ${PAGE.height}; margin: ${MARGIN.top} ${MARGIN.right} ${MARGIN.bottom} ${MARGIN.left}; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: "Noto Sans Thai", "Thonburi", "Helvetica Neue", Arial, sans-serif;
  font-size: 9.6pt; line-height: 1.45; color: var(--ink); margin: 0; counter-reset: fig;
}
h1 { font-size: 19pt; line-height: 1.2; margin: 0 0 4mm; }
h2 { font-size: 14.5pt; color: var(--green); border-bottom: 1.6pt solid var(--green);
     padding-bottom: 1.6mm; margin: 6mm 0 3mm; break-after: avoid; break-inside: avoid; }
h3 { font-size: 11.4pt; color: var(--green-2); margin: 4mm 0 1.6mm; break-after: avoid; break-inside: avoid; }
h4 { font-size: 10.2pt; margin: 3mm 0 1.2mm; break-after: avoid; }
p, li { orphans: 2; widows: 2; }
a { color: var(--green-2); }
code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 8.6pt;
       background: #eef3ef; padding: 0 0.6mm; border-radius: 1mm; word-break: break-word; }
pre { font-size: 8.4pt; background: #f4f7f6; border: 0.5pt solid var(--line); border-radius: 1.5mm;
      padding: 2mm 2.4mm; white-space: pre-wrap; word-break: break-word; break-inside: avoid; }
blockquote { border-left: 2pt solid var(--green-2); background: #f2f7f4; margin: 2.5mm 0;
             padding: 1.8mm 2.6mm; break-inside: avoid; }
table { border-collapse: collapse; width: 100%; font-size: 8.5pt; margin: 2mm 0 3mm; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td { border: 0.5pt solid var(--line); padding: 1.1mm 1.6mm; text-align: left; vertical-align: top; }
th { background: #e8f1ec; font-weight: 600; }
hr { border: 0; border-top: 0.8pt solid var(--line); margin: 5mm 0; }

/* Figures: never split, always captioned, sized from the class the builder assigns. */
figure {
  break-inside: avoid; page-break-inside: avoid; margin: 0 0 3.2mm; padding: 0;
  text-align: center; counter-increment: fig;
}
figure img {
  display: block; margin: 0 auto; width: auto; height: auto;
  max-width: 100%; border: 0.5pt solid var(--line);
}
figure.tall img   { max-height: ${FIG.tall}mm; }
figure.large img  { max-height: ${FIG.large}mm; }
figure.medium img { max-height: ${FIG.medium}mm; }
figure.small img  { max-height: ${FIG.small}mm; }
figcaption { font-size: 7.6pt; color: var(--muted); margin-top: 1.1mm; }
figcaption::before { content: "Figure " counter(fig) " — "; font-weight: 600; color: var(--green); }

/* Cover + contents */
.cover { height: ${CONTENT_MM}mm; display: flex; flex-direction: column; justify-content: center;
         break-after: page; page-break-after: always; text-align: center; }
.cover .kicker { font-size: 10pt; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.cover h1 { font-size: 26pt; margin: 6mm 0 2mm; }
.cover .subtitle { font-size: 13pt; color: var(--green); margin-bottom: 10mm; }
.cover .meta { display: inline-block; text-align: left; font-size: 10.5pt; line-height: 1.7;
              border: 0.8pt solid var(--line); border-radius: 2mm; padding: 5mm 7mm; background: #fbfdfc; }
.cover .meta b { color: var(--green); }
.cover .foot { margin-top: 12mm; font-size: 8.6pt; color: var(--muted); }
.contents { break-after: page; page-break-after: always; }
.contents ol { list-style: none; padding: 0; margin: 0; counter-reset: none; }
.contents li { margin: 0 0 2.4mm; font-size: 10.4pt; }
.contents .num { display: inline-block; min-width: 12mm; font-weight: 700; color: var(--green); }
.hint { font-size: 8.4pt; color: var(--muted); }
`;

const cover = `
<section class="cover">
  <p class="kicker">CPE 334 — Software Engineering Laboratories</p>
  <h1>Lab 3 Report</h1>
  <p class="subtitle">TokTickIT — Users, Roles, IT Staff Ticketing and Admin Screens</p>
  <div class="meta">
    <div><b>Author</b> — ${studentName}</div>
    <div><b>Student ID</b> — ${STUDENT_ID}</div>
    <div><b>Peer reviewer</b> — ${reviewerName}</div>
    <div><b>GitHub</b> — <a href="https://github.com/Achikan/TokTickIT">github.com/Achikan/TokTickIT</a></div>
    <div><b>Section</b> — 1 &nbsp;·&nbsp; <b>Branch</b> — docs/lab3-test-evidence</div>
    <div><b>Built</b> — ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC from <code>docs/lab-03/report.md</code></div>
  </div>
  <p class="foot">Nine answers follow in order: Part 1 Git workflow · Part 2 Spec DD · Part 3 Test DD ·
  Part 4 AI use · Part 5 Login · Part 6 Staff queue · Part 7 Staff detail · Part 8 User management ·
  Part 9 Zen Green UI and visual checklist</p>
</section>
<section class="contents">
  <h2>Contents</h2>
  <ol>
    ${partHeadings
      .map(
        (p) =>
          `<li><a href="#${p.id}"><span class="num">Answer Part ${p.part}:</span> ${p.title}</a></li>`
      )
      .join("\n    ")}
  </ol>
  <p class="hint">Every part heading is a clickable internal link. The page footer carries the page
  number and the total, and every <code>https://</code> link in the report stays clickable in the PDF.</p>
</section>
`;

// Give every part heading a stable anchor for the contents links. Pandoc's own id
// is replaced rather than added: a second id attribute would leave the browser
// resolving #part-N to nothing, and Chromium then drops the link annotation.
for (const p of partHeadings) {
  const before = html;
  html = html.replace(
    new RegExp(`<h2 id="[^"]*">Answer Part ${p.part}:`),
    `<h2 id="${p.id}">Answer Part ${p.part}:`
  );
  if (html === before) {
    html = html.replace(
      new RegExp(`(<h2[^>]*>)Answer Part ${p.part}:`),
      `<h2 id="${p.id}">Answer Part ${p.part}:`
    );
  }
  if (html === before) throw new Error(`could not anchor "Answer Part ${p.part}:"`);
}

html = html.replace("</head>", `<style>${STYLE}</style></head>`);
html = html.replace(/<body[^>]*>/, (m) => `${m}${cover}`);
// The page below is loaded from disk, so persist the cover/contents/anchors.
fs.writeFileSync(pandocHtml, html);

// --- 3. image pipeline + print ------------------------------------------------

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("file://" + path.join(WORK, "report.html"));

const figures = await page.evaluate(() =>
  [...document.images].map((img) => ({
    src: img.getAttribute("src"),
    alt: img.getAttribute("alt") ?? "",
  }))
);
console.log(`Found ${figures.length} images`);

const encoder = await browser.newPage();
await encoder.goto("about:blank");
await encoder.setContent("<body></body>");

// Re-encode one source image; tall images are returned as slices.
async function encode(absPath, base) {
  const dataUrl =
    "data:image/png;base64," + fs.readFileSync(absPath).toString("base64");
  return encoder.evaluate(
    async ({ src, maxWidth, quality, sliceAspect }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const w0 = img.naturalWidth;
      const h0 = img.naturalHeight;
      const draw = (sx, sy, sw, sh, ow, oh) => {
        const c = document.createElement("canvas");
        c.width = ow;
        c.height = oh;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, ow, oh);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
        return c.toDataURL("image/jpeg", quality);
      };
      const scale = Math.min(1, maxWidth / w0);
      const parts = [];
      if (h0 / w0 > sliceAspect) {
        const sliceH = Math.round(w0 * sliceAspect);
        const n = Math.ceil(h0 / sliceH);
        for (let i = 0; i < n; i += 1) {
          const sy = i * sliceH;
          const sh = Math.min(sliceH, h0 - sy);
          const ow = Math.round(w0 * scale);
          const oh = Math.max(1, Math.round(sh * scale));
          parts.push(draw(sy === 0 ? 0 : sy, sy, w0, sh, ow, oh));
        }
        return { parts, w: Math.round(w0 * scale), h: h0, sliced: n };
      }
      const ow = Math.round(w0 * scale);
      const oh = Math.max(1, Math.round(h0 * scale));
      return { parts: [draw(0, 0, w0, h0, ow, oh)], w: ow, h: oh, sliced: 0 };
    },
    { src: dataUrl, maxWidth: MAX_WIDTH_PX, quality: QUALITY / 100, sliceAspect: SLICE_ASPECT }
  );
}

let srcIndex = 0;
const manifest = [];
for (const fig of figures) {
  const rel = path.resolve(DOCS, fig.src.replace(/^file:\/\//, ""));
  if (!fs.existsSync(rel)) {
    console.warn(`  ! missing source, left as-is: ${fig.src}`);
    continue;
  }
  const stat = fs.statSync(rel);
  const { parts, w, h, sliced } = await encode(rel, path.basename(rel));
  const outFiles = [];
  for (let i = 0; i < parts.length; i += 1) {
    const b64 = parts[i].split(",")[1];
    const name = `${String(srcIndex).padStart(3, "0")}-${path
      .basename(rel, ".png")
      .replace(/[^a-z0-9-]+/gi, "-")}${parts.length > 1 ? `-s${i + 1}` : ""}.jpg`;
    const dest = path.join(ASSETS, name);
    fs.writeFileSync(dest, Buffer.from(b64, "base64"));
    outFiles.push(name);
  }
  manifest.push({
    source: path.relative(ROOT, rel),
    alt: fig.alt,
    out: outFiles,
    px: `${w}x${h}`,
    slices: sliced,
    srcKB: Math.round(stat.size / 1024),
    outKB: Math.round(outFiles.reduce((a, f) => a + fs.statSync(path.join(ASSETS, f)).size, 0) / 1024),
  });
  srcIndex += 1;
}
console.log(
  `Re-encoded ${manifest.length} images → ${manifest.reduce((a, m) => a + m.outKB, 0)} KB ` +
    `(from ${manifest.reduce((a, m) => a + m.srcKB, 0)} KB)`
);

// Swap sources, add figure wrappers, captions and height classes.
await page.evaluate(
  ({ manifest, assetsDir }) => {
    const images = [...document.images];
    manifest.forEach((m, i) => {
      let prev = null;
      m.out.forEach((name, k) => {
        const host = document.createElement("figure");
        host.className = "pending";
        const img = k === 0 ? images[i] : document.createElement("img");
        if (k > 0) img.alt = m.alt ? `${m.alt} (slice ${k + 1} of ${m.out.length})` : "";
        if (prev) prev.after(host);
        else images[i].before(host);
        host.appendChild(img);
        img.src = `file://${assetsDir}/${name}`;
        prev = host;
      });
      const cap = document.createElement("figcaption");
      cap.textContent =
        m.out.length > 1 ? `${m.alt || ""} (slice 1 of ${m.out.length})` : m.alt || "";
      prev.appendChild(cap);
    });  },
  { manifest, assetsDir: ASSETS }
);

await page.evaluate(
  ({ medium, large, tall, small }) => {
    const pick = (w, h) => {
      const a = h / w;
      if (a >= 1.35) return "tall";
      if (a >= 0.95) return "large";
      if (a >= 0.6) return "medium";
      return "small";
    };
    for (const img of document.images) {
      if (!img.naturalWidth) continue;
      const fig = img.closest("figure") ?? img.parentElement;
      fig.className = pick(img.naturalWidth, img.naturalHeight);
    }
  },
  FIG
);

if (process.env.LAYOUT_DEBUG) {
  const stats = await page.evaluate(() =>
    [...document.querySelectorAll("figure")].map((f) => ({
      cls: f.className,
      imgs: f.querySelectorAll("img").length,
      caps: f.querySelectorAll("figcaption").length,
      h: Math.round(f.getBoundingClientRect().height * 10) / 10,
      w: Math.round(f.getBoundingClientRect().width),
    }))
  );
  console.log("sample figures:", JSON.stringify(stats.slice(0, 6)));
  console.log("figures total:", stats.length, "images total:", await page.evaluate(() => document.images.length));
  const byClass = {};
  let total = 0;
  for (const f of stats) {
    byClass[f.cls] = byClass[f.cls] ?? { n: 0, sum: 0, max: 0 };
    byClass[f.cls].n += 1;
    byClass[f.cls].sum += f.h;
    byClass[f.cls].max = Math.max(byClass[f.cls].max, f.h);
    total += f.h;
  }
  console.log("figure heights (px @96dpi):", JSON.stringify(byClass));
  console.log(`total figure height ${Math.round(total)}px ≈ ${Math.round(total / 96 / 25.4)}mm of paper`);
}

// Keep captions with their figure and never orphan a heading.
await page.addStyleTag({
  content: `figure { break-inside: avoid; } h2, h3, h4 { break-after: avoid; }
            table { break-inside: auto; } tr { break-inside: avoid; }`,
});

const pdfPath = path.join(DOCS, `report_lab03_${STUDENT_ID}.pdf`);
const footerNote = `Lab 3 — TokTickIT — ${STUDENT_ID}`;
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-size:6.6pt;color:#6b7a72;width:100%;padding:0 13mm;
      display:flex;justify-content:space-between;border-bottom:0.4pt solid #d7e2db;">
      <span>${footerNote}</span><span>docs/lab-03/report.md</span></div>`,
  footerTemplate: `<div style="font-size:6.6pt;color:#6b7a72;width:100%;padding:0 13mm;
      display:flex;justify-content:space-between;">
      <span>Answer Parts 1–9 — clickable contents on page 2</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  margin: MARGIN,
});
await browser.close();

// Mirror the Lab 2 layout convention.
fs.copyFileSync(pdfPath, path.join(ROOT, "docs", `report_lab03_${STUDENT_ID}.pdf`));

fs.writeFileSync(
  path.join(ASSETS, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), quality: QUALITY, maxWidthPx: MAX_WIDTH_PX, sliceAspect: SLICE_ASPECT, figures: manifest }, null, 2)
);
if (!process.env.KEEP_ASSETS) fs.rmSync(WORK, { recursive: true, force: true });

const kb = Math.round(fs.statSync(pdfPath).size / 1024);
console.log(`\nPDF written: ${path.relative(ROOT, pdfPath)} (${kb} KB)`);

// --- 4. self-check ------------------------------------------------------------
const check = spawnSync(
  "python3",
  [
    path.join(ROOT, "scripts", "check-report-pdf.py"),
    pdfPath,
    path.join(ROOT, "docs", "lab-03", "report.md"),
    path.join(ASSETS, "manifest.json"),
  ],
  { stdio: "inherit" }
);
process.exitCode = check.status === 0 ? 0 : 1;