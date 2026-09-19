import { test, expect, type Page } from "@playwright/test";
import {
  STAFF,
  createActiveRequester,
  createTicketViaApi,
  indicateResolvedViaApi,
  loginToShell,
  uniqueSuffix,
} from "./helpers.js";

// Lab 3 (Issue 24) — E2E-03 / E2E-04, IT Staff workflow (labs-sheet §8.3, §8.4;
// tests.md §2). AC-13..AC-17, FR-10/FR-11, FR-14..FR-16.
//
// Fresh Requester + Ticket fixtures are created per run so the queue, ownership,
// priority, status, comments and notes are asserted against known state.

async function openTicketFromQueue(page: Page, ticketNumber: string): Promise<void> {
  await page.locator("#queue-search").fill(ticketNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: `Open ticket ${ticketNumber}` }).first().click();
  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
}

test.describe("IT Staff ticket flow (E2E-03, E2E-04)", () => {
  test("E2E-03: staff claim, set IT priority, transition status, and post a comment and an internal note", async ({
    page,
  }) => {
    const requester = await createActiveRequester(`E2E Staff ${uniqueSuffix()}`);
    const summary = `E2E staff flow ${uniqueSuffix()}`;
    const { ticketNumber } = await createTicketViaApi(requester, {
      summary,
      description: "End-to-end IT Staff workflow: claim, priority, status, comment, note.",
      categoryName: "Network",
      relatedSystemName: "VPN Gateway",
      requestedPriority: "HIGH",
    });

    await loginToShell(page, STAFF);
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    await openTicketFromQueue(page, ticketNumber);

    const info = page.locator('section[aria-labelledby="staff-ticket-info-heading"]');
    await expect(info.getByText("Ticket Information")).toBeVisible();
    await expect(info.getByText("Unassigned")).toBeVisible();

    // Claim (FR-14): the ticket is now owned by the signed-in staff member.
    await page.getByRole("button", { name: "Claim ticket" }).click();
    await expect(page.getByTestId("ticket-owner")).toHaveText("Dan Das");
    await expect(page.getByRole("button", { name: "You own this ticket" })).toBeVisible();

    // IT Priority (FR-15).
    await page.locator("#it-priority").selectOption("URGENT");
    await page.getByRole("button", { name: "Save IT Priority" }).click();
    await expect(info.getByText("URGENT")).toBeVisible();

    // Permitted status transition (FR-16): NEW -> OPEN.
    await page.locator("#status-transition").selectOption("OPEN");
    await page.getByRole("button", { name: "Update Status" }).click();
    await expect(info.getByText("OPEN")).toBeVisible();

    // Public Comment (FR-10).
    const comment = `Public update ${uniqueSuffix()}`;
    await page.locator("#staff-comment-content").fill(comment);
    await page.getByRole("button", { name: "Post Comment" }).click();
    await expect(
      page.locator('[data-testid="staff-public-comments-list"]').getByText(comment)
    ).toBeVisible();

    // Internal Note (AC-17) — distinct panel with an explicit Internal marker.
    const note = `Private diagnostics ${uniqueSuffix()}`;
    await page.locator("#staff-note-content").fill(note);
    await page.getByRole("button", { name: "Save Note" }).click();
    await expect(
      page.locator('[data-testid="staff-internal-notes-list"]').getByText(note)
    ).toBeVisible();
    await expect(page.locator("#staff-internal-notes-heading")).toBeVisible();

    // Back navigation returns to the queue.
    await page.getByRole("button", { name: "Back to Queue" }).click();
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  });

  test("E2E-04: the Requester's resolution indication is visible to staff without changing the status", async ({
    page,
  }) => {
    const requester = await createActiveRequester(`E2E Resolved ${uniqueSuffix()}`);
    const { id, ticketNumber } = await createTicketViaApi(requester, {
      summary: `E2E resolved indication ${uniqueSuffix()}`,
      description: "The Requester records that the problem appears resolved (FR-11, BR-11).",
      categoryName: "Hardware",
      relatedSystemName: "ERP System",
      requestedPriority: "MEDIUM",
    });
    await indicateResolvedViaApi(requester, id);

    await loginToShell(page, STAFF);
    await openTicketFromQueue(page, ticketNumber);

    const indication = page.getByTestId("requester-indication");
    await expect(indication).toBeVisible();
    await expect(indication).toContainText(/appears resolved/i);

    // The indication does not perform a formal transition (BR-11).
    const info = page.locator('section[aria-labelledby="staff-ticket-info-heading"]');
    await expect(info.getByText("NEW")).toBeVisible();
  });
});
