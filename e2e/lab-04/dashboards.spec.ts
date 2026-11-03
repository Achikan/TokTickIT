import { test, expect } from "@playwright/test";
import {
  STAFF,
  ADMIN,
  CAROL,
  loginToShell,
  logout,
  ensureRequesterPassword,
} from "./helpers.js";

const ZERO_REQUESTER = { email: "ivy.ing@example.com", password: "ReadyPass!23" };

// Lab 4 (Issue 34/35/37) — E2E-03: Dashboards & Drill-down (specification.md AC-02, AC-18..21, AC-25)
test.describe("Role Dashboards and Drill-Downs (E2E-03)", () => {
  test.beforeAll(async () => {
    await ensureRequesterPassword(CAROL.email);
    await ensureRequesterPassword(ZERO_REQUESTER.email);
  });

  test("IT Staff dashboard metrics, drill-down to queue, and Admin user accounts card", async ({
    page,
  }) => {
    // 1. Staff login and navigate to Staff Dashboard
    await loginToShell(page, STAFF);
    const dashBtn = page.getByRole("button", { name: "Staff Dashboard" });
    await expect(dashBtn).toBeVisible();
    await dashBtn.click();

    // Verify operational metrics are present
    await expect(page.getByText("Unassigned Tickets")).toBeVisible();
    await expect(page.getByText("Tickets Owned by Me")).toBeVisible();
    await expect(page.getByText("Active by IT Priority")).toBeVisible();
    await expect(page.getByText("Recently Updated (All Tickets)")).toBeVisible();

    // Drill down to queue via unassigned card
    const unassignedCard = page.locator('a[aria-label="View unassigned tickets"]');
    await expect(unassignedCard).toBeVisible();
    await unassignedCard.click();

    // Queue is displayed with filter active
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();

    // 2. Admin login: verify User Accounts card
    await logout(page);
    await loginToShell(page, ADMIN);
    await page.getByRole("button", { name: "Staff Dashboard" }).click();
    await expect(page.getByText("User Accounts (Total / Active)")).toBeVisible();
  });

  test("Requester dashboard metrics, drill-down to My Tickets, and zero-state display", async ({
    page,
  }) => {
    // 1. Carol Chen login and view Requester Dashboard
    await loginToShell(page, CAROL);
    await page.getByRole("button", { name: "Dashboard" }).click();

    await expect(page.getByText("My Open Tickets")).toBeVisible();
    await expect(page.getByText("Waiting for My Reply")).toBeVisible();

    // Drill-down to My Tickets
    const openCard = page.locator('a[aria-label="My Open Tickets"]');
    await expect(openCard).toBeVisible();
    await openCard.click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    // 2. Zero-state Requester: Ivy Ing (0 tickets)
    await logout(page);
    await loginToShell(page, ZERO_REQUESTER);
    await page.getByRole("button", { name: "Dashboard" }).click();

    // Cards display 0 and empty state message is shown
    await expect(page.getByText("No recent tickets to display.")).toBeVisible();
  });
});
