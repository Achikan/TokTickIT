# Lab 4 — Peer Review Record

**Author:** อชิรญา อินตา (Achiraya Intha) — 67070505229 — GitHub: [@Achikan](https://github.com/Achikan)  
**Peer reviewer:** ธนากร พหุลรัตน์ (Thanakorn Phahulrat) — 67070505217 — GitHub: [@il0lk3](https://github.com/il0lk3)

> Two-way peer review per the SE Lab 4 specification: all Lab 4 feature PRs in `Achikan/TokTickIT`
> were reviewed and approved by my partner before they were merged into
> `lab4-staging`, and I reviewed my partner's Lab 4 PRs in `il0lk3/TokTickIT`.
> Every Issue was developed on its own dedicated `feature/<n>-<slug>` branch and merged
> only after the reviewer approved; no direct commits went to `main`.

---

## Pull Requests Authored (Reviewed by Partner)

| PR | Issue | Branch | Reviewer Verdict |
|:---|:---|:---|:---|
| [#78](https://github.com/Achikan/TokTickIT/pull/78) | 26 — Sprint 4 engineering contract (`specification.md`) | `feature/26-sprint4-contract-spec` | Approved |
| [#79](https://github.com/Achikan/TokTickIT/pull/79) | 27 — Sprint 4 UI & API contracts (`ui-spec.md`, `api-spec.md`) | `feature/27-sprint4-contract-ui-api-spec` | Approved |
| [#80](https://github.com/Achikan/TokTickIT/pull/80) | 28 — Sprint 4 test plan & traceability (`tests.md`) | `feature/28-sprint4-test-plan` | Approved |
| [#81](https://github.com/Achikan/TokTickIT/pull/81) | 29 — ActionTaken model, migration & idempotent seed | `feature/29-actions-taken-migration-seed` | Approved |
| [#82](https://github.com/Achikan/TokTickIT/pull/82) | 30 — Actions Taken REST API & authorization | `feature/30-actions-taken-api` | Approved |
| [#83](https://github.com/Achikan/TokTickIT/pull/83) | 31 — Actions Taken UI on Ticket Detail | `feature/31-actions-taken-ui` | Approved |
| [#84](https://github.com/Achikan/TokTickIT/pull/84) | 32 — Ticket Workflow — Transition Matrix & Resolution Gate (Backend) | `feature/32-ticket-workflow-api` | Approved (after 1 revision) |
| [#85](https://github.com/Achikan/TokTickIT/pull/85) | 33 — Ticket Workflow — UI Status Controls | `feature/33-ticket-workflow-ui` | Approved |
| [#86](https://github.com/Achikan/TokTickIT/pull/86) | 34 — IT Staff Dashboard (API + UI) | `feature/34-staff-dashboard` | Approved (after 1 revision) |
| [#87](https://github.com/Achikan/TokTickIT/pull/87) | 35 — Requester Dashboard (API + UI) | `feature/35-requester-dashboard` | Approved |
| [#89](https://github.com/Achikan/TokTickIT/pull/89) | 36 — Final Regression & Product Hardening | `feature/36-final-regression-product-hardening` | Approved (after 2 revisions) |
| [#90](https://github.com/Achikan/TokTickIT/pull/90) | 37 — Zen Green Polish, Accessibility, Screenshots & Release | `feature/37-zen-green-polish-release` | Current PR / Open for review |

---

## Representative Review Comments Received and Responses

### 1. PR #86 (IT Staff Dashboard API + UI) — Badge CSS, Card Semantics & Double-Click Throttle
- **Reviewer Comment (@il0lk3):**
  > 1. Status badges in the dashboard are generating generic `status-${s}` classes instead of Zen Green design language classes (`badge-status-*`).
  > 2. Dashboard metric cards are implemented as `<button>` elements instead of semantic accessible `<a>` links per `ui-spec.md §9`.
  > 3. Drill-down on the Recently Updated header and the AD-01 user card are missing.
  > 4. Ensure burst/double-click throttling is tested for UI-SD-03.
- **Author Response:**
  - Mapped all ticket statuses explicitly to Zen Green badge styles (`badge-status-new`, `badge-status-open`, `badge-status-in-progress`, `badge-status-waiting`, `badge-status-resolved`, `badge-status-closed`, `badge-status-reopened`, `badge-status-cancelled`) and added `.text-tok-green` to `styles.css`.
  - Replaced `<button>` cards with semantic `<a>` tags with explicit `href`, `aria-label`, and text reset styling.
  - Added drill-down navigation links for the Recently Updated section (`/staff/tickets?sort=-updatedAt`) and the AD-01 card (`/admin/users`).
  - Implemented per-card double-click throttling (`navigatingKey` with 400ms burst lockout) satisfying AC-26 / UI-SD-03 with unit test coverage.
  - Re-verified client test suite: 136/136 tests passing. Approved and merged.

### 2. PR #89 (Final Regression & Product Hardening) — Truncated Server Logs & Document Provenance
- **Reviewer Comment (@il0lk3):**
  > 1. Server test output in `artifacts/lab-04/test-output/server-vitest-all.txt` ends abruptly at line 60 (recording only 2 test suites). All 25 suites must run to completion with the final Vitest summary block.
  > 2. `client-tsc.txt` and `server-tsc.txt` were committed as 0-byte files; include execution headers and exit code 0 confirmation.
  > 3. Update `docs/lab-04/tests.md` §2 table to Pass and include the exact suite count breakdown in Section 8 Provenance.
- **Author Response:**
  - Re-ran the complete server test suite sequentially (`PORT=0 npx vitest run`, 398s) across all 25 test files without truncation, capturing the full output (317 lines) and the summary block: `Test Files 25 passed (25)`, `Tests 330 passed (330)`.
  - Added explicit execution headers and `===EXIT_CODE: 0 ===` confirmation to `server-tsc.txt` and `client-tsc.txt`.
  - Updated `docs/lab-04/tests.md` §8 Provenance with the authoritative numbers (`Server: 25 files / 330 tests passed`, `Client: 19 files / 139 tests passed`).
  - Updated `README.md` to reflect Lab 4 features, directory layout, and test counts per Lab 4 §8.5. Approved and merged into `lab4-staging`.

### 3. PR #84 (Ticket Workflow — Transition Matrix & Resolution Gate)
- **Reviewer Comment (@il0lk3):**
  > Verify that transitioning to `RESOLVED` strictly enforces the resolution gate (at least one Action Taken) and that legacy tickets remain grandfathered without regression.
- **Author Response:**
  - Verified backend enforcement in `server/src/routes/tickets.ts`: status change to `RESOLVED` checks `prisma.actionTaken.count({ where: { ticketId } })` and returns `409 RESOLUTION_GATE` if 0 actions exist.
  - Added regression test confirming legacy resolved tickets retain their status and can transition to `CLOSED` smoothly. All 17 workflow API tests passed.

### 4. PR #90 (Zen Green Polish, Accessibility, Screenshots & Release) — Actions Taken & Workflow Evidence Targeting
- **Reviewer Comment (@il0lk3):**
  > 1. Actions Taken List screenshots (`actions-taken/{01-desktop, 02-tablet, 03-mobile}.png`) captured the zero-action state because `TK-001008` (CANCELLED, 0 actions) was selected from the dashboard. Table layout, multi-performer rows, and mobile cards were replaced by "No actions recorded yet."
  > 2. `06-actions-taken-edit-mode.png` was missing because zero actions meant no edit buttons were rendered and the Playwright edit capture block was bypassed.
  > 3. `01-workflow-status-transitions.png` captured `TK-001008` in terminal CANCELLED status with zero transition buttons rendered.
  > 4. `07-actions-taken-requester-readonly.png` showed zero actions because Alice Anderson's `TK-001005` had 0 actions.
  > **Suggested Fix:**
  > - Target ticket `TK-001003` via Ticket Queue or direct button selector for Staff Actions Taken and Workflow captures.
  > - Use `carol.chen@example.com` (requester of `TK-001003`) for the requester read-only capture.
  > - Re-run `npm run screenshots:lab4` and commit the updated screenshot set.
- **Author Response:**
  - Updated `scripts/screenshots-lab4.mjs` to target ticket `TK-001003` ("Printer jams on floor 3", status: `IN_PROGRESS`) via `button[aria-label="Open ticket TK-001003"]:visible` from the Ticket Queue.
  - Re-captured `01-actions-taken-list-desktop.png`, `02-actions-taken-list-tablet.png`, and `03-actions-taken-list-mobile.png` displaying the full actions table and responsive cards with 3 distinct recorded actions across multiple performers (Frank Gao, Eileen Ford, Dan Das).
  - Captured `06-actions-taken-edit-mode.png` showing the active Edit Action form with prefilled fields and read-only performer field.
  - Re-captured `01-workflow-status-transitions.png` on `TK-001003` showing permitted transition buttons ("Set Waiting for Requester", "Resolve", "Cancel Ticket").
  - Updated Requester capture to authenticate as Carol Chen (`carol.chen@example.com`), capturing `07-actions-taken-requester-readonly.png` showing all 3 actions in read-only mode without write controls.
  - Re-captured `02-workflow-requester-advisory.png` showing the "Problem appears resolved" confirmation banner ("Your note was recorded for IT Staff. The ticket status has not changed.").
  - Re-generated full screenshot suite (19 PNGs) cleanly via `npm run screenshots:lab4`.

