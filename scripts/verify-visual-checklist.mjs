#!/usr/bin/env node
// Lab 3 — machine-verified visual inspection checklist (sheet §8.7 / ui-spec §11).
//
// The sheet asks for a completed checklist covering nine items: design
// consistency, role navigation, badges, editable/read-only fields, validation
// placement, focus, clipping, overlap and horizontal overflow. Writing "looks
// fine" by eye is not evidence, so every item is measured in a real browser at
// four viewports and the result is printed as a table.
//
//   node scripts/verify-visual-checklist.mjs            # all roles, 4 viewports
//   VIEWPORTS=1280 node scripts/verify-visual-checklist.mjs
//   ROLES=staff node scripts/verify-visual-checklist.mjs
//
// Requires the API on :3000 and the Vite client on :5173 (the script reseeds
// first, like the screenshot script, because it navigates by seeded content).
// Exit code is non-zero if any check fails, so it can be run in CI.

import { chromium, request } from "@playwright/test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const API_URL = process.env.API_URL ?? "http://localhost:3000";
const JSON_HEADERS = { "X-CSRF-Protected": "1", "Content-Type": "application/json" };

// ui-spec §1 colour tokens — the check compares computed styles against these.
const TOKENS = {
  primary: "rgb(0, 107, 60)", // #006B3C
  secondary: "rgb(11, 122, 70)", // #0B7A46
  pageBg: "rgb(245, 247, 246)", // #F5F7F6
  surface: "rgb(255, 255, 255)",
};

const ACCOUNTS = {
  admin: { email: "henri.ito@example.com", password: "DevPass!23", role: "ADMIN" },
  staff: { email: "dan.das@example.com", password: "DevPass!23", role: "IT_STAFF" },
};

// Which navigation destinations each role may see (ui-spec §3.3, §4, §5, §7).
// These mirror App.tsx exactly: a role only ever sees its own destinations, so a
// leaked "My Tickets" for staff or a leaked "User Management" for IT staff fails.
const ALLOWED_NAV = {
  REQUESTER: ["My Tickets", "Create Ticket"],
  IT_STAFF: ["Ticket Queue"],
  ADMIN: ["User Management"],
};

const VIEWPORTS = (process.env.VIEWPORTS ?? "1280,1024,820,390")
  .split(",")
  .map((v) => {
    const [width, height] = v.trim().split("x").map(Number);
    const h = height || 900;
    return { label: `${width}x${h}`, width, height: h };
  });

// ---------------------------------------------------------------------------
// In-page measurements. Each returns { pass, detail }.
// ---------------------------------------------------------------------------

const IN_PAGE = {
  // 1 + 3 — design consistency and badges.
  designConsistency: (tokens) => {
    const problems = [];
    // Bootstrap renders :disabled buttons with a transparent background on
    // purpose, so only enabled controls are checked against the token.
    const primary = [...document.querySelectorAll(".btn-tok-primary")].find(
      (el) => el.getBoundingClientRect().width > 0 && !el.disabled
    );
    if (!primary) problems.push("no visible primary button (.btn-tok-primary)");
    else {
      const bg = getComputedStyle(primary).backgroundColor;
      if (bg !== tokens.primary) problems.push(`primary button background ${bg} != ${tokens.primary}`);
    }
    const card = [...document.querySelectorAll(".card")].find(
      (el) => el.getBoundingClientRect().width > 0
    );
    if (card) {
      const bg = getComputedStyle(card).backgroundColor;
      if (bg !== tokens.surface) problems.push(`card surface ${bg} != ${tokens.surface}`);
    }
    // Every badge must carry text: status may never be colour-only (ui-spec §10).
    const badges = [...document.querySelectorAll(".badge")].filter(
      (el) => el.getBoundingClientRect().width > 0 && !el.closest(".visually-hidden")
    );
    for (const badge of badges) {
      if ((badge.textContent ?? "").trim() === "") {
        problems.push(`badge without text: ${badge.className}`);
      }
    }
    return { pass: problems.length === 0, detail: problems.join("; ") || "tokens match, all badges labelled" };
  },

  // 2 — role navigation.
  roleNavigation: ({ role, allowedNav }) => {
    const nav = document.querySelector('nav[aria-label="Primary navigation"]');
    const items = nav
      ? [...nav.querySelectorAll("a, button")].map((el) => (el.textContent ?? "").trim()).filter(Boolean)
      : [];
    const allowed = allowedNav[role] ?? [];
    const forbidden = items.filter((t) => !allowed.includes(t) && !/Logout/i.test(t));
    const problems = [];
    if (forbidden.length) problems.push(`not permitted for ${role}: ${forbidden.join(", ")}`);
    const shell = document.querySelector("header");
    if (![...(shell?.querySelectorAll("button") ?? [])].some((b) => /Logout/i.test(b.textContent ?? ""))) {
      problems.push("Logout missing from the shell header");
    }
    // The signed-in identity and role must be visible (sheet Part 5).
    if (!/Signed in/i.test(shell?.textContent ?? "")) problems.push("no signed-in identity in the header");
    return {
      pass: problems.length === 0,
      detail: problems.join("; ") || `${role} sees ${items.length} destinations, all permitted + Logout`,
    };
  },

  // 3 — badges on data rows: status and both priorities.
  badges: () => {
    // >=992px renders a table, <992px renders the same rows as cards, so both
    // presentations of a ticket row must carry the badges.
    const rows = [
      ...[...document.querySelectorAll("table tbody tr")].filter((r) => r.getBoundingClientRect().width > 0),
      ...[...document.querySelectorAll("li.card")].filter((r) => r.getBoundingClientRect().width > 0),
    ];
    if (rows.length === 0) return { pass: true, detail: "no data rows on this screen" };
    const problems = [];
    for (const row of rows.slice(0, 5)) {
      const badges = [...row.querySelectorAll(".badge")];
      const text = badges.map((b) => (b.textContent ?? "").trim());
      if (text.length < 1) problems.push("row without any badge");
      if (!text.some((t) => /NEW|OPEN|IN_PROGRESS|WAITING_FOR_REQUESTER|RESOLVED|CLOSED|REOPENED|CANCELLED/.test(t)))
        problems.push(`row without a status badge: ${text.join("/")}`);
      if (text.filter((t) => /LOW|MEDIUM|HIGH|URGENT/.test(t)).length < 2)
        problems.push(`row without both priority badges: ${text.join("/")}`);
      for (const badge of badges) {
        if (!badge.getAttribute("title")) problems.push(`badge without title: ${badge.textContent}`);
      }
    }
    return {
      pass: problems.length === 0,
      detail: problems.join("; ") || `${rows.length} ticket rows carry status + both priorities as text`,
    };
  },

  // 4 — editable vs read-only must be visually distinct.
  editableVsReadonly: () => {
    const editable = [
      ...document.querySelectorAll(
        "input.form-control, textarea.form-control, select.form-select, select.form-control"
      ),
    ].filter(
      (el) =>
        el.getBoundingClientRect().width > 0 &&
        !el.classList.contains("readonly-field") &&
        !el.hasAttribute("readonly") &&
        el.getAttribute("aria-readonly") !== "true" &&
        !el.disabled
    );
    const readonly = [...document.querySelectorAll(".readonly-field")].filter(
      (el) => el.getBoundingClientRect().width > 0
    );
    if (editable.length === 0) return { pass: true, detail: "no editable field on this screen" };
    if (readonly.length === 0) return { pass: true, detail: "no read-only field on this screen" };
    const problems = [];
    if (getComputedStyle(editable[0]).backgroundColor === getComputedStyle(readonly[0]).backgroundColor) {
      problems.push(
        `editable ${getComputedStyle(editable[0]).backgroundColor} == read-only ${getComputedStyle(
          readonly[0]
        ).backgroundColor}`
      );
    }
    for (const el of readonly) {
      // A <dd>/<span> read-only field is display-only by construction; only an
      // actual form control must carry readonly/aria-readonly.
      const isControl = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      if (isControl && !el.hasAttribute("readonly") && el.getAttribute("aria-readonly") !== "true") {
        problems.push(`${el.tagName.toLowerCase()}.readonly-field is editable`);
      }
      if (!isControl && el.hasAttribute("contenteditable")) {
        problems.push(`${el.tagName.toLowerCase()}.readonly-field is contenteditable`);
      }
    }
    return {
      pass: problems.length === 0,
      detail: problems.join("; ") || `editable ${getComputedStyle(editable[0]).backgroundColor} vs read-only ${getComputedStyle(readonly[0]).backgroundColor}`,
    };
  },

  // 7 — clipping inside a clipping box, and ellipsis truncation.
  clipping: () => {
    const found = [];
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (el.closest(".visually-hidden, .sr-only") !== null) continue;
      if (el.getAttribute("aria-hidden") === "true") continue;
      if (["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(el.tagName)) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      const wider = el.scrollWidth > el.clientWidth + 2;
      if (["hidden", "clip", "auto", "scroll"].includes(style.overflowX) && wider) {
        found.push(`${el.tagName.toLowerCase()}.${el.className || "-"} scrollW=${el.scrollWidth}>clientW=${el.clientWidth}`);
      }
      if (style.textOverflow === "ellipsis" && wider) {
        found.push(`${el.tagName.toLowerCase()} truncated: "${(el.textContent ?? "").trim().slice(0, 30)}"`);
      }
    }
    return { pass: found.length === 0, detail: found.join("; ") || "no clipped or ellipsis-truncated content" };
  },

  // 9 — page-level horizontal scrolling.
  horizontalOverflow: () => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return {
      pass: overflow <= 1,
      detail: overflow <= 1 ? "document does not scroll sideways" : `document scrolls sideways by ${overflow}px`,
    };
  },

  // 8 — overlapping visible content.
  overlap: () => {
    const SKIP = new Set(["SCRIPT", "STYLE", "OPTION", "PATH", "SVG", "USE", "BR", "HR"]);
    const nodes = [...document.querySelectorAll("body *")].filter((el) => {
      if (SKIP.has(el.tagName)) return false;
      if (el.closest(".visually-hidden, .sr-only") !== null) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      // Off-flow elements are included: an overlay that sits on top of text is a
      // real overlap. Ancestor/descendant pairs are skipped further down.
      if (style.position === "fixed" && el.closest(".modal, .toast, [role=dialog]")) return false;
      const box = el.getBoundingClientRect();
      if (box.width < 24 || box.height < 10) return false;
      // Only leaf-ish, text-bearing boxes can visibly collide.
      return (el.textContent ?? "").trim().length > 0 && el.children.length === 0;
    });
    // An inline element that wraps across a line break has a bounding rect that
    // spans both lines, which looks like an overlap even though the glyphs sit
    // on separate lines. getClientRects() returns one rect per line box, so the
    // intersection is tested on the real line boxes instead.
    const lineBoxes = (el) =>
      [...el.getClientRects()].filter((r) => r.width >= 24 && r.height >= 10);
    const hits = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      const ra = lineBoxes(a);
      if (ra.length === 0) continue;
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        if (a.contains(b) || b.contains(a)) continue;
        const rb = lineBoxes(b);
        if (rb.length === 0) continue;
        let worst = 0;
        for (const x of ra) {
          for (const y of rb) {
            const overlapW = Math.min(x.right, y.right) - Math.max(x.left, y.left);
            const overlapH = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
            if (overlapW <= 2 || overlapH <= 2) continue;
            const area = overlapW * overlapH;
            const smaller = Math.min(x.width * x.height, y.width * y.height);
            worst = Math.max(worst, area / smaller);
          }
        }
        if (worst > 0.3) {
          hits.push(
            `"${(a.textContent ?? "").trim().slice(0, 22)}" x "${(b.textContent ?? "").trim().slice(0, 22)}"`
          );
        }
      }
    }
    return {
      pass: hits.length === 0,
      detail: hits.length === 0 ? `${nodes.length} text elements, none overlapping` : [...new Set(hits)].slice(0, 4).join("; "),
    };
  },

};

// 5 — validation placement: after a failed submit the message must sit in the
// same form group as the field it belongs to.
async function validationPlacement(page) {
  const form = page.locator("form:visible").first();
  if ((await form.count()) === 0) return { pass: true, detail: "no form on this screen" };
  await form.evaluate((el) => {
    el.querySelectorAll("[type=submit]").forEach((b) => b.click());
  });
  await page.waitForTimeout(400);
  const problems = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".invalid-feedback, .text-danger, [role=alert]")) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const msg = (el.textContent ?? "").trim();
      if (msg === "" || msg === "*") continue;
      // The message must live inside the same column/group as its input.
      const group = el.parentElement;
      const field = group?.querySelector("input, select, textarea");
      if (!field) out.push(`"${msg.slice(0, 30)}" is not next to a field`);
    }
    return out;
  });
  return {
    pass: problems.length === 0,
    detail: problems.join("; ") || "each validation message sits inside its field's form group",
  };
}

// ---------------------------------------------------------------------------
// Screen walk
// ---------------------------------------------------------------------------

const loginCtx = async (email, password) => {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post("/api/auth/login", { headers: JSON_HEADERS, data: { email, password } });
  if (!res.ok()) throw new Error(`API login failed for ${email} (${res.status()})`);
  return ctx;
};

// A seeded REQUESTER still has to pass the mandatory first-login change, so the
// checklist creates an active requester and completes that flow through the API
// (exactly like scripts/screenshots-lab3.mjs does).
const ensureRequester = async () => {
  const email = `visual.requester.${Date.now()}@example.com`;
  const name = "Visual Checklist Requester";
  // The API deliberately never echoes the initial password back, so keep the
  // value that was sent.
  const initialPassword = "InitPass!23";
  const adminCtx = await loginCtx(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
  let created;
  try {
    const res = await adminCtx.post("/api/admin/users", {
      headers: JSON_HEADERS,
      data: { name, email, role: "REQUESTER", active: true, initialPassword },
    });
    if (res.status() !== 201) throw new Error(`create requester failed (${res.status()}): ${await res.text()}`);
    created = (await res.json()).user;
  } finally {
    await adminCtx.dispose();
  }
  const ctx = await loginCtx(created.email, initialPassword);
  try {
    const pw = await ctx.post("/api/auth/change-password", {
      headers: JSON_HEADERS,
      data: { currentPassword: initialPassword, newPassword: "ReadyPass!23", confirmPassword: "ReadyPass!23" },
    });
    if (!pw.ok()) throw new Error(`change-password failed (${pw.status()}) for ${created.email}`);
  } finally {
    await ctx.dispose();
  }
  return { email: created.email, password: "ReadyPass!23", role: "REQUESTER" };
};

// One real ticket, so "My Tickets" and the requester detail view are measured
// against content instead of an empty state.
const ensureTicket = async (account) => {
  const ctx = await loginCtx(account.email, account.password);
  try {
    const categories = await (await ctx.get("/api/categories")).json();
    const systems = (await (await ctx.get("/api/related-systems")).json()).items;
    const category = categories.find((c) => c.name === "Hardware");
    const system = systems.find((s) => s.name === "ERP System");
    if (!category || !system) throw new Error("reference data missing for Hardware/ERP System");
    const res = await ctx.post("/api/tickets", {
      headers: JSON_HEADERS,
      data: {
        summary: "Visual checklist probe — printer queue stalls on every job",
        description: "Created by scripts/verify-visual-checklist.mjs so the requester screens have real content.",
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
      },
    });
    if (res.status() !== 201) throw new Error(`create ticket failed (${res.status()}): ${await res.text()}`);
    return (await res.json()).ticket;
  } finally {
    await ctx.dispose();
  }
};

// 6 — visible keyboard focus. Driven with real Tab presses, because the app
// styles :focus-visible (programmatic .focus() does not always match it), and it
// walks the whole tab order of the screen rather than the first few controls.
const FOCUS_WALK = () => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const cs = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const outlineRing = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
  const shadowRing = cs.boxShadow !== "none" && cs.boxShadow !== "";
  const borderRing =
    parseFloat(cs.borderWidth) > 0 &&
    cs.borderTopColor !== cs.backgroundColor &&
    el.matches("input, select, textarea");
  return {
    label: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${
      el.getAttribute("type") ? "[type=" + el.getAttribute("type") + "]" : ""
    }${el.className ? "." + String(el.className).split(" ")[0] : ""}`,
    visible: box.width > 0 && box.height > 0 && !el.closest(".visually-hidden"),
    ring: outlineRing || shadowRing || borderRing,
  };
};

const focusWalk = async (page, maxStops = 45) => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const problems = [];
  let stops = 0;
  for (let i = 0; i < maxStops; i += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(FOCUS_WALK);
    if (!info) continue;
    stops += 1;
    if (!info.visible) continue;
    if (!info.ring) problems.push(`${info.label} has no visible focus ring`);
  }
  return {
    pass: stops > 0 && problems.length === 0,
    detail: problems.length ? [...new Set(problems)].join("; ") : `${stops} tab stops, all show a focus ring`,
  };
};

const login = async (page, account) => {
  await page.goto(CLIENT_URL + "/");
  await page.getByRole("heading", { name: /IT Service Desk/i }).waitFor();
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-password").fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByRole("button", { name: "Logout" }).waitFor();
};

const result = [];
const record = (viewport, screen, item, res) =>
  result.push({ viewport, screen, item, pass: res.pass, detail: res.detail });

if (process.env.SEED !== "0") {
  console.log("Reseeding the dev database…");
  const seed = spawnSync("npm", ["--prefix", "server", "run", "prisma:seed"], { cwd: ROOT, encoding: "utf8" });
  if (seed.status !== 0) {
    console.error("Seed failed:", seed.stderr?.slice(-600));
    process.exit(1);
  }
}

const roles = (process.env.ROLES ?? "admin,staff,requester").split(",").map((r) => r.trim());
const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();

  // --- Guest: login screen (invalid submit first, so validation is visible).
  await page.goto(CLIENT_URL + "/");
  await page.getByRole("heading", { name: /IT Service Desk/i }).waitFor();
  for (const [item, run] of [
    ["clipping", IN_PAGE.clipping],
    ["horizontalOverflow", IN_PAGE.horizontalOverflow],
    ["overlap", IN_PAGE.overlap],
  ]) {
    record(vp.label, "login", item, await page.evaluate(run));
  }
  record(vp.label, "login", "designConsistency", await page.evaluate(IN_PAGE.designConsistency, TOKENS));
  record(vp.label, "login", "focus", await focusWalk(page));
  record(vp.label, "login", "validationPlacement", await validationPlacement(page));

  for (const roleName of roles) {
    const account = roleName === "requester" ? await ensureRequester() : ACCOUNTS[roleName];
    if (!account) throw new Error(`unknown role "${roleName}"`);
    // One browser context per role: the session cookie of the previous role must
    // not leak, otherwise the login form would not even be shown.
    if (roleName === "requester") await ensureTicket(account);
    const roleCtx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await roleCtx.newPage();
    await login(page, account);

    // Each role only has its own workspace in the shell nav (App.tsx), so the
    // walk follows the nav that the role actually owns.
    const navButton = (name) =>
      page.locator('nav[aria-label="Primary navigation"]').getByRole("button", { name });

    const screens = [];
    if (roleName === "staff") {
      screens.push(["ticket-queue", async () => {
        await navButton(/^Ticket Queue$/).click();
        await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
        await page.waitForTimeout(700);
      }]);
      screens.push(["staff-ticket-detail", async () => {
        const open = page.locator("[aria-label^='Open ticket']:visible").first();
        await open.waitFor();
        await open.click();
        await page.getByRole("button", { name: "Back to Queue" }).first().waitFor();
        await page.waitForTimeout(700);
      }]);
    }
    if (roleName === "admin") {
      screens.push(["user-management", async () => {
        await navButton("User Management").click();
        await page.getByRole("heading", { name: "User Management" }).waitFor();
        await page.waitForTimeout(700);
      }]);
    }
    if (roleName === "requester") {
      screens.push(["my-tickets", async () => {
        await navButton("My Tickets").click();
        await page.getByRole("heading", { name: "My Tickets" }).waitFor();
        await page.waitForTimeout(700);
      }]);
      screens.push(["ticket-detail", async () => {
        await navButton("My Tickets").click();
        await page.getByRole("heading", { name: "My Tickets" }).waitFor();
        const open = page.locator("[aria-label^='Open ticket']:visible").first();
        await open.waitFor();
        await open.click();
        await page.getByRole("button", { name: "Back to My Tickets" }).first().waitFor();
        await page.waitForTimeout(700);
      }]);
      screens.push(["create-ticket", async () => {
        await navButton("Create Ticket").click();
        await page.getByRole("heading", { name: "Create Ticket" }).waitFor();
        await page.waitForTimeout(700);
      }]);
    }

    for (const [screenName, goto] of screens) {
      try {
        await goto();
      } catch (err) {
        record(vp.label, screenName, "navigation", { pass: false, detail: err.message.slice(0, 90) });
        continue;
      }
      for (const [item, run] of [
        ["clipping", IN_PAGE.clipping],
        ["horizontalOverflow", IN_PAGE.horizontalOverflow],
        ["overlap", IN_PAGE.overlap],
        ["editableVsReadonly", IN_PAGE.editableVsReadonly],
      ]) {
        record(vp.label, screenName, item, await page.evaluate(run));
      }
      record(vp.label, screenName, "focus", await focusWalk(page));
      record(vp.label, screenName, "designConsistency", await page.evaluate(IN_PAGE.designConsistency, TOKENS));
      record(vp.label, screenName, "roleNavigation", await page.evaluate(IN_PAGE.roleNavigation, { role: account.role, allowedNav: ALLOWED_NAV }));
      if (screenName === "ticket-queue") record(vp.label, screenName, "badges", await page.evaluate(IN_PAGE.badges));
      record(vp.label, screenName, "validationPlacement", await validationPlacement(page));
    }
    await roleCtx.close();
  }
  await context.close();
}
await browser.close();

// --- Report -----------------------------------------------------------------

const ITEMS = [
  ["designConsistency", "Design consistency (tokens, surfaces, labelled badges)"],
  ["roleNavigation", "Role navigation shows only permitted destinations"],
  ["badges", "Badges: status + both priorities, as text"],
  ["editableVsReadonly", "Editable vs read-only fields distinct"],
  ["validationPlacement", "Validation messages next to their field"],
  ["focus", "Visible keyboard focus indicator"],
  ["clipping", "No clipped content"],
  ["overlap", "No overlapping content"],
  ["horizontalOverflow", "No horizontal page overflow"],
];

let failed = 0;
for (const [key, label] of ITEMS) {
  const rows = result.filter((r) => r.item === key);
  const bad = rows.filter((r) => !r.pass);
  failed += bad.length;
  console.log(`\n${bad.length === 0 ? "PASS" : "FAIL"}  ${label}  (${rows.length - bad.length}/${rows.length})`);
  for (const r of bad) console.log(`      ✗ ${r.viewport} ${r.screen}: ${r.detail}`);
}
for (const r of result.filter((x) => x.item === "navigation")) {
  failed += 1;
  console.log(`\nFAIL  navigation  ✗ ${r.viewport} ${r.screen}: ${r.detail}`);
}

console.log(`\n${result.length} measurements across ${VIEWPORTS.length} viewport(s): ${failed} failed.`);

// Machine-readable evidence, so the checklist document quotes measured numbers
// instead of prose. Written next to the other Lab 3 artifacts.
const OUT_DIR = path.join(ROOT, "artifacts", "lab-03", "visual-evidence");
fs.mkdirSync(OUT_DIR, { recursive: true });
const summary = ITEMS.map(([key, label]) => {
  const rows = result.filter((r) => r.item === key);
  const bad = rows.filter((r) => !r.pass);
  return {
    item: key,
    label,
    measured: rows.length,
    passed: rows.length - bad.length,
    failed: bad.length,
    screens: [...new Set(rows.map((r) => r.screen))],
    viewports: VIEWPORTS.map((v) => v.label),
    // Prefer samples where something was actually measured over screens that pass
    // by having nothing to measure, and show one sample per screen.
    samples: [...rows]
      .sort((a, b) => Number(/^no /.test(a.detail)) - Number(/^no /.test(b.detail)))
      .filter((r, i, arr) => arr.findIndex((x) => x.screen === r.screen) === i)
      .slice(0, 4)
      .map((r) => `${r.viewport} ${r.screen}: ${r.detail}`),
    failures: bad.map((r) => `${r.viewport} ${r.screen}: ${r.detail}`),
  };
});
const navRows = result.filter((r) => r.item === "navigation");
const payload = {
  generatedAt: new Date().toISOString(),
  command: `node scripts/verify-visual-checklist.mjs (VIEWPORTS=${VIEWPORTS.map((v) => v.label).join(",")}, ROLES=${roles.join(",")})`,
  viewports: VIEWPORTS.map((v) => `${v.width}x${v.height}`),
  roles,
  screens: [...new Set(result.map((r) => r.screen))],
  totalMeasurements: result.length,
  failed,
  navigationFailures: navRows,
  items: summary,
};
const jsonPath = path.join(OUT_DIR, "visual-check.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);

const md = [
  "# Machine-verified visual checklist — Lab 3",
  "",
  `- Generated: ${payload.generatedAt}`,
  `- Command: \`${payload.command}\``,
  `- Viewports: ${payload.viewports.join(", ")}`,
  `- Roles: ${roles.join(", ")}`,
  `- Screens: ${payload.screens.join(", ")}`,
  `- Result: **${result.length - failed} / ${result.length} measurements passed, ${failed} failed**`,
  "",
  "| # | Checklist item | Measured | Passed | Failed |",
  "| --- | --- | ---: | ---: | ---: |",
  ...summary.map((it, i) => `| ${i + 1} | ${it.label} | ${it.measured} | ${it.passed} | ${it.failed} |`),
  "",
  "## Measured detail per item",
  "",
  ...summary.flatMap((it) => [
    `### ${it.label}`,
    "",
    ...it.samples.map((x) => `- ${x}`),
    "",
  ]),
].join("\n");
const mdPath = path.join(OUT_DIR, "visual-check.md");
fs.writeFileSync(mdPath, `${md}\n`);
console.log(`\nEvidence written to ${path.relative(ROOT, jsonPath)} and ${path.relative(ROOT, mdPath)}`);

process.exitCode = failed === 0 ? 0 : 1;
