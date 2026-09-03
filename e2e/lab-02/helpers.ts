import { Page, expect } from "@playwright/test";

// Shared helpers for the Lab 2 end-to-end and responsive flows.

export async function selectRequester(page: Page, name: string): Promise<void> {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /IT Service Desk/, exact: false })
  ).toBeVisible();
  await page.getByLabel("Development Requester").selectOption({ label: name });
  await page.getByRole("button", { name: "Continue" }).click();
  // Shell appears showing the selected requester.
  await expect(page.getByText(`Selected Requester: ${name}`)).toBeVisible();
}

export async function goToCreateTicket(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Create a new ticket" }).click();
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  // Wait for reference data (Category / Related System options) to load.
  await expect(page.locator("#categoryId option")).toHaveCount(9); // 1 placeholder + 8
  await expect(page.locator("#relatedSystemId option")).toHaveCount(7); // 1 placeholder + 6
}

export interface TicketFields {
  summary: string;
  description: string;
  category: string;
  relatedSystem: string;
  requestedPriority: string;
}

export async function fillTicket(
  page: Page,
  {
    summary,
    description,
    category,
    relatedSystem,
    requestedPriority,
  }: TicketFields
): Promise<void> {
  await page.locator("#categoryId").selectOption({ label: category });
  await page.locator("#relatedSystemId").selectOption({ label: relatedSystem });
  await page.locator("#requestedPriority").selectOption({ label: requestedPriority });
  await page.locator("#summary").fill(summary);
  await page.locator("#description").fill(description);
}

export async function submitTicket(page: Page): Promise<{ ticketNumber: string }> {
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  const created = page.getByText("Ticket created.");
  await expect(created).toBeVisible();
  const alertText = await created
    .locator("xpath=ancestor::div[contains(@class,'alert')]")
    .innerText();
  const match = alertText.match(/TK-\d{6}/);
  if (!match) throw new Error(`Ticket number not found in: ${alertText}`);
  return { ticketNumber: match[0] };
}

export async function openTicketFromMyTickets(
  page: Page,
  ticketNumber: string
): Promise<void> {
  await page.getByRole("button", { name: `Open ticket ${ticketNumber}` }).first().click();
  await expect(page.getByText(ticketNumber, { exact: true }).first()).toBeVisible();
}
