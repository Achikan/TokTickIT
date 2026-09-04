#!/usr/bin/env node
import { chromium } from "@playwright/test";

const htmlPath = process.argv[2];
const pdfPath = process.argv[3];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.emulateMedia({ media: "print" });
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  const title = await page.title();
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    displayHeaderFooter: true,
    headerTemplate:
      '<div style="font-size:8px;color:#888;width:100%;text-align:center;padding:2mm 0;">' +
      title +
      "</div>",
    footerTemplate:
      '<div style="font-size:8px;color:#888;width:100%;text-align:center;">Page <span class="pageNumber"/></div>',
  });
  console.log("PDF written:", pdfPath);
} finally {
  await browser.close();
}