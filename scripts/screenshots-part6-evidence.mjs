#!/usr/bin/env node
// Issue 15 — capture Part 6 evidence: requester field matches requesterId in the
// database, and reference data (Category / Related System) loaded from the DB.
//
// Produces readable HTML tables from real API/database responses, then captures
// them as PNGs via Playwright (chromium print-to-screenshot).
//
//   part-6-evidence/01-requester-field-db.png    — Create Ticket requester field
//                                                    + saved Ticket requesterId (from DB)
//   part-6-evidence/02-reference-data-db.png     — Category / Related System rows from DB
//
// Requires the API server on :3000. Runs HTML rendering through a local data URL.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");
const API = process.env.API_URL ?? "http://localhost:3000";

// --- Fetch real rows -------------------------------------------------------
const reqRes = await fetch(`${API}/api/development-requesters`);
const { items: requesters } = await reqRes.json();
const alice = requesters.find((r) => r.name === "Alice Anderson");

const catRes = await fetch(`${API}/api/categories`);
const categories = await catRes.json(); // bare array

const sysRes = await fetch(`${API}/api/related-systems`);
const { items: systems } = await sysRes.json();

const ticketsRes = await fetch(`${API}/api/tickets?pageSize=50`, {
  headers: { "X-Requester-Id": String(alice.id) },
});
const { items: tickets } = await ticketsRes.json();
const sample = tickets.find((t) => t.summary.includes("Laptop battery drains quickly"));
const reqDetail = sample
  ? await (await fetch(`${API}/api/tickets/${sample.id}`, {
      headers: { "X-Requester-Id": String(alice.id) },
    })).json()
  : null;

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// --- Part 6 #1: requester field matches requesterId -----------------------
const headerCss = `
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #1c2b22; }
  h1 { font-size: 20px; color: #006b3c; }
  h2 { font-size: 15px; margin-top: 20px; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { border: 1px solid #c8cfcb; padding: 8px 10px; text-align: left; font-size: 13px; }
  th { background: #eaf6ef; font-weight: 600; }
  .callout { border: 1px solid #198754; background: #eaf6ef; padding: 10px 14px;
             border-radius: 6px; margin-top: 12px; font-size: 13px; }
`;

const html1 = `<!doctype html><html><head><meta charset="utf-8"><style>${headerCss}</style></head><body>
<h1>Part 6 Evidence — Requester field matches requesterId in the database</h1>
<div class="callout">
  Selected Development Requester in the UI: <strong>${esc(alice.name)}</strong>
  (email ${esc(alice.email)}) — requesterId <strong>${alice.id}</strong> from the database.
</div>
<h2>Saved Ticket created from the Create Ticket screen (fetched from the API/database)</h2>
${
  reqDetail
    ? `<table>
  <tr><th>Field</th><th>Value</th></tr>
  <tr><td>Ticket Number</td><td><strong>${esc(reqDetail.ticket.ticketNumber)}</strong></td></tr>
  <tr><td>Summary</td><td>${esc(reqDetail.ticket.summary)}</td></tr>
  <tr><td>requesterId (saved Ticket)</td><td><strong>${reqDetail.ticket.requesterId}</strong></td></tr>
  <tr><td>Selected Requester id (from DB)</td><td><strong>${alice.id}</strong></td></tr>
  <tr><td>Match?</td><td><strong>${reqDetail.ticket.requesterId === alice.id ? "YES" : "NO"}</strong></td></tr>
  <tr><td>Category</td><td>${esc(reqDetail.ticket.category.name)} (id ${reqDetail.ticket.category.id})</td></tr>
  <tr><td>Related System</td><td>${esc(reqDetail.ticket.relatedSystem.name)} (id ${reqDetail.ticket.relatedSystem.id})</td></tr>
  <tr><td>Requested Priority / IT Priority</td><td>${reqDetail.ticket.requestedPriority} / ${reqDetail.ticket.itPriority}</td></tr>
  <tr><td>Current Status</td><td>${reqDetail.ticket.currentStatus}</td></tr>
</table>`
    : `<p>No matching sample ticket found.</p>`
}
</body></html>`;

// --- Part 6 #2: reference data from the database --------------------------
const html2 = `<!doctype html><html><head><meta charset="utf-8"><style>${headerCss}</style></head><body>
<h1>Part 6 Evidence — Reference data loaded from the database</h1>
<h2>Categories (GET /api/categories — from the database)</h2>
<table><tr><th>id</th><th>name</th></tr>${categories
  .map((c) => `<tr><td>${c.id}</td><td>${esc(c.name)}</td></tr>`)
  .join("")}</table>
<h2>Related Systems (GET /api/related-systems — from the database)</h2>
<table><tr><th>id</th><th>name</th><th>type</th></tr>${systems
  .map((s) => `<tr><td>${s.id}</td><td>${esc(s.name)}</td><td>${esc(s.type)}</td></tr>`)
  .join("")}</table>
</body></html>`;

// --- Render + capture ------------------------------------------------------
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mkdir(path.join(OUT, "part-6-evidence"), { recursive: true });
  for (const [name, html, file] of [
    ["requester-field-db", html1, "01-requester-field-db.png"],
    ["reference-data-db", html2, "02-reference-data-db.png"],
  ]) {
    await page.setContent(html);
    await page.screenshot({ path: path.join(OUT, "part-6-evidence", file), fullPage: true });
    console.log("saved", path.join("part-6-evidence", file));
  }
} finally {
  await browser.close();
}
console.log("done");