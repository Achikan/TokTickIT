#!/usr/bin/env node
// Issue 15 — create deterministic Lab 2 test data for report screenshots.
// Creates tickets for each active requester via the live API so My Tickets can
// show search / filter / sort / pagination / empty / no-results / cross-requester
// states (rubric Parts 6-8).
//
// Requires the API server on :3000. Idempotent-ish (skips is not tracked; run
// it at most a couple of times, or clear attachments/tickets as needed).

const API = process.env.API_URL ?? "http://localhost:3000";

async function getRequesters() {
  const res = await fetch(`${API}/api/development-requesters`, {
    headers: { "Content-Type": "application/json" },
  });
  const body = await res.json();
  return body.items;
}

async function getCategories() {
  const res = await fetch(`${API}/api/categories`);
  return res.json();
}

async function getSystems() {
  const res = await fetch(`${API}/api/related-systems`);
  const body = await res.json();
  return body.items;
}

const TICKETS = {
  // Alice Anderson — several tickets across categories/priorities/statuses so
  // My Tickets demonstrates the full list, filters, sorting, and pagination.
  "Alice Anderson": [
    { summary: "Laptop battery drains quickly", category: "Hardware", system: "VPN Gateway", priority: "HIGH" },
    { summary: "Cannot access email on mobile", category: "Email", system: "Email Server", priority: "URGENT" },
    { summary: "VPN keeps disconnecting", category: "Network", system: "VPN Gateway", priority: "MEDIUM" },
    { summary: "Printer jam in room 204", category: "Printing", system: "Network Infrastructure", priority: "LOW" },
    { summary: "Request new ERP report template", category: "Application Support", system: "ERP System", priority: "MEDIUM" },
    { summary: "Software license renewal", category: "Software", system: "HR System", priority: "HIGH" },
    { summary: "New employee account setup", category: "Account and Access", system: "HR System", priority: "URGENT" },
    { summary: "Data backup verification", category: "Data and Backup", system: "ERP System", priority: "MEDIUM" },
  ],
  // Bob Brown — a smaller, distinct set for cross-requester ownership evidence.
  "Bob Brown": [
    { summary: "Monitor flickering", category: "Hardware", system: "CRM System", priority: "MEDIUM" },
    { summary: "Reset CRM password", category: "Account and Access", system: "CRM System", priority: "HIGH" },
  ],
  // Carol Chen — intentionally kept empty for the "no tickets yet" empty state.
  "Carol Chen": [],
};

async function createTicket(requester, category, system, priority, summary) {
  const res = await fetch(`${API}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requester-Id": String(requester.id),
    },
    body: JSON.stringify({
      requesterId: requester.id,
      summary,
      description: `Report evidence ticket: ${summary}.`,
      categoryId: category.id,
      relatedSystemId: system.id,
      requestedPriority: priority,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`create failed for "${summary}": ${res.status} ${err}`);
  }
  const body = await res.json();
  return body.ticket;
}

const requesters = await getRequesters();
const categories = await getCategories();
const systems = await getSystems();

const byName = (list, n) => list.find((x) => x.name === n);

for (const r of requesters) {
  const plans = TICKETS[r.name];
  if (!plans) continue; // David/Evan/others get no extra data
  for (const t of plans) {
    const category = byName(categories, t.category);
    const system = byName(systems, t.system);
    if (!category || !system) {
      console.warn(`skip ${r.name} "${t.summary}": missing category/system`);
      continue;
    }
    const created = await createTicket(r, category, system, t.priority, t.summary);
    console.log(`created ${r.name} -> ${created.ticketNumber}`);
  }
}
console.log("done");
