import { test, expect } from "@playwright/test";
import {
  createRequesterNeedingChange,
  login,
  logout,
  uniqueSuffix,
} from "./helpers.js";

// Lab 3 (Issue 24) — E2E-01 / E2E-02, authentication (labs-sheet §8.1, §10;
// tests.md §2). AC-01, AC-02, AC-08.
//
// Each test creates its own Requester through the Administrator API, so the
// mandatory first-login change is exercised against a fresh account and the
// suite is repeatable without reseeding.

test.describe("Authentication end to end (E2E-01, E2E-02)", () => {
  test("E2E-01: gates the app on first login, opens it after a valid change, and blocks access again after logout", async ({
    page,
  }) => {
    const requester = await createRequesterNeedingChange(`E2E One ${uniqueSuffix()}`);
    const newPassword = "BrandNew!23";

    // Login succeeds but the mandatory change screen replaces the app (AC-02).
    await login(page, requester.email, requester.initialPassword);
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Logout" })).toHaveCount(0);

    // Reloading keeps the gate (the session still requires a change).
    await page.reload();
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);

    // A valid change opens the app for the Requester role.
    await page.locator("#current-password").fill(requester.initialPassword);
    await page.locator("#new-password").fill(newPassword);
    await page.locator("#confirm-password").fill(newPassword);
    await page.getByRole("button", { name: "Update Password" }).click();

    await expect(page.getByText("Password updated.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByText(requester.name)).toBeVisible();

    // Logout removes access; the app screens are no longer reachable (AC-08).
    await logout(page);
    await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: /IT Service Desk/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);
  });

  test("E2E-02: rejects a policy-breaking new password and only proceeds after a valid one", async ({
    page,
  }) => {
    const requester = await createRequesterNeedingChange(`E2E Two ${uniqueSuffix()}`);
    const newPassword = "FreshPass!23";

    await login(page, requester.email, requester.initialPassword);
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();

    // Weak password: near-field policy message, still gated.
    await page.locator("#current-password").fill(requester.initialPassword);
    await page.locator("#new-password").fill("short");
    await page.locator("#confirm-password").fill("short");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);

    // Mismatched confirmation: near-field message, still gated.
    await page.locator("#new-password").fill(newPassword);
    await page.locator("#confirm-password").fill("DoesNotMatch!23");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toHaveCount(0);

    // Valid change opens the app.
    await page.locator("#confirm-password").fill(newPassword);
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  });
});
