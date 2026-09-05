#!/usr/bin/env node
// Issue 15 — capture the 6 Create-Ticket states (rubric Part 6) plus
// Requester-Selection states for the LEB2 report evidence.
//
// States captured (desktop viewport, readable without extreme zoom):
//   requester-selection/loaded        — Development Requester Selection screen, dropdown open
//   requester-selection/selected      — a requester chosen, app shell shows "Selected Requester"
//   create-ticket-states/01-initial   — Create Ticket with reference data loaded
//   create-ticket-states/02-validation-failure
//   create-ticket-states/03-submitting
//   create-ticket-states/04-success
//   create-ticket-states/05-api-failure
//
// Requires the API server on :3000 and the Vite client on :5173 to be running.
// The API-failure and submitting states are simulated with Playwright route
// interception (abort / delayed response) so the live backend is untouched.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
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

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // --- Requester Selection: loaded + dropdown open -------------------------
  await page.goto(CLIENT_URL);
  await page.getByLabel("Development Requester").waitFor();
  await page.getByLabel("Development Requester").click();
  await shot(page, "requester-selection", "loaded-dropdown.png");

  // --- Requester Selection: a requester chosen, shell shows selected ------
  await page.getByLabel("Development Requester").selectOption({ label: "Alice Anderson" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Selected Requester:").waitFor();
  await shot(page, "requester-selection", "selected.png");

  // --- Create Ticket: initial state with reference data -------------------
  await page.getByRole("button", { name: "Create a new ticket" }).click();
  await page.locator("#categoryId option").nth(1).waitFor({ state: "attached" });
  await page.waitForTimeout(300);
  await shot(page, "create-ticket-states", "01-initial.png");

  // --- Create Ticket: validation failure (submit empty form) --------------
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await page.getByText("Summary is required.").waitFor();
  await shot(page, "create-ticket-states", "02-validation-failure.png");

  // --- Fill valid data for the remaining states ---------------------------
  await page.locator("#summary").fill("Laptop battery drains quickly");
  await page.locator("#description").fill("Battery drops from 100% to 20% in an hour.");
  await page.locator("#categoryId").selectOption({ index: 1 });
  await page.locator("#relatedSystemId").selectOption({ index: 1 });

  // --- Create Ticket: submitting (post delayed so the button is visible) --
  await page.route("**/api/tickets", async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await page.getByRole("button", { name: "Submitting…" }).waitFor();
  await shot(page, "create-ticket-states", "03-submitting.png");
  await page.unroute("**/api/tickets");

  // --- Create Ticket: success (official Ticket Number from backend) -------
  await page.getByRole("button", { name: "View in My Tickets" }).waitFor();
  await page.getByText("Official Ticket Number:").waitFor();
  await shot(page, "create-ticket-states", "04-success.png");

  // --- Create Ticket: API failure (abort the next create POST) ------------
  // Remount Create Ticket fresh (My Tickets -> Create) so the form is empty.
  await page.getByRole("button", { name: "My Tickets", exact: true }).click();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await page.getByRole("button", { name: "Create a new ticket" }).click();
  await page.getByRole("heading", { name: "Create Ticket" }).waitFor();
  await page.locator("#categoryId option").nth(1).waitFor({ state: "attached" });
  await page.locator("#summary").fill("Unable to submit due to outage");
  await page.locator("#description").fill("This submission will fail against the API.");
  await page.locator("#categoryId").selectOption({ index: 1 });
  await page.locator("#relatedSystemId").selectOption({ index: 1 });
  await page.route("**/api/tickets", (route) => route.abort("connectionrefused"));
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await page.getByText(/Unable to create the ticket/).waitFor();
  await shot(page, "create-ticket-states", "05-api-failure.png");
  await page.unroute("**/api/tickets");
} finally {
  await browser.close();
}
console.log("done");
