import { test, expect } from "@playwright/test";
import {
  STAFF,
  CAROL,
  loginToShell,
  logout,
  openTicketFromQueue,
  openTicketFromMyTickets,
  ensureRequesterPassword,
  uniqueSuffix,
} from "./helpers.js";

// Lab 4 (Issue 31/37) — E2E-01: Actions Taken flow (specification.md AC-01, AC-07, AC-10, AC-25, AC-26)
test.describe("Actions Taken Flow (E2E-01)", () => {
  test.beforeAll(async () => {
    await ensureRequesterPassword(CAROL.email);
  });

  test("staff records action with follow-up validation, edits action, and requester verifies read-only access", async ({
    page,
  }) => {
    // 1. Staff signs in and navigates to ticket TK-001003
    await loginToShell(page, STAFF);
    await openTicketFromQueue(page, "TK-001003");

    // 2. Actions Taken section is rendered with existing actions
    const section = page.locator("#actions-taken-heading");
    await expect(section).toBeVisible();
    await expect(page.locator("table")).toBeVisible();

    // 3. Open Add Action form and test Follow-up validation
    const addBtn = page.getByRole("button", { name: "Add Action" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const form = page.getByRole("form", { name: "Add action" });
    await expect(form).toBeVisible();

    // Fill description and check follow-up without note -> validation error
    const desc = `E2E action description ${uniqueSuffix()}`;
    await page.locator("#action-actionDescription").fill(desc);
    await page.locator("#action-followUpRequired").check();
    await page.getByRole("button", { name: "Save Action" }).click();

    // Field error is displayed near follow-up note
    await expect(
      page.getByText("A Follow-up Note is required when follow-up is needed.")
    ).toBeVisible();

    // Fill follow-up note and save
    const note = "Need to check roller alignment in next shift.";
    await page.locator("#action-followUpNote").fill(note);
    await page.getByRole("button", { name: "Save Action" }).click();

    // 4. Saved action appears in the table with performer name
    await expect(page.getByText(desc)).toBeVisible();
    await expect(page.getByText(STAFF.email).or(page.getByText("Dan Das"))).toBeVisible();

    // 5. Edit mode: click Edit on the action
    const editBtn = page.locator('button[aria-label^="Edit action"]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editForm = page.getByRole("form", { name: "Edit action" });
    await expect(editForm).toBeVisible();
    // Performed by is read-only
    await expect(page.locator("#action-performedBy")).toBeDisabled();

    // Update result and save
    const resultText = `Resolved verified via test print ${uniqueSuffix()}`;
    await page.locator("#action-result").fill(resultText);
    await page.getByRole("button", { name: "Save Action" }).click();
    await expect(page.getByText(resultText)).toBeVisible();

    // 6. Requester view: verify read-only access (no Add/Edit buttons)
    await logout(page);
    await loginToShell(page, CAROL);
    await openTicketFromMyTickets(page, "TK-001003");

    await expect(page.locator("#actions-taken-heading")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Action" })).toHaveCount(0);
    await expect(page.locator('button[aria-label^="Edit action"]')).toHaveCount(0);
    // Actions are still readable
    await expect(page.getByText(resultText)).toBeVisible();
  });
});
