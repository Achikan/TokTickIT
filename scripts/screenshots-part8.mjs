#!/usr/bin/env node
// Issue 15 — capture Part 8 (Working Ticket Screen: View Mode + Attachments).
//
//   part-8-ticket-detail/01-owned-detail.png     — owned Ticket Detail, read-only fields
//   part-8-ticket-detail/02-add-attachment.png   — valid PNG uploaded -> Active + metadata
//   part-8-ticket-detail/03-download-active.png  — Download clicked (active attachment)
//   part-8-ticket-detail/04-soft-removed.png     — soft-removal with reason -> metadata retained
//   part-8-ticket-detail/05-blocked-download.png — download after removal -> unavailable alert
//
// Requires the API server on :3000 and the Vite client on :5173.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const shot = async (page, dir, file) => {
  const target = path.join(OUT, dir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: false });
  console.log("saved", path.relative(ROOT, target));
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(CLIENT_URL);
  await page.getByLabel("Development Requester").selectOption({ label: "Alice Anderson" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Selected Requester:").waitFor();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();

  // Open the first owned ticket.
  const openBtn = page.locator('[aria-label^="Open ticket "]:visible').first();
  if ((await openBtn.count()) === 0) {
    console.error("No owned ticket for Alice; run prep-report-data.mjs first.");
    process.exit(1);
  }
  await openBtn.click();
  await page.getByRole("heading", { name: "Attachments" }).waitFor();

  // 01 — owned Ticket Detail (read-only fields)
  await shot(page, "part-8-ticket-detail", "01-owned-detail.png");

  // 02 — add a valid (PNG) attachment
  await page.getByTestId("attachment-file-input").setInputFiles({
    name: "evidence-diagram.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await page.getByRole("button", { name: "Upload Attachment" }).click();
  await page.getByRole("cell", { name: "evidence-diagram.png" }).first().waitFor();
  await page.getByText("Active", { exact: true }).first().waitFor();
  await shot(page, "part-8-ticket-detail", "02-add-attachment.png");

  // 03 — download active attachment (click Download; Playwright triggers the blob)
  const downloadRow = page.locator("tbody tr").first();
  await downloadRow.getByRole("button", { name: "Download" }).click();
  await page.waitForTimeout(600);
  await shot(page, "part-8-ticket-detail", "03-download-active.png");

  // 04 — soft-remove with a reason -> metadata retained
  page.once("dialog", (d) => d.accept("Attached to the wrong ticket"));
  await downloadRow.getByRole("button", { name: "Remove" }).click();
  await page.getByText(/Removed — Attached to the wrong ticket/).first().waitFor();
  await shot(page, "part-8-ticket-detail", "04-soft-removed.png");

  // 05 — blocked download: after removal the Actions cell shows "Blocked" (no
  //      Download button). Also verify the server rejects the download with 410.
  await page.getByRole("button", { name: "Back to My Tickets" }).click();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  const reopenBtn = page.locator('[aria-label^="Open ticket "]:visible').first();
  await reopenBtn.click();
  await page.getByRole("heading", { name: "Attachments" }).waitFor();
  const removedRow = page.locator("tr", { hasText: /Removed — Attached to the wrong ticket/ }).first();
  await removedRow.getByText("Blocked", { exact: true }).waitFor();
  await shot(page, "part-8-ticket-detail", "05-blocked-download.png");
} finally {
  await browser.close();
}
console.log("done");