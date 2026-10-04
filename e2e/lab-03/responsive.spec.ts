import { test, expect, type Page } from "@playwright/test";
import {
  ADMIN,
  STAFF,
  createActiveRequester,
  createRequesterNeedingChange,
  createTicketViaApi,
  expectNoClippedContent,
  expectNoHorizontalScroll,
  expectTableFullyVisible,
  login,
  loginToShell,
  uniqueSuffix,
} from "./helpers.js";

// Lab 3 (Issue 24) — RESP-01, responsive layout (labs-sheet §8.7, ui-spec §9;
// tests.md §2). AC-23.
//
// This spec runs on the desktop (1280), narrow-desktop (1024), tablet (820) and
// mobile (390) projects (see playwright.config.ts testMatch), so every
// assertion below is executed at all four viewports. It verifies that every
// major screen stays free of clipping, text overlap and horizontal scrolling,
// with the primary controls still usable.
//
// Two checks are used together on purpose:
//   expectNoHorizontalScroll  — the document itself must not scroll sideways.
//   expectNoClippedContent    — nothing may be cut off inside a clipping box.
// The first alone passes while a `overflow-x: auto` wrapper silently cuts a
// column (the queue table's truncated "Last Updated"), which is why the queue
// is exercised with a full page of realistic rows instead of a single filtered
// ticket.

test.describe("Responsive layout across viewports (RESP-01)", () => {
  test("guest screens show labelled, usable controls without horizontal scroll", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /IT Service Desk/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);
  });

  test("mandatory Change Password screen stays usable at every viewport", async ({ page }) => {
    const requester = await createRequesterNeedingChange(`E2E Resp PW ${uniqueSuffix()}`);
    await login(page, requester.email, requester.initialPassword);
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
    for (const selector of ["#current-password", "#new-password", "#confirm-password"]) {
      await expect(page.locator(selector)).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Update Password" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);
  });

  test("Requester My Tickets and Ticket Detail have no clipping or hidden controls", async ({
    page,
  }) => {
    const requester = await createActiveRequester(`E2E Resp Req ${uniqueSuffix()}`);
    const { ticketNumber } = await createTicketViaApi(requester, {
      summary: `Responsive requester ${uniqueSuffix()}`,
      description: "Requester screens must remain readable and usable at every viewport.",
      categoryName: "Hardware",
      relatedSystemName: "ERP System",
      requestedPriority: "MEDIUM",
    });

    await loginToShell(page, requester);
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create a new ticket" })).toBeVisible();
    await expect(page.getByLabel("Search", { exact: true })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);

    await page.getByRole("button", { name: `Open ticket ${ticketNumber}` }).click();
    await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
    await expect(page.getByText("Summary & Description")).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to My Tickets" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);
  });

  test("IT Staff queue and ticket detail have no clipping or hidden actions", async ({ page }) => {
    const requester = await createActiveRequester(`E2E Resp Staff ${uniqueSuffix()}`);
    const { ticketNumber } = await createTicketViaApi(requester, {
      summary: `Responsive staff ${uniqueSuffix()}`,
      description: "Staff queue and detail must remain usable at every viewport.",
      categoryName: "Network",
      relatedSystemName: "VPN Gateway",
      requestedPriority: "HIGH",
    });

    await loginToShell(page, STAFF);
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();

    await page.locator("#queue-search").fill(ticketNumber);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("button", { name: `Open ticket ${ticketNumber}` }).first().click();
    await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
    await expect(page.getByRole("button", { name: "Claim ticket" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to Queue" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);
  });

  test("Administrator User Management has no clipping or hidden controls", async ({ page }) => {
    await loginToShell(page, ADMIN);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create user" })).toBeVisible();
    await expect(page.getByLabel("Search", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Role")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);
  });
  test("Requester Create Ticket form stays usable and unclipped at every viewport", async ({
    page,
  }) => {
    const requester = await createActiveRequester(`E2E Resp New ${uniqueSuffix()}`);
    await loginToShell(page, requester);
    await page.getByRole("button", { name: "Create a new ticket" }).click();

    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await expect(page.getByLabel(/Summary/i)).toBeVisible();
    await expect(page.getByLabel(/Description/i)).toBeVisible();
    await expect(page.getByLabel(/Category/i)).toBeVisible();
    await expect(page.getByLabel(/Related System/i)).toBeVisible();
    await expect(page.getByLabel(/Requested Priority/i)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);

    // A long summary and description must not be cut off mid-word.
    await page
      .getByLabel(/Summary/i)
      .fill(
        "Warehouse handheld scanner cannot sync over the docking cradle after the firmware update"
      );
    await expect(page.getByLabel(/Summary/i)).toHaveValue(
      /Warehouse handheld scanner cannot sync over the docking cradle after the firmware update/
    );
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);
  });

  test("IT Staff queue shows every column of a full page of realistic rows", async ({ page }) => {
    // Regression: with a single short filtered row the queue table always fit.
    // A full page of realistic summaries and every status/priority combination
    // pushed "Last Updated" out of view at 1280 and caused real page-level
    // horizontal scrolling at 1024 and 820 (ui-spec §5, §9).
    const requester = await createActiveRequester(`E2E Resp Full ${uniqueSuffix()}`);
    const rows: Array<[string, string, "LOW" | "MEDIUM" | "HIGH" | "URGENT", string]> = [
      ["Hardware", "ERP System", "MEDIUM", "Cannot log in to the ERP production environment since the password reset email never arrives"],
      ["Network", "VPN Gateway", "HIGH", "VPN disconnects every few minutes for the warehouse team on the new router"],
      ["Software", "CRM System", "LOW", "Requesting a license seat for the new support analyst joining on Monday"],
      ["Hardware", "ERP System", "URGENT", "Replacement laptop needed because the battery is swelling and the keyboard is lifting off the chassis"],
      ["Application Support", "HR System", "HIGH", "New starter needs access to the finance shared drive and the reporting warehouse"],
      ["Network", "Network Infrastructure", "MEDIUM", "Guest Wi-Fi captive portal shows an error after the guest network password rotation"],
      ["Email", "Email Server", "LOW", "Shared mailbox rules stop routing escalations to the duty manager mailbox"],
      ["Printing", "Network Infrastructure", "MEDIUM", "Two handheld scanners in receiving will not sync over the warehouse docking cradle"],
    ];
    for (const [categoryName, relatedSystemName, requestedPriority, summary] of rows) {
      await createTicketViaApi(requester, {
        summary,
        description: "Full-page responsive check for the staff queue table.",
        categoryName,
        relatedSystemName,
        requestedPriority,
      });
    }

    await loginToShell(page, STAFF);
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();

    // The Owner filter is a select of real assignable staff, not a raw id box,
    // and it stays usable while results refresh (UI-11).
    const owner = page.getByLabel("Owner");
    await expect(owner).toBeVisible();
    await expect(owner).toHaveRole("combobox");
    await expect(page.getByRole("option", { name: "Unassigned" })).toHaveCount(1);
    await expect(owner).toBeEnabled();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);

    const desktopTable = page.locator("table");
    if (await desktopTable.isVisible()) {
      // All ten justified columns of ui-spec §5 are present and fully readable.
      for (const header of [
        "Ticket Number",
        "Summary",
        "Category",
        "Requested Priority",
        "IT Priority",
        "Current Status",
        "Ticket Owner",
        "Created",
        "Last Updated",
      ]) {
        await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
      }
      await expectTableFullyVisible(page);
      // Timestamps are complete, compact and machine-readable.
      const lastUpdated = await desktopTable.locator("tbody tr td:nth-child(9) time").first();
      await expect(lastUpdated).toHaveAttribute("dateTime", /^\d{4}-\d{2}-\d{2}T/);
      await expect(lastUpdated).toHaveText(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/);
    } else {
      // Below 992px the card representation carries the same information.
      const cards = page.locator("ul.list-unstyled .card");
      await expect(cards.first()).toBeVisible();
      await expect(cards.first().getByRole("button", { name: /Open ticket TK-/ })).toBeVisible();
    }

    // A filtered view must stay clean too.
    await page.locator("#queue-search").fill(rows[0][3].slice(0, 24));
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);

    // ...and the Owner filter must actually narrow the list.
    await page.locator("#queue-search").fill("");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await owner.selectOption("unassigned");
    await expectNoHorizontalScroll(page);
    await expectNoClippedContent(page);
  });
});
