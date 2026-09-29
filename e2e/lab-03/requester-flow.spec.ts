import { test, expect } from "@playwright/test";
import { createActiveRequester, loginToShell, uniqueSuffix } from "./helpers.js";

// Lab 3 (Issue 24) — AC-12, Requester regression end to end (labs-sheet §10
// "Requester regression"; specification.md AC-12; tests.md §2).
//
// The Lab 2 Requester functions (Create Ticket, My Tickets, Ticket Detail,
// Attachments) now run against the authenticated session: the Requester comes
// from the signed-in identity, never from a development selector. These specs
// drive the UI itself (not the API) so the full submission path is covered,
// satisfying AC-12 and the Definition of Done mapping.

test.describe("Requester ticket flow with session identity (AC-12)", () => {
  test("creates a ticket through the UI, then finds and opens it in My Tickets", async ({
    page,
  }) => {
    const requester = await createActiveRequester(`E2E Req Flow ${uniqueSuffix()}`);
    const summary = `Requester flow ${uniqueSuffix()}`;

    await loginToShell(page, requester);
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    // Create Ticket is reached through the authenticated shell navigation.
    await page.getByRole("button", { name: "Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();

    // The Requester is read from the session identity, not a selector (AC-12).
    await expect(page.locator("#requester-readonly")).toHaveValue(new RegExp(requester.email));

    await page.locator("#categoryId").selectOption({ label: "Hardware" });
    await page.locator("#relatedSystemId").selectOption({ label: "ERP System" });
    await page.locator("#requestedPriority").selectOption({ label: "HIGH" });
    await page.locator("#summary").fill(summary);
    await page.locator("#description").fill("Full UI submission under the session identity.");

    await page.getByRole("button", { name: "Submit Ticket" }).click();

    // Official Ticket Number comes from the backend (AC-05 format).
    const created = page.getByText("Ticket created.");
    await expect(created).toBeVisible();
    const alertText = await created
      .locator("xpath=ancestor::div[contains(@class,'alert')]")
      .innerText();
    const match = alertText.match(/TK-\d{6}/);
    if (!match) throw new Error(`Ticket number not found in: ${alertText}`);
    const ticketNumber = match[0];

    // View in My Tickets -> the new ticket appears with its official number.
    await page.getByRole("button", { name: "View in My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    const openBtn = page.getByRole("button", { name: `Open ticket ${ticketNumber}` });
    await expect(openBtn).toBeVisible();

    // Ticket Detail shows number, summary and status as in Lab 2 (FR-09).
    await openBtn.click();
    await expect(page.getByText(ticketNumber, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(summary)).toBeVisible();
    await expect(page.getByText("NEW")).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to My Tickets" })).toBeVisible();
  });

  test("uploads and soft-removes an Attachment from the session-authenticated detail", async ({
    page,
  }) => {
    const requester = await createActiveRequester(`E2E Req Attach ${uniqueSuffix()}`);
    const summary = `Requester attachment ${uniqueSuffix()}`;

    await loginToShell(page, requester);
    await page.getByRole("button", { name: "Create Ticket" }).click();
    await page.locator("#categoryId").selectOption({ label: "Software" });
    await page.locator("#relatedSystemId").selectOption({ label: "CRM System" });
    await page.locator("#requestedPriority").selectOption({ label: "MEDIUM" });
    await page.locator("#summary").fill(summary);
    await page.locator("#description").fill("Attachment lifecycle under session authentication.");

    await page.getByRole("button", { name: "Submit Ticket" }).click();
    const created = page.getByText("Ticket created.");
    await expect(created).toBeVisible();
    const alertText = await created
      .locator("xpath=ancestor::div[contains(@class,'alert')]")
      .innerText();
    const match = alertText.match(/TK-\d{6}/);
    if (!match) throw new Error(`Ticket number not found in: ${alertText}`);
    const ticketNumber = match[0];

    await page.getByRole("button", { name: "View in My Tickets" }).click();
    await page.getByRole("button", { name: `Open ticket ${ticketNumber}` }).click();
    await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();
    await expect(page.getByText("No attachments yet.")).toBeVisible();

    // Upload a valid PNG attachment (Lab 2 E2E-02, now session-authenticated).
    const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB", "base64");
    await page
      .getByTestId("attachment-file-input")
      .setInputFiles({ name: "e2e-sample.png", mimeType: "image/png", buffer });
    await page.getByRole("button", { name: "Upload Attachment" }).click();

    await expect(page.getByText("e2e-sample.png")).toBeVisible();
    await expect(page.getByText("Active").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();

    // Soft-remove with a reason; download is no longer offered (FR-18).
    await page.getByRole("button", { name: "Remove" }).click();
    await page.getByLabel(/Removal reason for/).fill("No longer needed.");
    await page.getByRole("button", { name: "Confirm Removal" }).click();
    await expect(page.getByText(/Removed — No longer needed\./)).toBeVisible();
    await expect(page.getByText("Blocked", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" })).toHaveCount(0);
  });
});