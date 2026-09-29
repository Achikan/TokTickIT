import { test, expect } from "@playwright/test";
import {
  ADMIN,
  login,
  loginToShell,
  logout,
  uniqueEmail,
  uniqueSuffix,
} from "./helpers.js";

// Lab 3 (Issue 24) — E2E-05, Administrator user management (labs-sheet §8.5,
// §12; tests.md §2). AC-19, AC-20.
//
// The Administrator creates a user through the UI with an initial password,
// then that new user signs in and must complete the mandatory first-login
// password change before any application screen appears.

test.describe("Administrator user management end to end (E2E-05)", () => {
  test("E2E-05: admin creates a user; the new user must change the initial password at first login", async ({
    page,
  }) => {
    const name = `E2E Admin User ${uniqueSuffix()}`;
    const email = uniqueEmail("e2e.admin.created");
    const initialPassword = "InitPass!23";
    const newPassword = "ChangedPass!23";

    // Administrator home (AC-18): the User Management screen shows the list.
    await loginToShell(page, ADMIN);
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    // Create a user with one permitted role and an initial password (AC-19).
    await page.getByRole("button", { name: "Create user" }).click();
    await expect(page.getByRole("heading", { name: "Create user" })).toBeVisible();
    await page.locator("#user-name").fill(name);
    await page.locator("#user-email").fill(email);
    await page.locator("#user-role").selectOption("REQUESTER");
    await page.locator("#user-initial-password").fill(initialPassword);
    await page
      .getByRole("region", { name: "Create user" })
      .getByRole("button", { name: "Create user" })
      .click();

    await expect(page.getByText(new RegExp(`User "${name}" created.*next login`))).toBeVisible();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();
    await expect(page.getByRole("button", { name: `Edit user ${name}` })).toBeVisible();

    // The initial password forces a change at the next login (AC-20).
    await logout(page);
    await login(page, email, initialPassword);
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);

    await page.locator("#current-password").fill(initialPassword);
    await page.locator("#new-password").fill(newPassword);
    await page.locator("#confirm-password").fill(newPassword);
    await page.getByRole("button", { name: "Update Password" }).click();

    await expect(page.getByText("Password updated.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();
  });
});