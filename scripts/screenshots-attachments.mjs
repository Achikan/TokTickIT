#!/usr/bin/env node
// Issue 15 — capture Ticket Detail attachment states (rubric Parts 6#4 & 8).
//
//   ticket-detail-attachments/01-initial         — Ticket Detail, Attachments section
//   ticket-detail-attachments/02-valid-uploaded  — a valid PNG uploaded -> Active + metadata
//   ticket-detail-attachments/03-invalid-attach  — a .txt uploaded -> "not supported" error
//   ticket-detail-attachments/04-soft-removed    — removal with reason -> Removed + Blocked
//
// Requires the API server on :3000 and the Vite client on :5173 to be running.

import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const shot = async (page, dir, file) => {
  const target = path.join(OUT, dir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: false });
  console.log("saved", path.relative(ROOT, target));
};

// A tiny valid 1x1 PNG (green) for the valid upload.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Select Alice and confirm the shell shows the selected requester.
  await page.goto(CLIENT_URL);
  await page.getByLabel("Development Requester").waitFor();
  await page.getByLabel("Development Requester").selectOption({ label: "Alice Anderson" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Selected Requester:").waitFor();

  // Open the first owned ticket from My Tickets.
  await page.getByRole("button", { name: "My Tickets", exact: true }).click();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  const openBtn = page.locator('[aria-label^="Open ticket "]:visible').first();
  if ((await openBtn.count()) === 0) {
    console.error("No owned ticket for Alice; create one first (run screenshots-states.mjs).");
    process.exit(1);
  }
  await openBtn.click();
  await page.getByRole("heading", { name: "Attachments" }).waitFor();

  // 01 — initial Attachments section (may show "No attachments yet." or an existing list).
  await shot(page, "ticket-detail-attachments", "01-initial.png");

  // 02 — valid upload: a real PNG becomes an Active attachment with metadata.
  await page.getByTestId("attachment-file-input").setInputFiles({
    name: "diagram.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await page.getByRole("button", { name: "Upload Attachment" }).click();
  await page.getByText("diagram.png").waitFor();
  await page.getByText("Active", { exact: true }).first().waitFor();
  await shot(page, "ticket-detail-attachments", "02-valid-uploaded.png");

  // 03 — invalid attachment: a .txt is rejected; an inline error is shown.
  await page.getByTestId("attachment-file-input").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("plain text", "utf-8"),
  });
  await page.getByRole("button", { name: "Upload Attachment" }).click();
  await page.getByText("This file type is not supported.").waitFor();
  await shot(page, "ticket-detail-attachments", "03-invalid-attach.png");

  // 04 — soft-removal: accept the prompt with a reason -> metadata retained + Blocked.
  page.once("dialog", (d) => d.accept("Uploaded the wrong file"));
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByText(/Removed — Uploaded the wrong file/).waitFor();
  await shot(page, "ticket-detail-attachments", "04-soft-removed.png");
} finally {
  await browser.close();
}
console.log("done");
