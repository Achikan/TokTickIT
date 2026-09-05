#!/usr/bin/env node
// Issue 15 — capture the Requester-Selection loading state (rubric Part 5/6:
// "loading state"). Uses a delayed route so the transient "Loading
// development requesters…" text is deterministically captured.
//
// Note: the Create-Ticket form does not render a separate "Loading…" state in
// the current implementation (formState starts at "idle"), so only the
// Requester-Selection loading state is captured here.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const shot = async (page, dir, file) => {
  const target = path.join(OUT, dir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: false });
  console.log("saved", path.relative(ROOT, target));
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/api/development-requesters", async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await page.goto(CLIENT_URL);
  await page.getByText("Loading development requesters…").waitFor();
  await shot(page, "requester-selection", "loading.png");
  await page.close();
} finally {
  await browser.close();
}
console.log("done");
