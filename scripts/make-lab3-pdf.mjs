#!/usr/bin/env node
// Build the Lab 3 report PDF from docs/lab-03/report.md.
// Steps: pandoc markdown -> self-contained HTML, then Chromium (Playwright) print to A4.
// Output: docs/lab-03/report_lab03_67070505229.pdf (canonical) and, mirroring Lab 2,
// a copy at docs/report_lab03_67070505229.pdf.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs", "lab-03");
const tmp = mkdtempSync(path.join(tmpdir(), "lab3-report-"));
const html = path.join(tmp, "report.html");
const pdfPandoc = path.join(tmp, "report.pdf");

execFileSync(
  "pandoc",
  ["report.md", "-o", html, "--standalone", "--metadata", "title=Lab 3 Report", "--embed-resources"],
  { cwd: docsDir, stdio: "inherit" }
);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("file://" + html);
await page.pdf({
  path: pdfPandoc,
  format: "A4",
  printBackground: true,
  margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
});
await browser.close();

for (const target of [
  path.join(docsDir, "report_lab03_67070505229.pdf"),
  path.join(root, "docs", "report_lab03_67070505229.pdf"),
]) {
  copyFileSync(pdfPandoc, target);
  console.log("PDF written to", path.relative(root, target));
}
writeFileSync(path.join(tmp, ".gitkeep"), "");
void tmp;