import { defineConfig } from "@playwright/test";

// End-to-end + responsive tests (Issue 13) and visual screenshots.
//
// Prereq: the API server must be running on :3000 against the Postgres DB.
// Because Postgres.app rejects connections from the root shell, the server is
// NOT auto-started by Playwright here (only the Vite client is). Start it with:
//   su - yayee -c "cd /Users/yayee/Desktop/TokTickIT/server && npm run dev"
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const API_URL = process.env.API_URL ?? "http://localhost:3000";

// Standard viewports used by the responsive suite (ui-spec §8.7).
export const VIEWPORTS = {
  desktop: { name: "desktop", width: 1280, height: 900 },
  tablet: { name: "tablet", width: 820, height: 900 },
  mobile: { name: "mobile", width: 390, height: 844 },
} as const;

export default defineConfig({
  testDir: "./e2e/lab-02",
  // The server assigns official ticket numbers from a running count, so ticket
  // creation must be serialized to avoid collisions. E2E runs are lightweight;
  // run them sequentially with a single worker for deterministic results.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: CLIENT_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm --prefix client run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: `${CLIENT_URL}/`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      // Desktop runs the full requester-ticket-flow spec (E2E-01/02) plus the
      // responsive checks. No testMatch -> runs everything under e2e/lab-02.
      name: "desktop-chromium",
      use: { browserName: "chromium", viewport: VIEWPORTS.desktop },
    },
    {
      name: "tablet-chromium",
      use: { browserName: "chromium", viewport: VIEWPORTS.tablet },
      testMatch: /responsive\.spec\.ts/,
    },
    {
      name: "mobile-chromium",
      use: { browserName: "chromium", viewport: VIEWPORTS.mobile },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
});

export { CLIENT_URL, API_URL };
