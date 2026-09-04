#!/usr/bin/env node
// Issue 15 — capture Part 7 (Working My Tickets Screen) evidence.
//
//   part-7-my-tickets/01-alice-list.png      — Requester A list (Alice, 17 tickets)
//   part-7-my-tickets/02-bob-list.png        — Requester B list (Bob, 2 tickets; Alice's gone)
//   part-7-my-tickets/03-search.png          — search "battery" narrows to matches
//   part-7-my-tickets/04-filter-category.png — Category filter = Network
//   part-7-my-tickets/05-filter-priority.png — Priority filter = URGENT
//   part-7-my-tickets/06-filter-status.png   — Status filter = RESOLVED (no results)
//   part-7-my-tickets/07-sort.png            — sort by ticketNumber
//   part-7-my-tickets/08-pagination.png      — page 2 of 2 (Next enabled)
//   part-7-my-tickets/09-empty-state.png     — Carol (no tickets) empty state
//   part-7-my-tickets/10-no-results.png      — search/filter with no match warning
//
// Requires the API server on :3000 and the Vite client on :5173.

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

const selectRequester = async (page, name) => {
  await page.goto(CLIENT_URL);
  await page.getByLabel("Development Requester").selectOption({ label: name });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Selected Requester:").waitFor();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // 01 — Alice list (Requester A)
  await selectRequester(page, "Alice Anderson");
  await page.locator("table tbody tr").first().waitFor();
  await page.waitForTimeout(300);
  await shot(page, "part-7-my-tickets", "01-alice-list.png");

  // 03 — Search "battery"
  await page.locator("#ticket-search").fill("battery");
  await page.getByRole("button", { name: "Search" }).click();
  await page.waitForTimeout(500);
  await shot(page, "part-7-my-tickets", "03-search.png");
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator("table tbody tr").first().waitFor();
  await page.waitForTimeout(400);

  // 04 — Category filter = Network
  await page.locator("#filter-category").selectOption({ label: "Network" });
  await page.waitForTimeout(500);
  await shot(page, "part-7-my-tickets", "04-filter-category.png");
  await page.locator("#filter-category").selectOption({ label: "All" });
  await page.waitForTimeout(400);

  // 05 — Priority filter = URGENT
  await page.locator("#filter-priority").selectOption({ label: "URGENT" });
  await page.waitForTimeout(500);
  await shot(page, "part-7-my-tickets", "05-filter-priority.png");
  await page.locator("#filter-priority").selectOption({ label: "All" });
  await page.waitForTimeout(400);

  // 06 — Status filter = RESOLVED (no matches -> no-results state)
  await page.locator("#filter-status").selectOption({ label: "RESOLVED" });
  await page.waitForTimeout(500);
  await shot(page, "part-7-my-tickets", "06-filter-status-no-matches.png");
  await page.locator("#filter-status").selectOption({ label: "All" });
  await page.waitForTimeout(400);

  // 07 — Sort by ticketNumber
  await page.locator("#filter-sort").selectOption({ label: "Ticket Number A–Z" });
  await page.waitForTimeout(500);
  await shot(page, "part-7-my-tickets", "07-sort.png");
  await page.locator("#filter-sort").selectOption({ label: "Newest first" });
  await page.waitForTimeout(400);

  // 08 — Pagination: page 2 of 2 (17 tickets, pageSize 10 -> 2 pages)
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByText("Page 2 of 2", { exact: true }).waitFor();
  await page.waitForTimeout(300);
  await shot(page, "part-7-my-tickets", "08-pagination.png");

  // 09 — Bob list (Requester B): Alice's tickets should disappear
  await page.getByRole("button", { name: "Change Requester" }).click();
  await page.getByLabel("Development Requester").waitFor();
  await page.getByLabel("Development Requester").selectOption({ label: "Bob Brown" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Selected Requester:").waitFor();
  await page.getByRole("heading", { name: "My Tickets" }).waitFor();
  await page.locator("table tbody tr").first().waitFor();
  await page.waitForTimeout(300);
  await shot(page, "part-7-my-tickets", "02-bob-list.png");
  await page.close();

  // 10 — Empty state: Carol has no tickets
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await selectRequester(page2, "Carol Chen");
  await page2.getByText("You don't have any tickets yet.").waitFor();
  await shot(page2, "part-7-my-tickets", "09-empty-state.png");
  await page2.close();

  // 11 — No-results state: Carol searches something (still empty + hasFilters)
  const page3 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await selectRequester(page3, "Carol Chen");
  await page3.locator("#ticket-search").fill("nothing");
  await page3.getByRole("button", { name: "Search" }).click();
  await page3.getByText("No tickets match your current search and filters.").waitFor();
  await shot(page3, "part-7-my-tickets", "10-no-results.png");
  await page3.close();
} finally {
  await browser.close();
}
console.log("done");