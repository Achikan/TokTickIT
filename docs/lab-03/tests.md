# Lab 3 Test Plan (Sprint 3 Test DD)

## 1. Test Strategy

Testing follows Test-Driven Development (TDD) and is planned up front from `specification.md` (Test DD) before implementation begins — it is not reconstructed afterward. A test covers every Acceptance Criterion and Business Rule in `docs/lab-03/specification.md`. Coverage spans: **unit**, **API/integration**, **UI component**, **UI style**, **responsive**, **migration/regression**, **security/authorization**, and **E2E**. Tests live under `server/tests/lab-03/`, `client/tests/lab-03/`, and `e2e/lab-03/`.

This document is the plan (status `Planned`) and is updated to `Pass` only as the corresponding Issue implementation is completed and verified.

## 2. Planned Tests

### Server — Authentication (server/tests/lab-03/auth.api.test.ts)

Test ID | Type | Requirement / AC | What It Tests | Expected Result
---|---|---|---|---
API-01 | API | AC-01, FR-01 | Valid login | 200; session cookie set; user identity + role returned
API-02 | API | AC-05, BR-01 | Invalid credentials | 401 generic safe error; no account enumeration
API-03 | API | AC-06, BR-05 | Inactive account login | 401/403 clear but non-disclosing response
API-04 | API | AC-02, FR-04 | `requiresPasswordChange` returned; app-gated until changed | Flag true; only change-password route usable
API-05 | API | AC-07, BR-03 | Weak / mismatched new password | 400 field validation; still gated
API-06 | API | AC-02, FR-04 | Valid password change | 200; flag false; normal endpoints usable
API-07 | API | AC-08, FR-02, BR-04 | Logout invalidates session | 200; subsequent protected calls 401
API-08 | API | AC-01, FR-03, BR-06 | Current user retrieval | 200 identity + role; independent of client requesterId

### Server — Authorization (server/tests/lab-03/authorization.api.test.ts)

Test ID | Type | Requirement / AC | What It Tests | Expected Result
---|---|---|---|---
API-09 | API | AC-09, FR-06 | Unauthenticated protected endpoint | 401
API-10 | API | AC-10, FR-06 | Requester requests staff queue | 403 without data
API-11 | API | AC-22, FR-06 | Non-Admin requests user management | 403 without data
API-12 | API | AC-03, FR-07, BR-06 | Client-supplied requesterId ignored | Authenticated identity used; no foreign data returned
API-13 | API | AC-04, BR-10 | Requester requests Internal Note endpoint | 403; no note content exposed
API-14 | API | AC-03, BR-21 | Cross-user Ticket/Attachment access | Non-disclosing 404/403
API-15 | API | AC-11, FR-06 | Role-protected operation on hidden destination | 403 (server enforcement, not just hidden UI)

### Server — Requester Regression (server/tests/lab-03/migration-regression.api.test.ts)

Test ID | Type | Requirement / AC | What It Tests | Expected Result
---|---|---|---|---
MIGR-01 | API | AC-12, FR-08 | Development Requester rows migrated to Users | Users exist with role REQUESTER; selector endpoints gone
MIGR-02 | API | AC-12, FR-09 | Existing Tickets/Attachments preserved and correctly owned | Creation, listing, detail, attachments work via session identity
API-16 | API | AC-12, FR-09 | Create Ticket as authenticated Requester | 201; ticket owned by session user
API-17 | API | AC-12, FR-09 | My Tickets returns only session user's Tickets | No other user's tickets
API-18 | API | AC-12, FR-09 | Ticket Detail + Attachments ownership | Own ticket works; foreign rejected

### Server — Comments and Notes (server/tests/lab-03/comments-notes.api.test.ts)

Test ID | Type | Requirement / AC | What It Tests | Expected Result
---|---|---|---|---
API-19 | API | AC-17, FR-10 | Requester posts Public Comment on own Ticket | 201; author + time recorded
API-20 | API | AC-17, FR-17 | Public Comments visible to Requester/IT Staff/Admin | 200 for all three roles
API-21 | API | AC-17, FR-18 | IT Staff/Admin create + list Internal Note | 201 / 200; author + time recorded
API-22 | API | AC-04, BR-10 | Requester requests Internal Note | 403; no note content returned
API-23 | API | AC-17, BR-12 | Empty / whitespace / > 2,000 chars Comment/Note | 400 field error; nothing saved (append-only)
API-24 | API | FR-11, BR-11 | Requester indicates Problem Appears Resolved | 200 (idempotent); status unchanged; IT Staff can see it

### Server — Staff Ticket Queue (server/tests/lab-03/staff-queue.api.test.ts)

Test ID | Type | Requirement / AC | What It Tests | Expected Result | Final
---|---|---|---|---|---
API-25 | API | AC-13, FR-12 | Queue search / filter / sort / pagination | 200 correct items + pagination metadata + filtersApplied | Pass
API-26 | API | AC-13, BR-10 | Invalid search/filter/sort/page values | 400 specific error; not silently ignored | Pass
API-27 | API | AC-10, FR-06 | Queue requested by Requester | 403 without data | Pass

### Server — Staff Ticket Detail (server/tests/lab-03/staff-ticket-detail.api.test.ts)

Test ID | Type | Requirement / AC | What It Tests | Expected Result
---|---|---|---|---
API-28 | API | FR-13 | Staff retrieve one Ticket | 200 full detail incl. comments/notes/attachments
API-29 | API | AC-14, FR-14 | Claim / assign / reassign owner | 200; owner updated
API-30 | API | AC-14, BR-07 | Owner eligibility (role/inactive) and Requester claim | Invalid target → 400; Requester → 403
API-31 | API | AC-15, FR-15 | IT Priority updated by Staff/Admin | 200
API-32 | API | AC-15, BR-08 | IT Priority change by Requester | 403
API-33 | API | AC-16, FR-16 | Permitted status transition (matrix) | 200; new status persisted
API-34 | API | AC-16, BR-09 | Forbidden status transition | 409 specific conflict message

### Server — Administrator User Management (server/tests/lab-03/users-admin.api.test.ts)

Test ID | Type | Requirement / AC | What It Tests | Expected Result
---|---|---|---|---
API-35 | API | AC-18, FR-19 | List users with name/email search + role filter | 200 correct subset + filtersApplied
API-36 | API | AC-19, FR-20 | Create user with one role + initial password | 201; requiresPasswordChange true
API-37 | API | AC-19, BR-14 | Duplicate email (case-insensitive) | 409
API-38 | API | AC-19, BR-16 | Invalid role value | 400
API-39 | API | AC-20, FR-21 | Edit name/email/role/activation | 200; changes persisted
API-40 | API | AC-20, FR-22 | Set new initial password | 200; requiresPasswordChange true; next login gated
API-41 | API | AC-21, BR-18 | Administrator self-deactivation | 409
API-42 | API | AC-21, BR-19 | Deactivating the last active Administrator | 409
API-43 | API | AC-22, BR-20 | Non-Admin user management; no delete endpoint | 403; only deactivation exists

### Server — Unit (server/tests/lab-03/*.unit.test.ts)

Test ID | Type | Requirement / AC | What It Tests | Expected Result
---|---|---|---|---
UNIT-01 | Unit | BR-02 | Password hashing | Hash ≠ plaintext; verify succeeds; never returned
UNIT-02 | Unit | BR-14 | Email normalization + uniqueness | Lowercased; duplicates detected
UNIT-03 | Unit | BR-04 | Session expiry + logout invalidation | Expired/invalidated tokens rejected
UNIT-04 | Unit | BR-03 | Ticket Number generator regression | Lab 2 format preserved (`TK-######` unique)

### Client — UI Component (client/tests/lab-03/)

Test ID | Type | Requirement / AC | What It Tests | Expected Result | File
---|---|---|---|---|---
UI-01 | UI | AC-05, FR-01 | Login field validation + busy state | Near-field messages; no double submit | Login.test.tsx
UI-02 | UI | AC-01 | Login success routes by role | Requester/Staff/Admin home shown | Login.test.tsx
UI-03 | UI | AC-06 | Login inactive-account message | Safe clear message | Login.test.tsx
UI-04 | UI | AC-05 | Login failure preserves email | Safe error; email retained | Login.test.tsx
UI-05 | UI | AC-07 | ChangePassword policy + confirm validation | Mismatch/weak messages | ChangePassword.test.tsx
UI-06 | UI | AC-02 | ChangePassword success opens app | App loads after change | ChangePassword.test.tsx
UI-07 | UI | AC-11 | Shell shows user + role-specific nav | Only permitted destinations | Login.test.tsx
UI-08 | UI | AC-08 | Logout clears access to app screens | Login screen shown | Login.test.tsx
UI-09 | UI | AC-12 | Requester screens regress without selector | No selector; session identity | staff/requester regression spec
UI-10 | UI | FR-10..11 | Requester Detail comments + resolved indication | Comment posts; indication records | staff regression spec
UI-11 | UI | AC-13 | StaffQueue search/filter/sort/pagination | Controls update the list | StaffTicketQueue.test.tsx
UI-12 | UI | AC-24 | StaffQueue empty vs no-results | Distinct states | StaffTicketQueue.test.tsx
UI-13 | UI | AC-14..16 | StaffTicketDetail claim/priority/status controls | Permitted actions; conflicts surfaced | StaffTicketDetail.test.tsx
UI-14 | UI | AC-17 | Comments vs Notes visually distinct | Distinct sections/markers | StaffTicketDetail.test.tsx
UI-15 | UI | AC-18 | UserManagement list/search/role filter | Correct users shown | UserManagement.test.tsx
UI-16 | UI | AC-19..20 | UserManagement create/edit validation | Duplicate email/invalid input messages | UserManagement.test.tsx
UI-17 | UI | AC-21 | Self/last-admin protection feedback | Conflict message shown | UserManagement.test.tsx
UI-18 | UI | AC-24 | Forbidden/failure feedback rendering | Safe messages on all screens | shared

### Client — UI Style (client/tests/lab-03/style.test.tsx)

Test ID | Type | Requirement / AC | What It Tests | Expected Result
---|---|---|---|---
STYLE-01 | UI Style | AC-23 | Role/status/priority badges; read-only vs editable | Assertions per ui-spec (colors, labels, markers)
STYLE-02 | UI Style | AC-17 | Public Comments vs Internal Notes distinct | Distinct surface tint + Internal marker, text not color alone

### E2E / Responsive (e2e/lab-03/)

Test ID | Type | Requirement / AC | What It Tests | Expected Result | File
---|---|---|---|---|---
RESP-01 | Responsive | AC-23 | All major screens at desktop/tablet/mobile | No clipping/overlap/h-scroll; usable controls | responsive.spec.ts
E2E-01 | E2E | AC-01..02 | Full auth flow: login → change password → logout → blocked | End-to-end gate + logout enforcement | authentication.spec.ts
E2E-02 | E2E | AC-02 | Initial-password (first login) change | App opens only after valid change | authentication.spec.ts
E2E-03 | E2E | AC-13..17 | Staff flow: queue → open → claim → priority → status → comment → note | Full staff workflow works | staff-ticket-flow.spec.ts
E2E-04 | E2E | AC-17, FR-11 | Requester resolved indication visible to staff | Indication surfaced in staff view | staff-ticket-flow.spec.ts
E2E-05 | E2E | AC-19..20 | Admin: create user → set initial password → first-login change | User administration end to end | user-administration.spec.ts

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
AC-11 | API-15, UI-07, UI-08
AC-12 | MIGR-01, MIGR-02, API-16..18, UI-09
AC-13 | API-25, API-26, UI-11
AC-14 | API-29, API-30
AC-15 | API-31, API-32
AC-16 | API-33, API-34
AC-17 | API-19..23, UI-14, STYLE-02, E2E-03
AC-18 | API-35, UI-15
AC-19 | API-36..38, UI-16, E2E-05
AC-20 | API-39, API-40, UI-16, E2E-05
AC-21 | API-41, API-42, UI-17
AC-22 | API-11, API-43
AC-23 | STYLE-01, RESP-01
AC-24 | UI-12, UI-18

## 4. Migration / Regression Evidence

- `MIGR-01..02` prove the Development Requester → User migration: existing Lab 2 Tickets and Attachments remain valid and are owned by the correct users after the migration; the temporary selector endpoints are removed.
- `API-16..18` (requester regression) reuse the Lab 2 ticket/attachment suites against the authenticated identity; every Lab 2 test file is expected to continue passing unchanged except for identity handling.

## 5. Test Commands

- Server API/unit: `cd server && npm test`
- Client UI/style: `cd client && npm test`
- E2E + responsive: `npm run test:e2e` (root; starts the client on `:5173`; API must be running on `:3000`)
- Visual screenshots: `npm run screenshots` → `artifacts/lab-03/screenshots/{authentication,staff-queue,staff-ticket-detail,user-management}/`

## 6. Final Status

Populated by the corresponding implementation issues (18–25) as each suite turns green.

| Suite | Command | Status |
|---|---|---|
| Server (unit + API) — Lab 3 | `cd server && npm test` | Planned |
| Client (UI + style) — Lab 3 | `cd client && npm test` | Planned |
| E2E + Responsive — Lab 3 | `npm run test:e2e` | Planned |

Issue-by-issue pass status (updated as each implementation lands):

- **Issue 21 (Staff Ticket Queue)** — `server/tests/lab-03/staff-queue.api.test.ts` API-25..27 → **Pass** (`cd server && npm test`, 27/27 queue tests, 128 total). `client/tests/lab-03/StaffTicketQueue.test.tsx` UI-11, UI-12, UI-18 → **Pass** (client suite 70/70).