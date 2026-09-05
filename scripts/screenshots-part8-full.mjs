#!/usr/bin/env node
// Issue 15 — Part 8 full-state capture for Ticket Detail (view mode + attachments):
//   01-owned-detail          active ticket detail with an attachment loaded
//   02-add-attachment        file chosen, ready to upload
//   03-download-active       active attachment downloaded (success)
//   04-removal-reason-input  inline reason panel open (NOT window.prompt)
//   05-soft-removed          removed with reason, metadata retained
//   06-blocked-download      removed row shows Blocked (download 410)
//   07-cross-requester       (kept from part-78-evidence)

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots", "part-8-ticket-detail");
const BASE = "http://localhost:5173";

const ALICE = 2341;
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const browser = await chromium.launch();
try {
  await mkdir(OUT, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.selectOption("#development-requester", String(ALICE));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "My Tickets" }).click();
  await page.waitForSelector("text=My Tickets");
  await page.waitForTimeout(400);

  // Open the first ticket that does NOT yet have a removed attachment, so we
  // can demonstrate a full active -> removed lifecycle with a clean row.
  await page.getByRole("button", { name: /Open ticket/ }).first().click();
  await page.waitForSelector("text=Attachments");
  await page.waitForTimeout(300);

  // If the ticket has no active attachment, upload one now.
  if (await page.getByText("No attachments yet.").isVisible().catch(() => false)) {
    await page.getByTestId("attachment-file-input").setInputFiles({
      name: "evidence-diagram.png",
      mimeType: "image/png",
      buffer: PNG_1PX,
    });
    await page.getByRole("button", { name: "Upload Attachment" }).click();
    await page.waitForSelector("text=Active");
  } else if (!(await page.getByRole("button", { name: "Download" }).first().isVisible().catch(() => false))) {
    // first ticket has attachments but all removed -> pick a different ticket
    await page.getByRole("button", { name: "Back" }).click();
    await page.waitForTimeout(300);
    const buttons = page.getByRole("button", { name: /Open ticket/ });
    for (let i = 1; i < (await buttons.count()); i++) {
      await buttons.nth(i).click();
      await page.waitForSelector("text=Attachments");
      await page.waitForTimeout(250);
      const dl = page.getByRole("button", { name: "Download" }).first();
      if (await dl.isVisible().catch(() => false)) break;
      await page.getByRole("button", { name: "Back" }).click();
      await page.waitForTimeout(250);
    }
  }

  // 01-owned-detail (active attachment present)
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "01-owned-detail.png") });
  console.log("saved", "part-8-ticket-detail/01-owned-detail.png");

  // 02-add-attachment: select a second file (do NOT upload yet)
  await page.getByTestId("attachment-file-input").setInputFiles({
    name: "diagram-v2.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await page.waitForSelector("data-testid=selected-file-name");
  await page.waitForTimeout(200);
  await page.getByTestId("selected-file-name").scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, "02-add-attachment.png") });
  console.log("saved", "part-8-ticket-detail/02-add-attachment.png");

  // upload it -> active
  await page.getByRole("button", { name: "Upload Attachment" }).click();
  await page.waitForTimeout(400);

  // 03-download-active
  const success = page.getByRole("button", { name: "Download" }).first();
  await success.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const dl = page.waitForEvent("download");
  await success.click();
  const download = await dl;
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, "03-download-active.png") });
  console.log("saved", "part-8-ticket-detail/03-download-active.png");

  // 04-removal-reason-input (inline panel, not window.prompt)
  await page.getByRole("button", { name: "Remove" }).first().click();
  await page.waitForSelector("data-testid=removal-reason-panel");
  await page.getByTestId("removal-reason-panel").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, "04-removal-reason-input.png") });
  console.log("saved", "part-8-ticket-detail/04-removal-reason-input.png");

  // 05-soft-removed: fill reason + Confirm
  await page.getByLabel(/Removal reason for/i).fill("Attached to the wrong ticket");
  await page.getByRole("button", { name: "Confirm Removal" }).click();
  await page.waitForSelector("text=/Removed — Attached to the wrong ticket/");
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, "05-soft-removed.png") });
  console.log("saved", "part-8-ticket-detail/05-soft-removed.png");

  // 06-blocked-download: scroll so the table header + Blocked row are centered
  await page.getByText("Blocked", { exact: true }).first().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 120));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, "06-blocked-download.png") });
  console.log("saved", "part-8-ticket-detail/06-blocked-download.png");

  if (download) await download.failure().catch(() => null);
} finally {
  await browser.close();
}
console.log("done");