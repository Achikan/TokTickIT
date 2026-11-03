import { test, expect } from "@playwright/test";
import {
  STAFF,
  CAROL,
  loginToShell,
  logout,
  openTicketFromQueue,
  openTicketFromMyTickets,
  ensureRequesterPassword,
} from "./helpers.js";

// Lab 4 (Issue 33/37) — E2E-02: Ticket Resolution & Status Workflow (specification.md AC-11, AC-16, AC-25)
test.describe("Ticket Resolution and Status Workflow (E2E-02)", () => {
  test.beforeAll(async () => {
    await ensureRequesterPassword(CAROL.email);
  });

  test("permitted transitions rendered per matrix, resolution gate enforced, and requester advisory note does not change status", async ({
    page,
  }) => {
    // 1. Staff logs in and inspects TK-001001 (NEW status, 0 actions)
    await loginToShell(page, STAFF);
    await openTicketFromQueue(page, "TK-001001");

    // Workflow section exists
    const workflow = page.locator('[data-testid="ticket-workflow"]');
    await expect(workflow).toBeVisible();

    // From NEW, permitted transitions are: Open, Start Progress, Cancel Ticket
    // "Resolve" is NOT permitted from NEW
    await expect(page.getByRole("button", { name: "Start Progress" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resolve" })).toHaveCount(0);

    // 2. Staff inspects TK-001003 (IN_PROGRESS, has recorded actions)
    await openTicketFromQueue(page, "TK-001003");

    // From IN_PROGRESS with actions, permitted transitions: Set Waiting for Requester, Resolve, Cancel Ticket
    await expect(page.getByRole("button", { name: "Set Waiting for Requester" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resolve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel Ticket" })).toBeVisible();

    // 3. Requester view: Carol marks problem appears resolved
    await logout(page);
    await loginToShell(page, CAROL);
    await openTicketFromMyTickets(page, "TK-001003");

    // Requester cannot transition status (no staff workflow transition buttons)
    await expect(page.locator('[data-testid="ticket-workflow"]')).toHaveCount(0);

    // Advisory resolution feedback is available
    const indicateBtn = page.getByRole("button", { name: "Mark as appears resolved" });
    if (await indicateBtn.isVisible().catch(() => false)) {
      await indicateBtn.click();
    }

    // Confirmation banner states ticket status has NOT changed
    await expect(
      page.getByText("Your note was recorded for IT Staff. The ticket status has not changed.")
    ).toBeVisible();

    // The status badge remains IN_PROGRESS
    await expect(page.getByText("IN_PROGRESS")).toBeVisible();
  });
});
