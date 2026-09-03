import { test, expect } from "@playwright/test";
import {
  selectRequester,
  goToCreateTicket,
  fillTicket,
  submitTicket,
  openTicketFromMyTickets,
} from "./helpers.js";

// E2E-01 (AC-01, AC-05) + E2E-02 (AC-09) — requester-ticket-flow.spec.ts.
// Requires the API server on :3000 (see README / playwright.config.ts).

const REQUESTER = "Alice Anderson";

test.describe.serial("Requester ticket flow (E2E-01, E2E-02)", () => {
  test("E2E-01: creates a Ticket, sees the official number, then finds it in My Tickets", async ({
    page,
  }) => {
    await selectRequester(page, REQUESTER);
    await goToCreateTicket(page);

    const summary = `E2E battery issue ${Date.now()}`;
    await fillTicket(page, {
      summary,
      description: "Wait time on responsiveness is too long during E2E run.",
      category: "Hardware",
      relatedSystem: "ERP System",
      requestedPriority: "HIGH",
    });

    const { ticketNumber } = await submitTicket(page);
    // Official number has the required format and comes from the backend.
    expect(ticketNumber).toMatch(/^TK-\d{6}$/);

    // "View in My Tickets" takes the requester straight to the list.
    await page.getByRole("button", { name: "View in My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    // The newly created Ticket appears with its official number (AC-05).
    const openBtn = page.getByRole("button", { name: `Open ticket ${ticketNumber}` });
    await expect(openBtn).toBeVisible();

    // AC-01/AC-05: open the detail and confirm summary + status.
    await openBtn.click();
    await expect(page.getByText(ticketNumber, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(summary)).toBeVisible();
    await expect(page.getByText("SUBMITTED")).toBeVisible();
  });

  test("E2E-02: uploads an Attachment, then soft-removes it; download is blocked", async ({
    page,
  }) => {
    await selectRequester(page, REQUESTER);
    await goToCreateTicket(page);

    const summary = `E2E attachment ${Date.now()}`;
    await fillTicket(page, {
      summary,
      description: "Attachment lifecycle check (upload, remove, download blocked).",
      category: "Software",
      relatedSystem: "CRM System",
      requestedPriority: "MEDIUM",
    });
    const { ticketNumber } = await submitTicket(page);
    await page.getByRole("button", { name: "View in My Tickets" }).click();

    // AC-11: upload a valid PNG attachment.
    await openTicketFromMyTickets(page, ticketNumber);
    await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();
    await expect(page.getByText("No attachments yet.")).toBeVisible();

    const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB", "base64");
    await page
      .getByTestId("attachment-file-input")
      .setInputFiles({ name: "e2e-sample.png", mimeType: "image/png", buffer });
    await page.getByRole("button", { name: "Upload Attachment" }).click();

    // FR-17/AC-12: metadata visible.
    await expect(page.getByText("e2e-sample.png")).toBeVisible();
    await expect(page.getByText("Active").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();

    // AC-09 / FR-18: soft-remove with a reason, then download is blocked (410).
    page.on("dialog", (dialog) => dialog.accept("No longer needed."));
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/Removed — No longer needed\./)).toBeVisible();
    await expect(page.getByText("Blocked", { exact: true })).toBeVisible();
    // The attachment row no longer offers Download/Remove actions.
    await expect(page.getByRole("button", { name: "Download" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  });
});
