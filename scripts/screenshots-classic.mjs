#!/usr/bin/env node
// Issue 15 — capture the professor-required artifact folders
//   artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/
// with every UI state at desktop / tablet / mobile viewports, matching the
// structure shown in the peer's PR #30 (title = "<viewport>-<state>.png").
//
//   create-ticket/  <vp>-initial / -validation-error / -attachment-invalid /
//                   -files-selected / -submitting / -success / -api-failure
//   my-tickets/     <vp>-list / -search / -filter-category / -filter-priority /
//                   -filter-status-no-matches / -sorted / -pagination /
//                   -empty / -no-results
//   ticket-detail/  <vp>-view-mode / -attachment-added
//
// Requires the API server on :3000 and the Vite client on :5173 (dev DB seeded).
// Simulated states (api-failure, submitting) use Playwright route interception.

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

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 900 },
  mobile: { width: 390, height: 844 },
};

let CURRENT_FULLPAGE = false;
const shot = async (page, dir, file) => {
  const target = path.join(OUT, dir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: CURRENT_FULLPAGE });
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
  await page.locator("#categoryId option").nth(1).waitFor({ state: "attached" });
};

const fillValidForm = async (page) => {
  await page.locator("#summary").fill("Laptop battery drains quickly");
  await page.locator("#description").fill("Battery drops from 100% to 20% in an hour.");
  await page.locator("#categoryId").selectOption({ index: 1 });
  await page.locator("#relatedSystemId").selectOption({ index: 1 });
};

const browser = await chromium.launch();
try {
  for (const [vp, size] of Object.entries(VIEWPORTS)) {
    CURRENT_FULLPAGE = true;
    const page = await browser.newPage({ viewport: size });
    await selectRequester(page, "Alice Anderson");

    // ================= CREATE TICKET =================
    await openCreateTicket(page);
    await page.waitForTimeout(300);
    await shot(page, "create-ticket", `${vp}-initial.png`);

    // validation-error (submit empty form)
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await page.getByText("Summary is required.").waitFor();
    await shot(page, "create-ticket", `${vp}-validation-error.png`);

    // attachment-invalid (a .txt is rejected)
    await fillValidForm(page);
    await page.locator("#attachment-files").setInputFiles({
      name: "note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    await page.getByText(/not an allowed file type/).waitFor();
    await shot(page, "create-ticket", `${vp}-attachment-invalid.png`);

    // files-selected (valid PNG chosen, not yet submitted)
    await page.locator("#attachment-files").setInputFiles({
      name: "evidence-diagram.png",
      mimeType: "image/png",
      buffer: PNG_1PX,
    });
    await page.getByLabel("Files to attach").waitFor();
    await shot(page, "create-ticket", `${vp}-files-selected.png`);

    // submitting (delayed POST so the in-flight state is visible)
    await page.route("**/api/tickets", async (route) => {
      if (route.request().method() !== "POST") return route.continue().catch(() => {});
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue().catch(() => {});
    });
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await page.getByRole("button", { name: "Submitting…" }).waitFor();
    await shot(page, "create-ticket", `${vp}-submitting.png`);
    await page.unroute("**/api/tickets");

    // success (real Ticket Number from backend)
    await page.getByText("Official Ticket Number:").waitFor();
    await shot(page, "create-ticket", `${vp}-success.png`);

    // api-failure (abort the next create POST)
    await page.getByRole("button", { name: "My Tickets", exact: true }).click();
    await page.getByRole("heading", { name: "My Tickets" }).waitFor();
    await openCreateTicket(page);
    await page.locator("#summary").fill("Unable to submit due to outage");
    await page.locator("#description").fill("This submission will fail against the API.");
    await page.locator("#categoryId").selectOption({ index: 1 });
    await page.locator("#relatedSystemId").selectOption({ index: 1 });
    await page.route("**/api/tickets", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Service unavailable", fields: {} }),
      })
    );
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await page.getByText(/Unable to create the ticket/).waitFor();
    await shot(page, "create-ticket", `${vp}-api-failure.png`);
    await page.unroute("**/api/tickets");

    // ================= MY TICKETS =================
    await page.getByRole("button", { name: "My Tickets", exact: true }).click();
    await page.getByRole("heading", { name: "My Tickets" }).waitFor();
    await page.locator('[aria-label^="Open ticket "]:visible').first().waitFor();
    await page.waitForTimeout(300);
    await shot(page, "my-tickets", `${vp}-list.png`);

    // search
    await page.locator("#ticket-search").fill("battery");
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForTimeout(500);
    await shot(page, "my-tickets", `${vp}-search.png`);
    await page.getByRole("button", { name: "Reset" }).click();
    await page.locator('[aria-label^="Open ticket "]:visible').first().waitFor();
    await page.waitForTimeout(400);

    // filter-category
    await page.locator("#filter-category").selectOption({ label: "Network" });
    await page.waitForTimeout(500);
    await shot(page, "my-tickets", `${vp}-filter-category.png`);
    await page.locator("#filter-category").selectOption({ label: "All" });
    await page.waitForTimeout(400);

    // filter-priority
    await page.locator("#filter-priority").selectOption({ label: "URGENT" });
    await page.waitForTimeout(500);
    await shot(page, "my-tickets", `${vp}-filter-priority.png`);
    await page.locator("#filter-priority").selectOption({ label: "All" });
    await page.waitForTimeout(400);

    // filter-status no matches
    await page.locator("#filter-status").selectOption({ label: "RESOLVED" });
    await page.waitForTimeout(500);
    await shot(page, "my-tickets", `${vp}-filter-status-no-matches.png`);
    await page.locator("#filter-status").selectOption({ label: "All" });
    await page.waitForTimeout(400);

    // sorted
    await page.locator("#filter-sort").selectOption({ label: "Ticket Number A–Z" });
    await page.waitForTimeout(500);
    await shot(page, "my-tickets", `${vp}-sorted.png`);
    await page.locator("#filter-sort").selectOption({ label: "Newest first" });
    await page.waitForTimeout(400);

    // pagination (any 2nd+ page shows Next + a page counter)
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByText(/Page \d+ of \d+/).first().waitFor();
    await page.waitForTimeout(300);
    await shot(page, "my-tickets", `${vp}-pagination.png`);

    // empty (Carol has no tickets) — switch requester
    await page.getByRole("button", { name: "Change Requester" }).click();
    await page.getByLabel("Development Requester").waitFor();
    await page.getByLabel("Development Requester").selectOption({ label: "Carol Chen" });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("Selected Requester: Carol Chen").waitFor();
    await page.getByText("You don't have any tickets yet.").waitFor();
    await page.waitForTimeout(300);
    await shot(page, "my-tickets", `${vp}-empty.png`);

    // no-results (Carol searches with no match)
    await page.locator("#ticket-search").fill("nothing");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByText("No tickets match your current search and filters.").waitFor();
    await page.waitForTimeout(300);
    await shot(page, "my-tickets", `${vp}-no-results.png`);

    // ================= TICKET DETAIL =================
    // switch back to Alice to reach her real tickets
    await page.getByRole("button", { name: "Change Requester" }).click();
    await page.getByLabel("Development Requester").waitFor();
    await page.getByLabel("Development Requester").selectOption({ label: "Alice Anderson" });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("Selected Requester: Alice Anderson").waitFor();
    await page.getByRole("heading", { name: "My Tickets" }).waitFor();
    await page.locator('[aria-label^="Open ticket "]:visible').first().waitFor();
    await page.getByRole("button", { name: /Open ticket/ }).first().click();
    await page.getByRole("heading", { name: "Attachments" }).waitFor();
    await page.waitForTimeout(300);
    await shot(page, "ticket-detail", `${vp}-view-mode.png`);

    // attachment-added (valid file chosen + uploaded to Active)
    await page.getByTestId("attachment-file-input").setInputFiles({
      name: "diagram-v2.png",
      mimeType: "image/png",
      buffer: PNG_1PX,
    });
    await page.getByRole("button", { name: "Upload Attachment" }).click();
    await page.waitForSelector("text=Active");
    await page.waitForTimeout(250);
    await shot(page, "ticket-detail", `${vp}-attachment-added.png`);

    await page.close();
  }
} finally {
  await browser.close();
}
console.log("done");