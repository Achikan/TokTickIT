import { test, expect, type Page } from "@playwright/test";
import {
  createRequesterNeedingChange,
  expectNoHorizontalScroll,
  login,
  loginToShell,
  uniqueSuffix,
} from "./helpers.js";

// Lab 3 (Issue 24) — A11Y-01, accessibility conventions (labs-sheet §8.7
// "Same as Lab 2", ui-spec §8; tests.md §2). AC-23.
//
// Verifies the Zen Green screens keep a single document-level heading, bind
// every label to its control, expose the expected landmarks to assistive
// technology, and keep keyboard focus visible while moving through the form.

const STAFF = { email: "dan.das@example.com", password: "DevPass!23" };

async function visibleFocusIndicator(page: Page, locator: string): Promise<boolean> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.boxShadow !== "none" || style.outlineStyle !== "none";
  }, locator);
}

test.describe("Accessibility conventions (A11Y-01)", () => {
  test("login screen: one h1, labelled inputs, and keyboard focus visibility", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);

    // Every input is reachable by its visible label (ui-spec §8).
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    // Keyboard tab order: Email -> Password -> Sign In, with a visible focus ring.
    await page.locator("#login-email").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#login-password")).toBeFocused();
    expect(await visibleFocusIndicator(page, "#login-password")).toBe(true);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeFocused();
    expect(await visibleFocusIndicator(page, "button[type='submit']")).toBe(true);

    await expectNoHorizontalScroll(page);
  });

  test("mandatory Change Password screen: one h1 and labelled controls", async ({ page }) => {
    const requester = await createRequesterNeedingChange(`E2E A11Y PW ${uniqueSuffix()}`);
    await login(page, requester.email, requester.initialPassword);
    await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);

    await expect(page.getByLabel("Current Password")).toBeVisible();
    await expect(page.locator("#new-password")).toBeVisible();
    await expect(page.locator("#confirm-password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Update Password" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("authenticated shell: banner, navigation and main landmarks with a single h1", async ({
    page,
  }) => {
    await loginToShell(page, STAFF);

    // Landmarks an assistive-technology user can jump between (ui-spec §8.1).
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();

    // The signed-in identity is announced as text, never color alone.
    const banner = page.getByRole("banner");
    await expect(banner.getByText("Signed in:")).toBeVisible();
    await expect(banner.getByText("Dan Das")).toBeVisible();
    await expect(banner.getByText("IT Staff")).toBeVisible();

    // A single document-level heading keeps the hierarchy predictable.
    await expect(page.locator("h1")).toHaveCount(1);
    await expectNoHorizontalScroll(page);
  });
});