#!/usr/bin/env node
// Issue 13 — visual screenshots at desktop / tablet / mobile viewports.
// Saves into artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/.
// Requires the API server on :3000 and the Vite client on :5173 to be running.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 900 },
  mobile: { width: 390, height: 844 },
};

const screenshot = async (page, dir, file) => {
  const target = path.join(OUT, dir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: false });
  console.log("saved", path.relative(ROOT, target));
};

const selectRequester = async (page, name) => {
  await page.goto(CLIENT_URL);
  await page.getByLabel("Development Requester").selectOption({ label: name });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText(`Selected Requester: ${name}`).waitFor();
};

const openCreateTicket = async (page) => {
  await page.getByRole("button", { name: "Create a new ticket" }).click();
  // Wait for the reference-data selects to populate.
  await page.locator("#categoryId option").nth(1).waitFor({ state: "attached" });
};

const browser = await chromium.launch();
try {
  for (const [vp, size] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage({ viewport: size });
    await selectRequester(page, "Alice Anderson");

    // Create Ticket
    await openCreateTicket(page);
    await screenshot(page, "create-ticket", `${vp}.png`);

    // My Tickets (requires navigating back; My Tickets is the default view only
    // for a fresh profile, so use the nav tab).
    await page.getByRole("button", { name: "My Tickets", exact: true }).click();
    await page.getByRole("heading", { name: "My Tickets" }).waitFor();
    await screenshot(page, "my-tickets", `${vp}.png`);

    // Ticket Detail — open a real seeded ticket owned by Alice if present.
    const openBtn = page.locator('[aria-label^="Open ticket "]:visible').first();
    if ((await openBtn.count()) > 0) {
      await openBtn.click();
      await page.getByRole("heading", { name: "Attachments" }).waitFor();
      await screenshot(page, "ticket-detail", `${vp}.png`);
    } else {
      console.warn("no seeded tickets for Alice; skipping ticket-detail screenshot");
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log("done");
