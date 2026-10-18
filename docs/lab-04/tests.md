# Lab 4 Test Plan (Sprint 4 Test DD)

## 1. Test Strategy

Testing follows Test-Driven Development (TDD) and is planned up front from `docs/lab-04/specification.md` (Test DD) before implementation begins — it is not reconstructed afterward. A test covers every Acceptance Criterion and every numbered Business Rule in the specification. Coverage spans all ten required types: **unit**, **API/integration**, **UI component**, **UI style**, **responsive**, **authorization**, **workflow**, **migration/regression**, **performance-smoke**, and **end-to-end**. Tests live under `server/tests/lab-04/`, `client/tests/lab-04/`, and `e2e/lab-04/` (Labs 1–3 suites keep running unchanged as the regression baseline).

The plan was created first (Issue 28, this PR) and later issues implement against it. The table below follows the Lab 4 sheet §10 template (Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final). The **Final** column reads `Planned` until the test exists and runs green on `main`; it is updated to the actual `Pass`/`Fail` status during the implementation and hardening issues (32–37) — never earlier, and never by hand without a captured run (same evidence discipline as Lab 3 §6).

## 2. Planned Tests

Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final
---|---|---|---|---|---|---
API-TA-01 | API | AC-01, BR-01 | Create a valid Actions Taken as permitted IT Staff | Saved under the correct Ticket; `performedBy` = session user; owner preserved; `201` | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-02 | API | AC-03, BR-03 | Client-supplied `performedById` tampering | Ignored; stored performer is the session user | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-03 | API | AC-04, BR-05, BR-06 | Follow-up gate + field validation (empty/whitespace/over-length description, note required iff follow-up, date bounds) | `400` with per-field `fields`; nothing saved; valid variants save | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-04 | API | AC-05, BR-04 | Requester attempts create/update Action (direct API) | `403` without data; no row written | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-05 | API | AC-06, BR-04, BR-07 | List Actions: Requester own vs foreign; Staff accessible; ordering | Own list `200`; foreign non-disclosing `404`; newest-first order | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-06 | API | AC-07, BR-02 | Different active IT Staff records an Action on another's Ticket | Saved with that performer; Ticket owner unchanged | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-07 | API | AC-08, BR-03 | Deactivated account cannot record Actions (invalid/expired session) | `401`; no row written | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-08 | API | AC-09, BR-06 | Update Action fields (valid + invalid) | `200` persisted; `performedBy` not editable; invalid → `400` | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-09 | API | AC-10, BR-13 | Duplicate create (same actor + ticket + description within 5 min) | First `201`; second `409 DUPLICATE_ACTION`; exactly one row | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-TA-10 | API | AC-14, BR-12 | Stale Action update (wrong `expectedUpdatedAt`) | `409 STALE_UPDATE`; stored row unchanged | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-AUTH-01 | Authorization | AC-05, BR-04 | Direct-API sweep of all Action write routes by role (incl. unauthenticated) | `401` anonymous; `403` Requester; `2xx` only for Staff/Admin; hidden UI not required | server/tests/lab-04/actions-taken.api.test.ts | Planned
API-WF-01 | Workflow | AC-11, BR-08 | Legal transitions across the §5.2 matrix (all statuses, incl. Reopen/Close/Cancel) | `200`; status persisted; response `updatedAt` advanced | server/tests/lab-04/ticket-workflow.api.test.ts | Planned
API-WF-02 | Workflow | AC-12, BR-08, BR-09 | Illegal transitions + Requester transition attempts | Unlisted → `409 FORBIDDEN_TRANSITION`; Requester → `403`; status unchanged | server/tests/lab-04/ticket-workflow.api.test.ts | Planned
API-WF-03 | Workflow | AC-13, BR-10 | Requester "problem appears resolved" | `requesterIndicatedResolvedAt` set; status unchanged; visible to Staff | server/tests/lab-04/ticket-workflow.api.test.ts | Planned
API-WF-04 | Workflow | AC-14, BR-12 | Stale Ticket status update (two writers, wrong `expectedUpdatedAt`) | Second → `409 STALE_UPDATE`; first write preserved | server/tests/lab-04/ticket-workflow.api.test.ts | Planned
API-WF-05 | Workflow | AC-15, BR-11 | Resolution gate: Resolved with 0 actions rejected; ≥1 action succeeds; legacy Resolved grandfathered | `409 RESOLUTION_GATE` then `200`; legacy rows untouched | server/tests/lab-04/ticket-workflow.api.test.ts | Planned
API-AUTH-02 | Authorization | AC-12, BR-09 | Exhaustive matrix sweep: every (from, to) pair per role via direct API | Only matrix-permitted Staff/Admin pairs succeed; everything else `403`/`409` | server/tests/lab-04/ticket-workflow.api.test.ts | Planned
API-SD-01 | API | AC-18, BR-14, BR-15 | Staff dashboard metrics vs direct DB counts on seed data | SD-01…SD-06 equal hand-computed counts; all enum keys present | server/tests/lab-04/staff-dashboard.api.test.ts | Planned
API-SD-02 | API | AC-18, BR-17 | Caps, drill-down parameters, empty behavior, `ownerId=me` alias | Lists ≤ 5; drilldown map present; zero-metric ticket → `200` zeros/arrays; alias filters correctly | server/tests/lab-04/staff-dashboard.api.test.ts | Planned
API-SD-03 | API | AC-19, BR-14 | Requester hits staff dashboard; Admin payload | Requester → `403` no data; Admin identical + `userCounts` | server/tests/lab-04/staff-dashboard.api.test.ts | Planned
API-RD-01 | API | AC-02, BR-16 | Requester dashboard counts only session-user Tickets | RD-01…RD-04 match DB for that user only; no foreign rows in lists | server/tests/lab-04/requester-dashboard.api.test.ts | Planned
API-RD-02 | API | AC-21, BR-16, BR-17 | Scope widening impossible; staff `403`; zero-state shape | No parameters widen scope; Staff/Admin → `403`; fresh user → zeros + empty arrays `200` | server/tests/lab-04/requester-dashboard.api.test.ts | Planned
UNIT-01 | Unit | AC-04, BR-05 | Follow-up Note requirement logic (pure function) | Note required iff follow-up true; trim/length rules | server/tests/lab-04/followup-validation.unit.test.ts | Planned
UNIT-02 | Unit | AC-11, BR-08 | Transition-matrix legality table (pure function) | All §5.2 pairs legal/illegal as specified; terminal CANCELLED | server/tests/lab-04/transition-matrix.unit.test.ts | Planned
UNIT-03 | Unit | AC-18, BR-15 | Recent-window + active-status filter logic (pure function) | 7-day UTC boundary inclusive; correct status sets for SD/RD metrics | server/tests/lab-04/dashboard-metrics.unit.test.ts | Planned
UNIT-04 | Unit | AC-04, BR-06 | Action Date/Time bounds (D-6) | Within `[ticket.createdAt − 30d, now + 24h]`; out-of-range rejected | server/tests/lab-04/action-datetime.unit.test.ts | Planned
UI-TA-01 | UI | AC-06 | Actions list renders for staff (table) + empty state | Rows with date/description/performer/follow-up cue; empty hint | client/tests/lab-04/ActionsTaken.test.tsx | Planned
UI-TA-02 | UI | AC-01 | Create flow: open form, fill valid data, save | New row appears; auto Performed By shown; busy state blocks double submit | client/tests/lab-04/ActionsTaken.test.tsx | Planned
UI-TA-03 | UI | AC-04, AC-17, BR-05 | Follow-up conditional field + data preservation on `400`/`409`/`500` | Note appears/required when switch on; entered values kept on failure | client/tests/lab-04/ActionsTaken.test.tsx | Planned
UI-TA-04 | UI | AC-06, BR-04 | Requester Ticket Detail renders Actions read-only | All fields visible; no Add/Edit controls in DOM | client/tests/lab-04/ActionsTaken.test.tsx | Planned
UI-TA-05 | UI | AC-09, AC-14 | Edit mode prefilled + stale `409` conflict feedback | Fields prefilled; conflict message + reload action; no overwrite | client/tests/lab-04/ActionsTaken.test.tsx | Planned
UI-TA-06 | UI | AC-10, BR-13 | In-flight guard: repeated save clicks | Exactly one request; button disabled while pending | client/tests/lab-04/ActionsTaken.test.tsx | Planned
UI-WF-01 | UI | AC-16, BR-08 | Only matrix-permitted transitions rendered per role/status; summary badge refreshes after success | Illegal options absent; badge updates in place | client/tests/lab-04/TicketWorkflow.test.tsx | Planned
UI-WF-02 | UI | AC-17 | Gate rejection + `409` conflict feedback rendering | Remedy copy for gate; conflict copy + reload; data preserved | client/tests/lab-04/TicketWorkflow.test.tsx | Planned
UI-WF-03 | UI | AC-26 | Transition button busy state / double-click protection | One request per click burst; Cancel inline confirm keyboard-safe | client/tests/lab-04/TicketWorkflow.test.tsx | Planned
UI-SD-01 | UI | AC-20 | Staff dashboard cards + lists + drill-down links | SD labels/values render; links carry documented query parameters | client/tests/lab-04/StaffDashboard.test.tsx | Planned
UI-SD-02 | UI | AC-20 | Loading / empty / forbidden / safe-failure states | Skeletons; zeros + empty lists; 403 message; error + Retry | client/tests/lab-04/StaffDashboard.test.tsx | Planned
UI-SD-03 | UI | AC-26 | Double-click on dashboard cards does not fire duplicate requests | Single navigation/request per card under click burst | client/tests/lab-04/StaffDashboard.test.tsx | Planned
UI-SD-04 | UI | AC-19 | Admin reuse: same dashboard + concise user-count card | AD-01 card rendered for Admin only | client/tests/lab-04/StaffDashboard.test.tsx | Planned
UI-RD-01 | UI | AC-02, AC-21 | Requester dashboard metrics + drill-down into My Tickets | RD cards/lists render; links target My Tickets filters | client/tests/lab-04/RequesterDashboard.test.tsx | Planned
UI-RD-02 | UI | AC-21 | Zero-state + not a My Tickets clone | Zero cards + empty lists; no search/filter/pagination controls | client/tests/lab-04/RequesterDashboard.test.tsx | Planned
STYLE-01 | UI Style | AC-25 | Follow-Up cue non-color, badge consistency, dashboard card semantics | Follow-up text/icon present without color reliance; tokens per ui-spec | client/tests/lab-04/style.test.tsx | Planned
STYLE-02 | UI Style | AC-25 | Read-only vs editable tinting; Actions section distinct from Comments/Notes | Field tints and section labels match ui-spec §5 | client/tests/lab-04/style.test.tsx | Planned
MIG-01 | Migration/Regression | AC-22, BR-18 | Lab 4 migration on a Labs 1–3 database | All Users/Tickets/Attachments/Comments/Notes intact and owned correctly | server/tests/lab-04/migration-regression.api.test.ts | Planned
MIG-02 | Migration/Regression | AC-15, AC-22, BR-18 | Legacy Tickets without Actions | Zero-action list/empty-state; dashboards count them; existing Resolved/Closed grandfathered vs gate | server/tests/lab-04/migration-regression.api.test.ts | Planned
MIG-03 | Migration/Regression | AC-23, BR-19 | Seed idempotency | Second run creates no duplicates; row counts stable | server/tests/lab-04/migration-regression.api.test.ts | Planned
MIG-04 | Migration/Regression | AC-23, BR-19 | Seed coverage matrix | All 8 statuses, 4 priorities, assigned+unassigned, 0/1/many actions, both follow-up variants, zero-metric user present | server/tests/lab-04/migration-regression.api.test.ts | Planned
REG-01 | Migration/Regression | AC-24, FR-20 | Lab 1 baseline (health, categories, seed) | Existing lab-01 tests pass unchanged | server/tests/lab-01 (existing) | Planned
REG-02 | Migration/Regression | AC-24, FR-20 | Lab 2 requester tickets (create/my/detail) | Existing lab-02 ticket tests pass unchanged | server/tests/lab-02 (existing) | Planned
REG-03 | Migration/Regression | AC-24, FR-20 | Lab 2 attachments lifecycle | Existing attachment tests pass unchanged | server/tests/lab-02 (existing) | Planned
REG-04 | Migration/Regression | AC-24, FR-20 | Lab 3 authentication + password change | Existing auth tests pass unchanged | server/tests/lab-03/auth.api.test.ts | Planned
REG-05 | Migration/Regression | AC-24, BR-20 | Lab 3 authorization matrix | Existing authorization tests pass unchanged | server/tests/lab-03/authorization.api.test.ts | Planned
REG-06 | Migration/Regression | AC-24, FR-20 | Lab 3 comments/notes + advisory indication | Existing tests pass unchanged | server/tests/lab-03/comments-notes.api.test.ts | Planned
REG-07 | Migration/Regression | AC-24, FR-20 | Lab 3 queue + staff detail (incl. status upgrade `expectedUpdatedAt`) | Existing tests pass after the documented Issue-32 client/test update | server/tests/lab-03/staff-ticket-detail.api.test.ts, staff-queue.api.test.ts | Planned
REG-08 | Migration/Regression | AC-24, FR-20 | Lab 3 user management + client UI suites | Existing admin + client lab-01..03 tests pass unchanged | server/tests/lab-03/users-admin.api.test.ts, client/tests (existing) | Planned
PERF-01 | Performance-smoke | AC-18, D-8 | Staff dashboard endpoint latency on seed data | `GET /api/staff/dashboard` < 1000 ms (single run, generous bound) | server/tests/lab-04/performance-smoke.api.test.ts | Planned
PERF-02 | Performance-smoke | AC-01 | Actions list latency on a multi-action Ticket | `GET /api/tickets/:id/actions` < 500 ms | server/tests/lab-04/performance-smoke.api.test.ts | Planned
PERF-03 | Performance-smoke | AC-20 | Queue drill-down queries (`ownerId=me`, `status`, `sort`) | `GET /api/staff/tickets` filtered < 1000 ms | server/tests/lab-04/performance-smoke.api.test.ts | Planned
RESP-01 | Responsive | AC-25 | Lab 4 screens at 1280 / 1024 / 820 / 390 | No page horizontal scroll, no clipped content, no overlap; dashboards/actions/workflow usable | e2e/lab-04/responsive.spec.ts | Planned
RESP-02 | Responsive | AC-25 | Actions table and dashboard grids never scroll sideways | `table-layout` respected; no `overflow-x` wrappers on page level | e2e/lab-04/responsive.spec.ts | Planned
A11Y-01 | Accessibility | AC-25 | Focus visibility, keyboard operation, semantic labels, live regions on new screens | Assertions green at each viewport | e2e/lab-04/accessibility.spec.ts | Planned
E2E-01 | E2E | AC-01, AC-07, AC-10, AC-25, AC-26 | Actions Taken flow: staff login → open Ticket → add action (second actor) → follow-up validation → edit → duplicate click → requester read-only view | Full flow green end to end | e2e/lab-04/actions-taken-flow.spec.ts | Planned
E2E-02 | E2E | AC-11, AC-16, AC-25 | Ticket resolution: permitted transitions → gate blocked without action → add action → Resolve → requester advisory does not resolve → conflict path | Full workflow green end to end | e2e/lab-04/ticket-resolution.spec.ts | Planned
E2E-03 | E2E | AC-02, AC-18..21, AC-25 | Dashboards: staff metrics + drill-down to Queue/Detail; requester metrics + drill-down to My Tickets; empty user zero-state | Dashboards + drill-downs green end to end | e2e/lab-04/dashboards.spec.ts | Planned

`e2e/lab-04/responsive.spec.ts` and `accessibility.spec.ts` are supplementary files beyond the sheet's minimum three E2E specs (Lab 3 precedent); the three required specs remain `actions-taken-flow`, `ticket-resolution`, and `dashboards`.

## 3. Acceptance-Criterion Traceability

Every AC in `specification.md` §9 maps to at least one planned test (IDs below match the "Planned test(s)" column of that document).

AC | Tests
---|---
AC-01 | API-TA-01, UI-TA-02, E2E-01
AC-02 | API-RD-01, UI-RD-01
AC-03 | API-TA-02
AC-04 | API-TA-03, UNIT-01, UI-TA-03
AC-05 | API-TA-04, API-AUTH-01
AC-06 | API-TA-05, UI-TA-01, UI-TA-04
AC-07 | API-TA-06, E2E-01
AC-08 | API-TA-07
AC-09 | API-TA-08, UI-TA-05
AC-10 | API-TA-09, UI-TA-06, E2E-01
AC-11 | API-WF-01, UNIT-02, E2E-02
AC-12 | API-WF-02, API-AUTH-02
AC-13 | API-WF-03
AC-14 | API-WF-04, API-TA-10, UI-TA-05
AC-15 | API-WF-05, MIG-02, E2E-02
AC-16 | UI-WF-01, E2E-02
AC-17 | UI-WF-02, UI-TA-03
AC-18 | API-SD-01, API-SD-02, UNIT-03, PERF-01
AC-19 | API-SD-03, UI-SD-04
AC-20 | UI-SD-01, UI-SD-02, E2E-03, PERF-03
AC-21 | API-RD-02, UI-RD-01, UI-RD-02, E2E-03
AC-22 | MIG-01, MIG-02
AC-23 | MIG-03, MIG-04
AC-24 | REG-01…REG-08
AC-25 | STYLE-01, STYLE-02, RESP-01, RESP-02, A11Y-01, E2E-01…E2E-03
AC-26 | API-TA-09, UI-TA-06, UI-WF-03, UI-SD-03, E2E-01

## 4. Business-Rule Coverage

BR | Tests
---|---
BR-01 | API-TA-01
BR-02 | API-TA-06, E2E-01
BR-03 | API-TA-02, API-TA-07, UI-TA-02
BR-04 | API-TA-04, API-TA-05, API-AUTH-01, UI-TA-04
BR-05 | API-TA-03, UNIT-01, UI-TA-03
BR-06 | API-TA-03, API-TA-08, UNIT-04
BR-07 | API-TA-05
BR-08 | API-WF-01, API-WF-02, API-AUTH-02, UNIT-02
BR-09 | API-WF-02, API-AUTH-02, UI-WF-01
BR-10 | API-WF-03, E2E-02
BR-11 | API-WF-05, MIG-02, UI-WF-01, UI-WF-02, E2E-02
BR-12 | API-TA-10, API-WF-04, UI-TA-05, UI-WF-02
BR-13 | API-TA-09, UI-TA-06, E2E-01
BR-14 | API-SD-01, API-RD-01
BR-15 | UNIT-03, API-SD-01, API-RD-01
BR-16 | API-RD-01, API-RD-02
BR-17 | API-SD-02, API-RD-02, UI-SD-02, UI-RD-02
BR-18 | MIG-01, MIG-02
BR-19 | MIG-03, MIG-04
BR-20 | REG-01…REG-08
BR-21 | API-TA-05, API-RD-01 (non-disclosing shapes)

## 5. Regression Coverage (Labs 1–3)

- `REG-01…REG-08` re-run the existing suites unchanged (except the documented Issue 32 update where the Lab 3 status client/tests start sending `expectedUpdatedAt` — see `api-spec.md` §4).
- The full `cd server && npm test` and `cd client && npm test` runs include Labs 1–3 by construction; Lab 4 must not reduce those totals.
- Representative Lab 1–3 UI/E2E flows stay green: authentication, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, IT Staff Queue/Detail, User Management (AC-24; sheet Part 8).

## 6. Performance-Smoke Notes

- Thresholds are deliberately generous (< 500 ms / < 1000 ms on local seed data) to catch accidental N+1 loads or full-collection scans — the failure mode the dashboard contract forbids (sheet §6.2) — without flaking on slow machines.
- PERF-01 and PERF-03 also assert payload shape: dashboards never return full Ticket collections (item caps ≤ 5 per list).

## 7. Test Commands

- Server API/unit/migration: `cd server && npm test`
- Client UI/style: `cd client && npm test`
- E2E + responsive + accessibility: `npm run test:e2e` (root; client on `:5173`, API on `:3000`)
- Visual screenshots (Issue 37): `npm run screenshots:lab4` (root) → `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/`
- Render test logs to PNG (Issue 37): `node scripts/render-test-logs.mjs` → `artifacts/lab-04/test-output/png/`

## 8. Final Status

**Status: PLANNED** — this document was merged as the Test DD deliverable of Issue 28, before the implementation PRs (Issues 29–37), providing the Test-DD ordering evidence required by grading Part 3. The Final column, per-suite counts, provenance capture, and raw logs will be filled in on `main` during Issue 36/37 exactly as in Lab 3 §6–§7: no hand-written numbers, everything backed by committed terminal output under `artifacts/lab-04/test-output/`.
