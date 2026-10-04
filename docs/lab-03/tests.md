# Lab 3 Test Plan (Sprint 3 Test DD)

## 1. Test Strategy

Testing follows Test-Driven Development (TDD) and is planned up front from `specification.md` (Test DD) before implementation begins — it is not reconstructed afterward. A test covers every Acceptance Criterion and Business Rule in `docs/lab-03/specification.md`. Coverage spans: **unit**, **API/integration**, **UI component**, **UI style**, **responsive**, **migration/regression**, **security/authorization**, and **E2E**. Tests live under `server/tests/lab-03/`, `client/tests/lab-03/`, and `e2e/lab-03/`.

The plan was created first (Issue 16, PR #49) and later issues implemented against it. The table below follows the Lab 3 sheet template (Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final).

## 2. Planned Tests

Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final
---|---|---|---|---|---|---
API-01 | API | AC-01, FR-01 | Valid login | Authenticated response; session cookie; user identity + role | server/tests/lab-03/auth.api.test.ts | Pass
API-02 | API | AC-05, BR-01 | Invalid credentials | 401 generic safe error; no account enumeration | server/tests/lab-03/auth.api.test.ts | Pass
API-03 | API | AC-06, BR-08 | Inactive account login | Safe non-disclosing 401/403; no session created | server/tests/lab-03/auth.api.test.ts | Pass
API-04 | API | AC-02, FR-04 | `requiresPasswordChange` returned; app-gated until changed | Flag true; only change-password route usable | server/tests/lab-03/auth.api.test.ts | Pass
API-05 | API | AC-07, BR-02 | Weak / mismatched new password | 400 field validation; still gated | server/tests/lab-03/auth.api.test.ts | Pass
API-06 | API | AC-02, FR-04 | Valid password change | 200; flag false; normal endpoints usable | server/tests/lab-03/auth.api.test.ts | Pass
API-07 | API | AC-08, FR-02, BR-07 | Logout invalidates session | 200; subsequent protected calls 401; no sessions remain | server/tests/lab-03/auth.api.test.ts | Pass
API-08 | API | AC-01, FR-03, BR-03 | Current user retrieval | 200 identity + role; ignores client requesterId; no passwordHash | server/tests/lab-03/auth.api.test.ts | Pass
API-09 | API | AC-09, FR-06 | Unauthenticated protected endpoint | 401 for every protected route | server/tests/lab-03/authorization.api.test.ts | Pass
API-10 | API | AC-10, FR-06 | Requester requests the staff queue | 403 without data | server/tests/lab-03/authorization.api.test.ts | Pass
API-11 | API | AC-22, FR-06 | Non-Admin requests user management | 403 without data | server/tests/lab-03/authorization.api.test.ts | Pass
API-12 | API | AC-03, FR-07, BR-03 | Client-supplied requesterId ignored | Authenticated identity used; no foreign data returned | server/tests/lab-03/authorization.api.test.ts | Pass
API-13 | API | AC-04, BR-04 | Requester requests Internal Note endpoint | 403; no note content exposed | server/tests/lab-03/authorization.api.test.ts | Pass
API-14 | API | AC-03, BR-21 | Cross-user Ticket/Attachment access | Non-disclosing 404/403 | server/tests/lab-03/authorization.api.test.ts | Pass
API-15 | API | AC-11, FR-06 | Role-protected operation on hidden destination | 403 (server enforcement, not just hidden UI) | server/tests/lab-03/authorization.api.test.ts | Pass
MIGR-01 | Migration/Regression | AC-12, FR-08 | Development Requester rows migrated to Users | Users exist with role REQUESTER; selector endpoints gone (404) | server/tests/lab-03/migration-regression.api.test.ts | Pass
MIGR-02 | Migration/Regression | AC-12, FR-09 | Existing Tickets/Attachments preserved and correctly owned | Tickets/attachments valid and owned via session identity | server/tests/lab-03/migration-regression.api.test.ts | Pass
API-16 | API | AC-12, FR-09 | Create Ticket as authenticated Requester | 201; ticket owned by session user | server/tests/lab-02/create-ticket.api.test.ts | Pass
API-17 | API | AC-12, FR-09 | My Tickets returns only session user's Tickets | No other user's tickets | server/tests/lab-02/my-tickets.api.test.ts | Pass
API-18 | API | AC-12, FR-09 | Ticket Detail + Attachments ownership | Own ticket works; foreign rejected | server/tests/lab-02/ticket-detail.api.test.ts | Pass
API-19 | API | AC-17, FR-10 | Requester posts Public Comment on own Ticket | 201; author + time recorded | server/tests/lab-03/comments-notes.api.test.ts | Pass
API-20 | API | AC-17, FR-17 | Public Comments visible to Requester/IT Staff/Admin | 200 for all three roles | server/tests/lab-03/comments-notes.api.test.ts | Pass
API-21 | API | AC-17, FR-18 | IT Staff/Admin create + list Internal Note | 201 / 200; author + time recorded | server/tests/lab-03/comments-notes.api.test.ts | Pass
API-22 | API | AC-04, BR-04 | Requester requests Internal Note | 403; no note content returned | server/tests/lab-03/comments-notes.api.test.ts | Pass
API-23 | API | AC-17, BR-12 | Empty / whitespace / > 2,000 chars Comment/Note | 400 field error; nothing saved (append-only) | server/tests/lab-03/comments-notes.api.test.ts | Pass
API-24 | API | FR-11, BR-05 | Requester indicates Problem Appears Resolved | 200 (idempotent); status unchanged; IT Staff can see it | server/tests/lab-03/comments-notes.api.test.ts | Pass
API-25 | API | AC-13, FR-12 | Queue search / filter / sort / pagination | 200 correct items + pagination metadata + filtersApplied | server/tests/lab-03/staff-queue.api.test.ts | Pass
API-26 | API | AC-13, BR-04 | Invalid search/filter/sort/page values | 400 specific error; not silently ignored | server/tests/lab-03/staff-queue.api.test.ts | Pass
API-27 | API | AC-10, FR-06 | Queue requested by Requester | 403 without data | server/tests/lab-03/staff-queue.api.test.ts | Pass
API-28 | API | FR-13 | Staff retrieve one Ticket | 200 full detail incl. comments/notes/attachments | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass
API-29 | API | AC-14, FR-14 | Claim / assign / reassign owner | 200; owner updated | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass
API-30 | API | AC-14, BR-10 | Owner eligibility (role/inactive) and Requester claim | Invalid target → 400; Requester → 403 | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass
API-31 | API | AC-15, FR-15 | IT Priority updated by Staff/Admin | 200 | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass
API-32 | API | AC-15, BR-11 | IT Priority change by Requester | 403 | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass
API-33 | API | AC-16, FR-16 | Permitted status transition (matrix) | 200; new status persisted | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass
API-34 | API | AC-16, BR-13 | Forbidden status transition | 409 specific conflict message | server/tests/lab-03/staff-ticket-detail.api.test.ts | Pass
API-35 | API | AC-18, FR-19 | List users with name/email search + role filter | 200 correct subset + filtersApplied | server/tests/lab-03/users-admin.api.test.ts | Pass
API-36 | API | AC-19, FR-20 | Create user with one role + initial password | 201; requiresPasswordChange true | server/tests/lab-03/users-admin.api.test.ts | Pass
API-37 | API | AC-19, BR-09 | Duplicate email (case-insensitive) | 409 | server/tests/lab-03/users-admin.api.test.ts | Pass
API-38 | API | AC-19, BR-16 | Invalid role value | 400 | server/tests/lab-03/users-admin.api.test.ts | Pass
API-39 | API | AC-20, FR-21 | Edit name/email/role/activation | 200; changes persisted | server/tests/lab-03/users-admin.api.test.ts | Pass
API-40 | API | AC-20, FR-22 | Set new initial password | 200; requiresPasswordChange true; next login gated | server/tests/lab-03/users-admin.api.test.ts | Pass
API-41 | API | AC-21, BR-18 | Administrator self-deactivation | 409 | server/tests/lab-03/users-admin.api.test.ts | Pass
API-42 | API | AC-21, BR-19 | Deactivating the last active Administrator | 409 | server/tests/lab-03/users-admin.api.test.ts | Pass
API-43 | API | AC-22, BR-20 | Non-Admin user management; no delete endpoint | 403; only deactivation exists | server/tests/lab-03/users-admin.api.test.ts | Pass
UNIT-01 | Unit | BR-06 | Password hashing | Hash ≠ plaintext; verify succeeds; never returned | server/tests/lab-03/password-policy.unit.test.ts | Pass
UNIT-02 | Unit | BR-09 | Email normalization + uniqueness | Lowercased; duplicates detected | server/tests/lab-03/email-normalize.unit.test.ts | Pass
UNIT-03 | Unit | BR-07 | Session expiry + logout invalidation | Expired/invalidated tokens rejected | server/tests/lab-03/session-lifecycle.unit.test.ts | Pass
UNIT-04 | Unit | BR-02 | Ticket Number generator regression | Lab 2 format preserved (`TK-######` unique) | server/tests/lab-03/ticket-number.unit.test.ts | Pass
UI-01 | UI | AC-05, FR-01 | Login field validation + busy state | Near-field messages; no double submit | client/tests/lab-03/Login.test.tsx | Pass
UI-02 | UI | AC-01 | Login success routes by role | Requester/Staff/Admin home shown | client/tests/lab-03/Login.test.tsx | Pass
UI-03 | UI | AC-06 | Login inactive-account message | Safe clear message | client/tests/lab-03/Login.test.tsx | Pass
UI-04 | UI | AC-05 | Login failure preserves email | Safe error; email retained | client/tests/lab-03/Login.test.tsx | Pass
UI-05 | UI | AC-07 | ChangePassword policy + confirm validation | Mismatch/weak messages | client/tests/lab-03/ChangePassword.test.tsx | Pass
UI-06 | UI | AC-02 | ChangePassword success opens app | App loads after change | client/tests/lab-03/ChangePassword.test.tsx | Pass
UI-07 | UI | AC-11 | Shell shows user + role-specific nav | Only permitted destinations | client/tests/lab-03/Login.test.tsx | Pass
UI-08 | UI | AC-08 | Logout clears access to app screens | Login screen shown | client/tests/lab-03/Login.test.tsx | Pass
UI-09 | UI | AC-12 | Requester screens regress without selector | No selector; identity from session | client/tests/lab-03/RequesterRegression.test.tsx | Pass
UI-10 | UI | FR-10..11 | Requester Detail comments + resolved indication | Comment posts; indication records | client/tests/lab-03/RequesterRegression.test.tsx | Pass
UI-11 | UI | AC-13 | StaffQueue search/filter/sort/pagination | Controls update the list | client/tests/lab-03/StaffTicketQueue.test.tsx | Pass
UI-12 | UI | AC-24 | StaffQueue empty vs no-results | Distinct states | client/tests/lab-03/StaffTicketQueue.test.tsx | Pass
UI-13 | UI | AC-14..16 | StaffTicketDetail claim/priority/status controls | Permitted actions; conflicts surfaced | client/tests/lab-03/StaffTicketDetail.test.tsx | Pass
UI-14 | UI | AC-17 | Comments vs Notes visually distinct | Distinct sections/markers | client/tests/lab-03/StaffTicketDetail.test.tsx | Pass
UI-15 | UI | AC-18 | UserManagement list/search/role filter | Correct users shown | client/tests/lab-03/UserManagement.test.tsx | Pass
UI-16 | UI | AC-19..20 | UserManagement create/edit validation | Duplicate email/invalid input messages | client/tests/lab-03/UserManagement.test.tsx | Pass
UI-17 | UI | AC-21 | Self/last-admin protection feedback | Conflict message shown | client/tests/lab-03/UserManagement.test.tsx | Pass
UI-18 | UI | AC-24 | Forbidden/failure feedback rendering | Safe messages on all screens | client/tests/lab-03/StaffTicketQueue.test.tsx | Pass
STYLE-01 | UI Style | AC-23 | Role/status/priority badges; read-only vs editable | Assertions per ui-spec (colors, labels, markers) | client/tests/lab-03/style.test.tsx | Pass
STYLE-02 | UI Style | AC-17 | Public Comments vs Internal Notes distinct | Distinct surface tint + Internal marker, text not color alone | client/tests/lab-03/style.test.tsx | Pass
RESP-01 | Responsive | AC-23 | All major screens at desktop/tablet/mobile | No clipping/overlap/h-scroll; usable controls | e2e/lab-03/responsive.spec.ts | Pass
A11Y-01 | Accessibility | AC-24, sheet §8.7 | Landmarks, labelled controls, keyboard usable | A11y assertions green at each viewport | e2e/lab-03/accessibility.spec.ts | Pass
E2E-01 | E2E | AC-01..02 | Full auth flow: login → change password → logout → blocked | End-to-end gate + logout enforcement | e2e/lab-03/authentication.spec.ts | Pass
E2E-02 | E2E | AC-02 | Initial-password (first login) change | App opens only after valid change | e2e/lab-03/authentication.spec.ts | Pass
E2E-03 | E2E | AC-13..17 | Staff flow: queue → open → claim → priority → status → comment → note | Full staff workflow works | e2e/lab-03/staff-ticket-flow.spec.ts | Pass
E2E-04 | E2E | AC-17, FR-11 | Requester resolved indication visible to staff | Indication surfaced in staff view | e2e/lab-03/staff-ticket-flow.spec.ts | Pass
E2E-05 | E2E | AC-19..20 | Admin: create user → set initial password → first-login change | User administration end to end | e2e/lab-03/user-administration.spec.ts | Pass

## 3. Acceptance-Criterion Traceability

AC | Tests
---|---
AC-01 | API-01, API-08, UI-02, E2E-01
AC-02 | API-04, API-06, UI-06, E2E-01, E2E-02
AC-03 | API-08, API-12, API-14
AC-04 | API-13, API-22
AC-05 | API-02, UI-01, UI-04
AC-06 | API-03, UI-03
AC-07 | API-05, UI-05
AC-08 | API-07, UI-08, E2E-01
AC-09 | API-09
AC-10 | API-10, API-11, API-27
AC-11 | API-15, UI-07
AC-12 | MIGR-01, MIGR-02, API-16..18, UI-09
AC-13 | API-25, API-26, UI-11
AC-14 | API-29, API-30, UI-13
AC-15 | API-31, API-32, UI-13
AC-16 | API-33, API-34, UI-13
AC-17 | API-19..23, UI-10, UI-14, STYLE-02, E2E-03, E2E-04
AC-18 | API-35, UI-15
AC-19 | API-36..38, UI-16, E2E-05
AC-20 | API-39, API-40, UI-16, E2E-05
AC-21 | API-41, API-42, UI-17
AC-22 | API-11, API-43
AC-23 | STYLE-01, RESP-01
AC-24 | UI-12, UI-18, A11Y-01

## 4. Migration / Regression Evidence

- `MIGR-01..02` prove the Development Requester → User migration: existing Lab 2 Tickets and Attachments remain valid and are owned by the correct users after the migration; the temporary selector endpoints are removed.
- `API-16..18` (requester regression) reuse the Lab 2 ticket/attachment behaviour against the authenticated identity; every Lab 2 test file is expected to continue passing unchanged except for identity handling.

## 5. Test Commands

- Server API/unit: `cd server && npm test`
- Client UI/style: `cd client && npm test`
- E2E + responsive: `npm run test:e2e` (root; starts the client on `:5173`; API must be running on `:3000`)
- Visual screenshots: `npm run screenshots:lab3` (root; API on `:3000`, client on `:5173`) → 75 PNGs into `artifacts/lab-03/screenshots/{authentication,staff-queue,staff-ticket-detail,user-management}/` + 6 API/non-UI evidence captures into `artifacts/lab-03/api-evidence/`
- Render test logs to PNG: `node scripts/render-test-logs.mjs` (root) → `artifacts/lab-03/test-output/png/`

## 6. Final Status

Every number below was produced by actually running the suites against `main`
(commit `d3e2be44e2f02bdb843e07f077af29d6f5318d6f`, *Merge pull request #63 from
Achikan/lab3-staging*, 2026-09-30). No count in this file was written by hand; the raw
terminal output is committed under `artifacts/lab-03/test-output/` and rendered to PNG
in `artifacts/lab-03/test-output/png/` (see §7).

Pre-flight check: a search of `server/tests`, `client/tests` and `e2e` for
`test.skip` / `it.skip` / `describe.skip` / `.only(` / `xit(` / `xdescribe(` / `.todo(`
returned **0 matches** — nothing is skipped, focused or left as a todo.

| Suite | Command | Result | Log |
|---|---|---|---|
| Server — unit + API (all labs) | `cd server && npm test` | **Pass — 195/195** (20 files, 0 failed, 0 skipped) | `00-full-summary.txt` |
| Client — UI + style (all labs) | `cd client && npm test` | **Pass — 98/98** (14 files, 0 failed, 0 skipped) | `00-full-summary.txt` |
| E2E + Responsive + Accessibility | `npm run test:e2e` | **Pass — 25/25** (0 failed, 0 skipped) | `06-e2e.txt` |
| **Total** | — | **318 passed / 0 failed / 0 skipped** | `00-full-summary.txt` |

### 6.1 Breakdown by requirement category

Run separately so the rubric can see each category pass on its own.

| Category | Command | Pass | Fail | Skip | Files | Log |
|---|---|---|---|---|---|---|
| Unit | `cd server && npx vitest run tests/lab-03/*.unit.test.ts` | **17** | 0 | 0 | 4 | `01-unit.txt` |
| API / integration | `cd server && npx vitest run tests/lab-03/{auth,staff-queue,staff-ticket-detail,comments-notes,users-admin}.api.test.ts` | **106** | 0 | 0 | 5 | `02-api.txt` |
| Authorization | `cd server && npx vitest run tests/lab-03/authorization.api.test.ts` | **12** | 0 | 0 | 1 | `03-authorization.txt` |
| Migration / regression | `cd server && npx vitest run tests/lab-03/migration-regression.api.test.ts tests/lab-02` | **55** | 0 | 0 | 7 | `04-regression.txt` |
| UI component + style | `cd client && npx vitest run tests/lab-03` | **53** | 0 | 0 | 7 | `05-ui-component.txt` |
| E2E / responsive / a11y | `npm run test:e2e` | **25** | 0 | 0 | 6 specs | `06-e2e.txt` |

### 6.2 How the totals reconcile

The 195 server / 98 client totals include the earlier labs, because Lab 3 must not
regress them. Split by lab:

| Lab | Server | Client |
|---|---|---|
| Lab 3 (new in this issue) | 142 (11 files) | 53 (7 files) |
| Lab 2 (regression, must stay green) | 48 (6 files) | 42 (6 files) |
| Lab 1 (baseline, must stay green) | 5 (3 files) | 3 (1 file) |
| **Total** | **195 (20 files)** | **98 (14 files)** |

Server Lab 3 = 17 unit + 106 API + 12 authorization + 7 migration-regression = **142**.
The Lab 2 files sit inside `04-regression.txt`; the 5 Lab 1 tests (`seed`, `categories`,
`health`) are baseline and only appear in the full run. E2E runs against `e2e/lab-03`
only (`playwright.config.ts` sets `testDir` there), where 15 tests are defined and
Playwright executes 25 across the desktop, tablet and mobile projects (RESP-01 ×5 and
A11Y-01 ×5 re-run at tablet and mobile).

### 6.3 Issue-by-issue status

- **Issue 21 (Staff Ticket Queue)** — `server/tests/lab-03/staff-queue.api.test.ts` API-25..27 → **Pass** (27/27 tests in that file, per `02-api.txt`). `client/tests/lab-03/StaffTicketQueue.test.tsx` UI-11, UI-12, UI-18 → **Pass** (8/8).
- **Issue 23 (Administrator User Management)** — `server/tests/lab-03/users-admin.api.test.ts` API-35..43 → **Pass** (27/27, per `02-api.txt`). `client/tests/lab-03/UserManagement.test.tsx` UI-15..18 → **Pass** (13/13).
- **Issue 24 (E2E, Responsive, Accessibility)** — `e2e/lab-03/` E2E-01..05 (`authentication.spec.ts`, `requester-flow.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`) + RESP-01 (`responsive.spec.ts`) + A11Y-01 (`accessibility.spec.ts`) → **Pass — 25/25 `npm run test:e2e`**.
- **Issue 25 (Final review)** — all 69 planned rows in §2 verified green against `main`: server **195/195**, client **98/98**, E2E **25/25**.

## 7. Captured Test Evidence

Committed under `artifacts/lab-03/test-output/`. The `.txt` files are the unmodified
terminal output; the PNGs in `png/` are renders of those same files (dark background,
monospace) produced by `node scripts/render-test-logs.mjs`.

| Category | Raw log | Rendered PNG |
|---|---|---|
| Full summary (server + client + e2e) | `00-full-summary.txt` | `png/00-full-summary.png` |
| Unit | `01-unit.txt` | `png/01-unit.png` |
| API / integration | `02-api.txt` | `png/02-api.png` |
| Authorization | `03-authorization.txt` | `png/03-authorization.png` |
| Migration / regression | `04-regression.txt` | `png/04-regression.png` |
| UI component + style | `05-ui-component.txt` | `png/05-ui-component.png` |
| E2E / responsive / a11y | `06-e2e.txt` | `png/06-e2e.png` |
| Provenance (`git log -1`) | `00-main-commit.txt` | — |

Every capture starts with the same provenance header:

```
main commit: d3e2be44e2f02bdb843e07f077af29d6f5318d6f 2026-09-30 00:55:22 +0700 Merge pull request #63 from Achikan/lab3-staging
```

`02-api.txt` and `04-regression.txt` are long; their PNGs keep the header, the provenance
line, every passing test file and the final `Test Files` / `Tests` / `Duration` block, and
state how many per-test lines were trimmed. The untrimmed logs are committed alongside.