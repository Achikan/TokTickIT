#!/usr/bin/env node
// Issue 15 — re-capture report evidence affected by code changes:
//   * Status renamed SUBMITTED -> NEW
//   * Create Ticket now has an Attachments field (BR-07) + invalid-attachment state
//   * Ticket Detail soft-remove now uses an inline reason panel (not window.prompt)
//   * New Requester Selection empty + API-failure states
//
// Part 5  requester-selection/:          loading, empty, api-failure, loaded, selected, active-dropdown
// Part 6  create-ticket-states/:         initial, validation-failure, submitting, success, api-failure
//          create-ticket-invalid-attach/: invalid-attachment (in Create Ticket)
// Part 8  part-8-ticket-detail/:         01-owned-detail, 02-remove-reason-input, 03-soft-removed, 04-blocked-download

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");
const BASE = "http://localhost:5173";
const API = "http://localhost:3000";

const REQUESTERS = {
  "Alice Anderson": 2341,
  "Bob Brown": 2342,
  "Carol Chen": 2343,
};

async function save(page, rel, waitMs = 150) {
  await page.waitForTimeout(waitMs);
  const full = path.join(OUT, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await page.screenshot({ path: full, fullPage: false });
  console.log("saved", rel);
}

// tiny valid PNG (1x1)
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // ------------------------------------------------------------------
  // Part 5 — Requester Selection states
  // ------------------------------------------------------------------
  // 1. loading: return a never-resolving promise for the requesters call
  await page.route("**/api/development-requesters", async (route) => {
    await new Promise(() => {}); // never resolve -> loading state persists
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Loading development requesters");
  await save(page, "requester-selection/loading.png", 300);
  await page.unroute("**/api/development-requesters");

  // 2. empty: stub an empty list
  await page.route("**/api/development-requesters", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
  );
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=There are no active development requesters.");
  await save(page, "requester-selection/empty.png", 300);
  await page.unroute("**/api/development-requesters");

  // 3. api-failure: return 500
  await page.route("**/api/development-requesters", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "boom" } }) })
  );
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Unable to load development requesters");
  await save(page, "requester-selection/api-failure.png", 300);
  await page.unroute("**/api/development-requesters");

  // 4. loaded dropdown (active-user dropdown listing requesters)
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("select#development-requester");
  await save(page, "requester-selection/loaded-dropdown.png");

  // 5. selected-user display (chosen Alice in the app header)
  await page.selectOption("#development-requester", String(REQUESTERS["Alice Anderson"]));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("text=Selected Requester");
  await save(page, "requester-selection/selected.png");

  // ------------------------------------------------------------------
  // Part 6 — Create Ticket states (now with attachments field + NEW status)
  // ------------------------------------------------------------------
  await page.getByRole("button", { name: "Create Ticket" }).click();
  await page.waitForSelector("#summary");

  // 01-initial
  await save(page, "create-ticket-states/01-initial.png");

  // 02-validation-failure: submit empty form
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await page.waitForSelector("text=Summary is required.");
  await save(page, "create-ticket-states/02-validation-failure.png");

  // fill valid values for the next states
  const fillId = async (id, value) => {
    const el = page.locator(`#${id}`);
    await el.selectOption(value);
  };
  const catText = await page.locator("#categoryId option").nth(1).getAttribute("value");
  const sysText = await page.locator("#relatedSystemId option").nth(1).getAttribute("value");
  await page.locator("#summary").fill("Monitor flickers after wake from sleep");
  await page.locator("#description").fill("The display periodically flickers for a few seconds after waking.");
  await fillId("categoryId", catText);
  await fillId("relatedSystemId", sysText);
  await page.locator("#requestedPriority").selectOption("HIGH");
  await page.waitForTimeout(200);

  // invalid attachment in Create Ticket: attempt a .txt file -> field-level error
  await page
    .locator("#attachment-files")
    .setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await page.waitForSelector("text=not an allowed file type");
  await save(page, "create-ticket-states/03-invalid-attachment.png");

  // now choose a valid PNG attachment to show in submitting/success
  await page
    .locator("#attachment-files")
    .setInputFiles({ name: "evidence-diagram.png", mimeType: "image/png", buffer: PNG_1PX });
  await page.waitForSelector("text=evidence-diagram.png");
  await save(page, "create-ticket-states/04-files-selected.png");

  // 03-submitting (intercept POST /api/tickets to hang)
  await page.route("**/api/tickets", (route) => {
    if (route.request().method() === "POST") return new Promise(() => {});
    return route.continue();
  }, { times: 1 });
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await page.waitForSelector("text=Submitting…");
  await save(page, "create-ticket-states/05-submitting.png", 300);
  await page.unroute("**/api/tickets");

  // 04-success (real POST -> creates ticket + uploads attachment)
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await page.waitForSelector("text=Ticket created.");
  await page.waitForSelector("text=Attached 1 file");
  await save(page, "create-ticket-states/06-success.png", 400);

  // 05-api-failure: fill a second ticket, then force the POST to 500
  // (reload resets the app to requester selection, so re-enter the flow)
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("select#development-requester");
  await page.selectOption("#development-requester", String(REQUESTERS["Alice Anderson"]));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create Ticket" }).click();
  await page.waitForSelector("#summary");
  await page.locator("#summary").fill("Cannot reach shared drive");
  await page.locator("#description").fill("Network share is unreachable.");
  await fillId("categoryId", catText);
  await fillId("relatedSystemId", sysText);
  await page.route("**/api/tickets", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "boom" } }),
    })
  , { times: 1 });
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await page.waitForSelector("text=Unable to create the ticket");
  await save(page, "create-ticket-states/07-api-failure.png", 300);
  await page.unroute("**/api/tickets");

  // ------------------------------------------------------------------
  // Part 8 — removal-reason input + soft-remove + blocked download
  // ------------------------------------------------------------------
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("select#development-requester");
  await page.selectOption("#development-requester", String(REQUESTERS["Alice Anderson"]));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "My Tickets" }).click();
  await page.waitForSelector("text=My Tickets");
  await page.waitForTimeout(400);
  await save(page, "part-8-ticket-detail/00-list.png");

  // open the first ticket, upload an attachment, show the inline remove-reason panel.
  const openFirst = page.getByRole("button", { name: /Open ticket/ }).first();
  await openFirst.click();
  await page.waitForSelector("text=Attachments");
  await page.waitForTimeout(300);

  // ensure an active attachment exists to remove (the Create-Ticket success
  // ticket from earlier already attached "evidence-diagram.png")
  if (await page.getByText("No attachments yet.").isVisible().catch(() => false)) {
    await page.getByTestId("attachment-file-input").setInputFiles({
      name: "evidence-diagram.png",
      mimeType: "image/png",
      buffer: PNG_1PX,
    });
    await page.getByRole("button", { name: "Upload Attachment" }).click();
    await page.waitForSelector("text=Active");
  }
  await save(page, "part-8-ticket-detail/01-owned-detail.png");

  // inline removal-reason input panel
  await page.getByRole("button", { name: "Remove" }).first().click();
  await page.waitForSelector("data-testid=removal-reason-panel");
  await save(page, "part-8-ticket-detail/02-removal-reason-input.png");

  // confirm with a reason -> soft-removed
  await page.getByLabel(/Removal reason for/i).fill("Attached to the wrong ticket");
  await page.getByRole("button", { name: "Confirm Removal" }).click();
  await page.waitForSelector("text=/Removed — Attached to the wrong ticket/");
  await save(page, "part-8-ticket-detail/03-soft-removed.png");

  // blocked download (row shows Blocked, no download button)
  await save(page, "part-8-ticket-detail/04-blocked-download.png");
} finally {
  await browser.close();
}
console.log("done");