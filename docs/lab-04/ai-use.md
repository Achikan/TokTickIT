# Lab 4 — AI Use and Reflection

**LLM/agent used:** Google Gemini (Gemini 2.5 Pro / Flash), accessed through the Google DeepMind Antigravity Advanced Agentic Coding environment (pair programming agent with access to shell commands, filesystem workspace, and GitHub CLI tools).

**Methodology:** Spec-Driven Development (Spec DD) and Test-Driven Development (TDD) per the SE Lab 4 specification. The Sprint 4 engineering contract (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`) was authored and frozen first (Issues 26–28) before any implementation PRs were begun. Every prompt below was issued in this repository and verified by running `npm run build` and `npm test` locally across server and client suites rather than trusting agent claims.

---

## Selected Key Prompts (6–10)

Each row documents a real prompt given to the AI agent and the verification/steering actions taken afterward.

| # | Prompt Given | What I Did with the Result / How I Refined It |
|---|---|---|
| 1 | "Transform the Lab 4 sheet (§3–§12) into the Sprint 4 engineering contract — numbered FR/BR, Actions Taken parent-child structure, status transition matrix, resolution gate, dashboard calculations, ACs, and DoD." | Established `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` (Issues 26–28) **before** implementation. Explicitly locked in BR-11 (Resolution Gate requiring ≥1 Action Taken) and defined the exact transition matrix instead of letting the agent assume defaults. |
| 2 | "Add the `ActionTaken` model to Prisma, generate an additive migration preserving existing tickets, and create idempotent seed data covering zero, one, and multiple actions per ticket." | Reviewed `server/prisma/schema.prisma` and the migration file myself; verified that legacy tickets retain their existing data without foreign key violations, and that `npm run prisma:seed` can run repeatedly without duplication (Issue 29). |
| 3 | "Implement the Actions Taken REST API per `api-spec.md` §1: create/update actions with automatic performer attribution, follow-up note validation, 5-minute duplicate guard, and strict authorization matrix." | Inspected the backend route handler to ensure client-supplied `performedById` is stripped and replaced with the authenticated session identity (BR-03), and that Requesters receive 403 on write attempts. Verified against 28 automated tests in `actions-taken.api.test.ts` (Issue 30). |
| 4 | "Build the Actions Taken section on Ticket Detail with responsive table and cards, follow-up note gate, edit mode, and read-only mode for Requesters." | Tested the UI in both Staff and Requester sessions. Ensured that when `followUpRequired` is checked, the note is mandatory, and that Requesters only see the work history without create/edit buttons (Issue 31). |
| 5 | "Enforce the Ticket status transition matrix and resolution gate on the backend: legal transitions return 200, illegal return 409 `FORBIDDEN_TRANSITION`, and resolving with 0 actions returns 409 `RESOLUTION_GATE`." | Verified that `expectedUpdatedAt` optimistic concurrency is enforced on every transition to prevent race conditions (BR-12), and that legacy resolved tickets are grandfathered safely (Issue 32). |
| 6 | "Implement the IT Staff Dashboard (`/api/staff/dashboard`) and Requester Dashboard (`/api/requester/dashboard`) with operational metrics and direct drill-downs." | Verified that queries are scoped to authoritative DB aggregations without leaking cross-user data (RD-01..04), and that Admin users receive additional user account counts (AD-01) while Staff and Requester scopes remain isolated (Issues 34–35). |
| 7 | "Address peer review feedback on PR #86: replace `<button>` cards with accessible `<a>` tags per `ui-spec.md §9`, map status badges to `badge-status-*`, add drill-downs for Recently Updated and User Management, and add UI-SD-03 burst throttle." | Fixed all review items raised by @il0lk3, added per-card double-click throttling with 400ms lockout, and added integration tests in `StaffDashboard.test.tsx` verifying full drill-down to the queue with filters (136 client tests green). |
| 8 | "Re-run full server regression tests sequentially without truncation to capture all 25 test suites with the final summary block for `server-vitest-all.txt` (PR #89)." | Let `PORT=0 npx vitest run` execute to completion (398 seconds) across all 25 suites (330 tests passed), updated `tests.md` §8 Provenance with the authoritative figures, and refreshed `README.md` for Lab 4 per sheet §8.5. |
| 9 | "Generate high-resolution visual evidence screenshots for IT Staff Dashboard, Requester Dashboard, Actions Taken, and Workflow across Desktop (1280px), Tablet (820px), and Mobile (390px) viewports." | Built `scripts/screenshots-lab4.mjs` using Playwright Chromium with explicit viewport configurations, capturing full-page evidence into `artifacts/lab-04/screenshots/` matching grading Parts 5–9. |
| 10 | "Address peer review feedback on PR #90: re-target Actions Taken and Workflow evidence captures to ticket TK-001003 (with 3 actions across multiple performers and IN_PROGRESS status) and Carol Chen requester session to capture non-empty tables, edit mode, active workflow transition buttons, and read-only actions." | Updated `scripts/screenshots-lab4.mjs` with `:visible` selector scoping on `button[aria-label="Open ticket TK-001003"]`, added `06-actions-taken-edit-mode.png`, captured active transition buttons on IN_PROGRESS ticket, and authenticated as Carol Chen for requester read-only and advisory evidence. |

---

## My Reflection

Throughout Sprint 4, the primary lesson was that **the specification is the law, and the AI agent is a high-speed implementer that requires constant verification and steering.** 

1. **Specification Agent vs. Coding Agent:**
   Using the AI as a specification agent during the contract phase (Issues 26–28) helped systematically surface edge cases that might otherwise have been discovered late during implementation—such as how legacy resolved tickets without actions should be handled when enforcing the resolution gate (grandfathered without blocking updates), or how optimistic concurrency (`expectedUpdatedAt`) must protect both Ticket workflow changes and Actions Taken edits. When switching to the coding agent, having numbered Acceptance Criteria (AC-01..AC-26) and Business Rules (BR-01..BR-21) in the prompt allowed immediate verification: each implemented route and UI component had to satisfy an explicit rule rather than vague intentions.

2. **The Power of Two-Way Peer Review:**
   The collaborative workflow with my partner (@il0lk3) proved indispensable. When an agent generated code that technically worked but cut corners—such as using generic CSS classes instead of Zen Green design tokens, using `<button>` instead of accessible `<a>` tags for metric cards, or prematurely truncating terminal logs—the human peer reviewer flagged the gap with actionable feedback. This forced me to investigate the root causes (e.g., sequential Vitest database resets requiring 4+ minutes to run all 25 suites) rather than applying superficial fixes.

3. **Traceability and Hardening:**
   Automated regression and hardening cannot be faked. Every passing test claimed in `docs/lab-04/tests.md` is backed by un-truncated terminal evidence committed in `artifacts/lab-04/test-output/` (330 server tests and 139 client tests, all 100% green), and all visual states are verifiable via reproducible Playwright screenshot scripts.

