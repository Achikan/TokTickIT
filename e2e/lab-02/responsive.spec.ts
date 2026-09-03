import { test, expect, Page } from "@playwright/test";
import {
  selectRequester,
  goToCreateTicket,
  fillTicket,
  submitTicket,
  openTicketFromMyTickets,
} from "./helpers.js";

// RESP-01 (AC-07, AC-13) — responsive.spec.ts runs on desktop/tablet/mobile.
// Asserts no unintended horizontal page scrolling and usable controls.

const REQUESTER = "Alice Anderson";

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow, "page should not scroll horizontally").toBe(false);
}

test.describe("Responsive behavior (RESP-01)", () => {
  test("requester-selection screen has no horizontal scroll and usable Continue", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByLabel("Development Requester")).toBeVisible();
    await expectNoHorizontalScroll(page);
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeDisabled();
    await expect(continueBtn).toBeVisible();
  });

  test("Create Ticket stacks fields without clipping or h-scroll", async ({ page }) => {
    await selectRequester(page, REQUESTER);
    await goToCreateTicket(page);
    await expectNoHorizontalScroll(page);

    // Core controls are visible and usable without any viewport size.
    for (const sel of ["#categoryId", "#relatedSystemId", "#requestedPriority"]) {
      await expect(page.locator(sel)).toBeVisible();
    }
    await expect(page.locator("#summary")).toBeVisible();
    await expect(page.locator("#description")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Ticket" })).toBeVisible();

    // Mobile/tablet: the form is operable end to end at this viewport.
    await fillTicket(page, {
      summary: `Responsive ticket ${Date.now()}`,
      description: "Layout should remain usable at every viewport.",
      category: "Network",
      relatedSystem: "Email Server",
      requestedPriority: "HIGH",
    });
    await submitTicket(page);
    await expectNoHorizontalScroll(page);
  });

  test("My Tickets table/cards and Ticket Detail have no h-scroll or hidden controls", async ({
    page,
  }) => {
    await selectRequester(page, REQUESTER);
    await goToCreateTicket(page);
    await fillTicket(page, {
      summary: `Responsive detail ${Date.now()}`,
      description: "Requester Ticket Detail must stay readable and usable.",
      category: "Printing",
      relatedSystem: "VPN Gateway",
      requestedPriority: "URGENT",
    });
    const { ticketNumber } = await submitTicket(page);
    await page.getByRole("button", { name: "View in My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expectNoHorizontalScroll(page);

    // Controls remain usable at this viewport.
    await expect(page.getByRole("button", { name: "Create a new ticket" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toBeVisible();

    // Open the detail and assert readable read-only fields + no h-scroll.
    await openTicketFromMyTickets(page, ticketNumber);
    await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();
    await expect(page.getByText("Summary & Description")).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to My Tickets" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
