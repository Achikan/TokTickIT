import { test, expect, type Page } from "@playwright/test";
import {
  ADMIN,
  STAFF,
  createActiveRequester,
  createRequesterNeedingChange,
  createTicketViaApi,
  expectNoHorizontalScroll,
  login,
  loginToShell,
  uniqueSuffix,
} from "./helpers.js";

// Lab 3 (Issue 24) — RESP-01, responsive layout (labs-sheet §8.7, ui-spec §9;
// tests.md §2). AC-23.
//
// This spec runs on the desktop, tablet and mobile projects (see
// playwright.config.ts testMatch), so every assertion below is executed at all
// three viewports. It verifies that every major screen stays free of clipping,
// text overlap and horizontal scrolling, with the primary controls still usable.

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

    await page.getByRole("button", { name: `Open ticket ${ticketNumber}` }).click();
    await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
    await expect(page.getByText("Summary & Description")).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to My Tickets" })).toBeVisible();
    await expectNoHorizontalScroll(page);
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
  });

  test("Administrator User Management has no clipping or hidden controls", async ({ page }) => {
    await loginToShell(page, ADMIN);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create user" })).toBeVisible();
    await expect(page.getByLabel("Search", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Role")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});