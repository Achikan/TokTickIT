# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal

Complete the TokTickIT service-desk workflow: IT Staff and Administrators record work performed under each Ticket in a new Actions Taken work log (Action Date/Time, Description, Result, auto Performed By, Follow-Up Required with mandatory Follow-up Note, and Attachment Notes); the full eight-status Ticket lifecycle is enforced server-side from creation through closure or cancellation; Requesters, IT Staff, and Administrators each receive a concise, role-appropriate dashboard linked to the detailed screens; and the entire application built across Labs 1–3 is regression-tested, hardened, and polished into one coherent Zen Green product ready for final demonstration.

## 2. Stakeholder Request

Tickets can be submitted and discussed, but there is still no reliable record of the actual work done on them. The stakeholder asks us to add Actions Taken under each Ticket so that planned and completed work is trackable line by line, while the primary Ticket Owner keeps overall coordination responsibility — different IT Staff members may legitimately perform and record individual actions. Requesters may keep indicating that a problem appears resolved, but that indication is only advisory: IT Staff must review the work and formally update the Ticket. Useful but concise dashboards are requested for Requesters and IT Staff, always connected to (never replacing) the detailed views. Finally, everything built in Labs 1–3 must keep working under the same Zen Green design language, hardened and polished for final delivery.

## 3. Scope

### Included
- **Actions Taken** data model, Prisma migration, backfill/legacy behavior, idempotent seed, REST API (create/update/read), and backend authorization.
- **Actions Taken UI** on the IT Staff Ticket Detail (list/table, create mode, view/edit mode) and read-only visibility for Requesters on owned Tickets.
- **Final Ticket workflow**: refined eight-status transition matrix with authorized roles, backend enforcement against client bypass, Requester advisory resolution indication, and stale-update (409) conflict handling.
- **Ticket workflow UI**: role- and status-aware transition controls, resolution/conflict feedback, and Ticket summary refresh after successful changes.
- **IT Staff Dashboard** (API + UI): unassigned, owned-by-me, by-status/by-priority, recently updated metrics, recent/urgent Ticket lists, drill-down to Queue/Detail; Administrator reuse with concise user-account counts.
- **Requester Dashboard** (API + UI): open, waiting-for-requester, recently updated, recently resolved metrics scoped to the authenticated Requester, drill-down to My Tickets.
- **Final regression and product hardening**: Labs 1–3 behavior (auth, roles, ownership, comments, notes, attachments, user management) preserved; consistent loading/validation/empty/forbidden/conflict/not-found/safe-failure feedback; duplicate-submit protection; removal of console errors, broken links, placeholders, and unfinished controls; current README.
- **Zen Green polish and accessibility**: responsive desktop/tablet/mobile behavior, focus/keyboard/semantic-label/non-color-cue checks, removal of obsolete UI from earlier labs, screenshots under `artifacts/lab-04/screenshots/`.
- **Deliverables**: `docs/lab-04/{specification.md, ui-spec.md, api-spec.md, tests.md, reviewer.md, ai-use.md}`, server/client/E2E test suites under `lab-04` paths, and the graded PDF (Answer Part 1–9).

### Excluded (Lab 4 sheet §4.2 — no unapproved features)
- Automatic SLA clocks, escalation engines, on-call scheduling, and breach notifications.
- Email, SMS, LINE, push, or other external notification services.
- Inventory consumption, spare-parts management, purchasing, or cost accounting for services.
- Time-sheet billing, payroll, or detailed labor-cost calculation.
- Multi-level approval workflows and electronic signatures.
- Advanced business-intelligence tools, custom report builders, or export warehouses.
- Multi-tenant organizations and production-scale cloud operations.
- Any new product feature not approved in this Sprint 4 engineering contract.
- Hard delete of Actions Taken (corrections are made by editing; see §11 D-4).

## 4. Functional Requirements

### Actions Taken
- **FR-01** The system shall store one Action Taken under exactly one Ticket, containing Action Date/Time, Action Description, Result, Performed By, Follow-Up Required, Follow-up Note, and Attachment Notes.
- **FR-02** An IT Staff or Administrator shall be able to create an Action Taken on an accessible Ticket through the backend API.
- **FR-03** An IT Staff or Administrator shall be able to update an Action Taken on an accessible Ticket (permitted fields; no hard delete).
- **FR-04** The system shall support retrieving the ordered list of Actions Taken for a Ticket: Requesters read only for owned Tickets; IT Staff/Administrators read accessible Tickets.
- **FR-05** Performed By shall be recorded automatically from the authenticated session; any client-supplied performer value shall be ignored.
- **FR-06** A Follow-up Note shall be mandatory whenever Follow-Up Required is Yes; the backend shall reject the save otherwise.
- **FR-07** An Action Taken may be performed by an IT Staff member different from the Ticket Owner; Ticket ownership and coordination are unchanged (BR-02).
- **FR-08** The system shall prevent duplicate Actions caused by repeated clicking or network retry (UI busy state plus a server-side duplicate guard).

### Ticket Workflow
- **FR-09** The backend shall enforce the final transition matrix (§5.2) and authorized roles on every status change, including direct API calls that bypass the UI.
- **FR-10** A Requester's "problem appears resolved" indication shall be stored as advisory information only and shall never change Ticket status by itself.
- **FR-11** The backend shall detect stale or concurrent updates (client submits outdated Ticket data) and respond `409 Conflict` without overwriting the other user's change.
- **FR-12** A Ticket may move to Resolved only through a permitted IT Staff/Administrator transition after the resolution gate in BR-11 is satisfied.
- **FR-13** The Ticket Detail UI shall offer only the transitions permitted for the current role and current status, and shall refresh the Ticket summary status after a successful change.
- **FR-14** The Ticket Detail UI shall present clear feedback for resolution-rule rejections and `409` conflicts without losing entered data.

### Dashboards
- **FR-15** The system shall provide an IT Staff dashboard endpoint that computes all approved metrics server-side from authoritative database data (§5.3).
- **FR-16** The system shall provide a Requester dashboard endpoint whose metrics and recent Tickets are scoped strictly to the authenticated session identity.
- **FR-17** The Administrator dashboard shall reuse the IT Staff dashboard and may add concise user-account counts.
- **FR-18** Every dashboard card and list item shall have a defined drill-down destination (filtered Queue, Ticket Detail, or My Tickets) with documented query parameters.
- **FR-19** Both dashboards shall render concise metric cards and short lists with loading, empty, forbidden, and safe-failure states, responsive on desktop/tablet/mobile.

### Regression and Hardening
- **FR-20** All Labs 1–3 behaviors shall remain available and correct for permitted users: authentication and first-login password change, role navigation, ownership protection, Public Comments, Internal Notes, Attachments, IT Staff Queue/Detail operations, and Administrator User Management.
- **FR-21** All screens shall present consistent feedback for validation, success, empty/no-results, forbidden, conflict, not-found, and safe API failure.
- **FR-22** Important forms (including Actions Taken) shall protect entered data after recoverable failures.
- **FR-23** The final application shall have no console errors, broken links, placeholder text, or unfinished controls.
- **FR-24** The README shall carry current setup, migration, seed, test, and demonstration instructions for Lab 4.
- **FR-25** All new and existing screens shall follow the Zen Green design language with the Lab 2/3 responsive and accessibility standards, and obsolete or duplicate UI from earlier labs shall be removed.

## 5. Business Rules

- **BR-01** An Action Taken belongs to exactly one Ticket.
- **BR-02** The Ticket Owner coordinates the Ticket, but an Action Taken may be by a different IT Staff member.
- **BR-03** Performed By is always the authenticated session user; client-supplied performer identifiers are ignored, and only active IT Staff or Administrator accounts may be recorded (inactive accounts are rejected with a safe validation error).
- **BR-04** Only IT Staff and Administrators may create or update Actions Taken; Requesters may read Actions Taken only on Tickets they own and can never write them (backend-enforced `403`).
- **BR-05** A Follow-Up Note (trimmed, 1–2,000 characters) is required if and only if Follow-Up Required is Yes; otherwise the request fails field validation (`400`) and nothing is saved.
- **BR-06** Action Description is required (trimmed, 1–2,000 characters). Result and Attachment Notes are optional (each ≤ 2,000 trimmed characters). Action Date/Time defaults to the server time at creation and may be adjusted by staff within the bounds in §11 D-6.
- **BR-07** Actions Taken are ordered by Action Date/Time descending (newest first) within a Ticket; ties break by `id` descending.
- **BR-08** Status changes are permitted only according to the transition matrix in §5.2; permitted roles, required fields, and validation are enforced server-side. Unlisted transitions return a safe `409` conflict error.
- **BR-09** Only IT Staff or Administrators may perform any status transition; Requesters never receive transition controls and receive `403` if they attempt one.
- **BR-10** A Requester's "problem appears resolved" indication only updates `requesterIndicatedResolvedAt` on the Ticket for staff visibility; status is unchanged (FR-10).
- **BR-11 (resolution gate)** A Ticket may transition to `RESOLVED` only if it has at least one recorded Action Taken (§11 D-3); the attempt is rejected with a safe `409` error otherwise. The gate applies to future transitions; Tickets already `RESOLVED`/`CLOSED` from earlier labs are grandfathered.
- **BR-12 (stale updates)** Status and Action updates must be based on the client's last-read Ticket `updatedAt`; a mismatch returns `409 Conflict` with safe recovery guidance and changes nothing.
- **BR-13 (duplicates)** Creating an Action with the same authenticated actor, Ticket, and trimmed Description within a 5-minute window is rejected as a duplicate (`409`); the UI additionally blocks resubmission while a request is in flight.
- **BR-14** Dashboard metrics are computed by the backend from authoritative data; clients never derive card values from full Ticket collections.
- **BR-15** Dashboard "recent" boundaries use a 7-day window compared in UTC against the database clock; the UI renders timestamps in the browser's local time (existing convention).
- **BR-16** The Requester dashboard derives its scope solely from the session identity; no request parameter can widen it to another user's Tickets.
- **BR-17** Empty metrics render as `0` with a working drill-down to the corresponding empty list view; zero-record behavior is part of the API contract.
- **BR-18** Migration preserves every Lab 1–3 row (Users, Sessions, Tickets, Attachments, Public Comments, Internal Notes, categories/systems/priorities). Legacy Tickets without Actions are treated as zero-action Tickets everywhere (detail view, dashboards, gate checks).
- **BR-19** The seed is idempotent (safe to re-run) and includes Tickets covering all eight statuses, all four priorities, assigned and unassigned ownership, Tickets with zero/one/multiple Actions, both follow-up variants, and enough data to demonstrate zero and non-zero dashboard metrics.
- **BR-20** All Labs 1–3 authorization and ownership rules continue to apply unchanged to every pre-existing endpoint; Lab 4 adds no authorization regressions.
- **BR-21** Cross-user access to another Requester's dashboard data, Actions Taken, or protected Ticket returns the same non-disclosing error shape as a missing resource.

### 5.1 Authorization Matrix (Lab 4 additions)

Operation | Requester | IT Staff | Administrator | Anonymous
---|---|---|---|---
All Labs 1–3 operations (unchanged) | per Lab 3 §5.1 | per Lab 3 §5.1 | per Lab 3 §5.1 | Login only
Read Actions Taken (Ticket Detail) | ✅ owned Tickets only (read-only) | ✅ accessible Tickets | ✅ accessible Tickets | ❌
Create / update Action Taken | ❌ (`403`) | ✅ | ✅ | ❌
Requester "Problem Appears Resolved" (advisory) | ✅ own Ticket | — (visible) | — (visible) | ❌
Status transitions (matrix §5.2 + gate BR-11) | ❌ | ✅ | ✅ | ❌
IT Staff Dashboard | ❌ (`403`) | ✅ | ✅ | ❌
Requester Dashboard | ✅ session-scoped only | ❌ (`403`) | ❌ (`403`; uses staff dashboard) | ❌
User-account counts (concise, on Admin dashboard) | ❌ | ❌ | ✅ | ❌

Hiding a control in the UI is not authorization: every write operation above is enforced by the backend.

### 5.2 Final Status Transition Matrix

Statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED` (all already present in the Lab 3 `Status` enum).

From \ To | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER | RESOLVED | CLOSED | REOPENED | CANCELLED
---|---|---|---|---|---|---|---
NEW | Staff/Admin | Staff/Admin | — | — | — | — | Staff/Admin
OPEN | — | Staff/Admin | Staff/Admin | — | — | — | Staff/Admin
IN_PROGRESS | — | — | Staff/Admin | Staff/Admin + gate (BR-11) | — | — | Staff/Admin
WAITING_FOR_REQUESTER | — | Staff/Admin | — | Staff/Admin + gate (BR-11) | — | — | Staff/Admin
RESOLVED | — | — | — | — | Staff/Admin | Staff/Admin (Reopen) | —
CLOSED | — | — | — | — | — | Staff/Admin (Reopen) | —
REOPENED | — | Staff/Admin | Staff/Admin | Staff/Admin + gate (BR-11) | — | — | Staff/Admin
CANCELLED | — | — | — | — | — | — | — (terminal)

Notes:
- Only IT Staff or Administrator may perform any transition (BR-09). Requesters use only the separate advisory indication (BR-10).
- Transitions not listed return a safe `409` error; `CANCELLED` is terminal; `NEW → NEW` etc. (self-transitions) are not permitted.
- Moving to `RESOLVED` additionally requires the BR-11 gate (≥ 1 Action Taken).
- The backend is the authority; the UI only offers permitted choices (FR-13).

### 5.3 Dashboard Metric Definitions

Active statuses for metric purposes: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`. Recent window: last 7 days, UTC (BR-15).

Metric ID | Name | Calculation (backend) | Drill-down | Empty behavior
---|---|---|---|---
SD-01 | Unassigned Tickets | count of Tickets with `ownerId IS NULL` and status ∈ active statuses | `staff/tickets?owner=unassigned` | `0` + link to empty filtered queue
SD-02 | Owned by Me | count of Tickets with `ownerId = session user` and status ∈ active statuses | `staff/tickets?owner=me` | `0` + link
SD-03 | By Status | count per each of the 8 statuses (all Tickets) | `staff/tickets?status=<value>` | zeros for unused statuses
SD-04 | By IT Priority | count per each of the 4 priorities, active statuses, grouped by `itPriority` | `staff/tickets?priority=<value>` | zeros
SD-05 | Recently Updated | Tickets with `updatedAt ≥ now − 7d`, newest first, capped at 5 (fields: number, summary, status, priority, owner, updatedAt) | Ticket Detail | empty-state message
SD-06 | Urgent / High Active | active-status Tickets with `itPriority ∈ {URGENT, HIGH}`, URGENT first, capped at 5 | Ticket Detail | empty-state message
RD-01 | My Open Tickets | Requester's Tickets (`requesterId = session user`) with status ∈ active statuses | `my-tickets?status=open` | `0` + link
RD-02 | Waiting for Me | Requester's Tickets with status = `WAITING_FOR_REQUESTER` | `my-tickets?status=WAITING_FOR_REQUESTER` | `0` + link
RD-03 | Recently Updated | Requester's Tickets with `updatedAt ≥ now − 7d`, capped at 5 | Ticket Detail | empty-state message
RD-04 | Recently Resolved | Requester's Tickets with status ∈ {`RESOLVED`, `CLOSED`} and `updatedAt ≥ now − 7d`, capped at 5 | Ticket Detail | empty-state message
AD-01 | Users (Admin add-on) | concise counts: total users, active users | User Management | `0`s

Dashboard payloads return these metrics plus the capped lists — never entire Ticket collections (sheet §6.2). The IT Staff dashboard is reused verbatim for Administrators, plus AD-01.

## 6. UI Specification Summary

Full detail lives in `ui-spec.md` (Issue 27); this section fixes the structure:

- **Application shell**: role-appropriate **Dashboard** navigation item added for all roles with clear active-page indication; all Lab 3 navigation, badges, and conventions reused.
- **IT Staff Dashboard** (also Admin): metric cards (SD-01…SD-06) with label, value, and accessible drill-down action; Recent and Urgent/High Ticket lists; loading skeleton, empty (zero metrics), forbidden, and safe-failure states; Admin additionally shows the concise user-count card (AD-01).
- **Requester Dashboard**: metric cards (RD-01…RD-04) and a short recent list, strictly session-scoped, drilling down into My Tickets filters — it complements and does not duplicate the full My Tickets screen.
- **IT Staff Ticket Detail — Actions Taken section**: list/table of Actions (date/time, Description, Result, Performed By, Follow-Up badge, Follow-up Note, Attachment Notes) sorted per BR-07; **create mode** form and **view/edit mode**; follow-up note field required when Follow-Up Required = Yes; validation feedback inline; data preserved on recoverable errors (FR-22).
- **Requester Ticket Detail**: the same Actions Taken list rendered **read-only** (no create/edit controls) on owned Tickets.
- **Ticket status controls**: only transitions permitted for the current role and status (§5.2) are offered; advisory indication control for Requesters clearly labelled as non-status-changing; conflict (409) and resolution-gate feedback rendered inline; Ticket summary status badge refreshes after success (FR-13/FR-14).
- **Responsive**: desktop table → stacked/list representation on tablet/mobile per Lab 2/3 conventions; no clipped content, overlapping controls, or horizontal page scrolling.
- **Accessibility**: visible focus, full keyboard operation, semantic labels, non-color cues for status/follow-up/private content.

## 7. Data Changes

### 7.1 New model: ActionTaken

Field | Type | Notes
---|---|---
`id` | `Int` PK autoincrement | |
`ticketId` | `Int` FK → Ticket, required, indexed | BR-01; relation `Ticket.actions`
`actionDateTime` | `DateTime`, required | defaults to `now()` at creation; editable within §11 D-6 bounds
`actionDescription` | `String`, required | trimmed 1–2,000 chars (BR-06)
`result` | `String?` | optional ≤ 2,000 chars
`performedById` | `Int` FK → User, required, indexed | auto from session (BR-03); inactive users rejected
`followUpRequired` | `Boolean`, default `false` | |
`followUpNote` | `String?` | required iff `followUpRequired` (BR-05)
`attachmentNotes` | `String?` | "what file to look for / images" free text ≤ 2,000
`createdAt` | `DateTime` | server timestamp
`updatedAt` | `DateTime` `@updatedAt` | optimistic-concurrency / stale-update field (BR-12)

Indexes: `ticketId` (list per Ticket), `performedById` (per-actor queries), composite `(ticketId, actionDateTime)` for the ordered list. `Ticket` gains the `actions ActionTaken[]` relation; no other Ticket columns change. The `Status` and `Priority` enums are unchanged (all eight/four values already exist from Lab 3).

### 7.2 Migration and backfill
- **Additive-only migration**: create `ActionTaken` + indexes + relations; no existing table is dropped or rewritten, so all Lab 1–3 data survives (BR-18).
- **No derived-data backfill** is required (no column on Ticket depends on Actions). Legacy Tickets simply have zero Actions and behave per BR-18: detail shows an empty Actions list with an empty-state hint; dashboards count them normally; the BR-11 gate applies only to future `RESOLVED` transitions (grandfathering existing `RESOLVED`/`CLOSED` rows).
- **Rollback/recovery**: the migration ships a documented `down` step (drop `ActionTaken`); rolling back loses only Action rows created after migrating — no Ticket/User/Attachment data. Recovery after an accidental rollback is by re-seed/restore, documented in `api-spec.md`/README and exercised in the migration test plan.

### 7.3 Seed (idempotent, BR-19)
- Re-running the seed never duplicates rows (upsert by stable natural keys, e.g. ticket numbers and action keys).
- Tickets cover **all 8 statuses** and **all 4 priorities**, with both assigned and unassigned ownership and a mix of Requesters.
- Actions Taken coverage: Tickets with **zero**, **one**, and **multiple** Actions; at least one Ticket with two different performers (BR-02); follow-up Yes-with-note and No variants; Attachment Notes examples.
- Enough volume that SD-01…SD-06 and RD-01…RD-04 show non-zero values, plus a dedicated fresh Requester whose metrics are all zero to demonstrate empty states.

### 7.4 Justified database-design decisions (≥ 2; summary — full rationale in §11)
1. **Stale-update handling via existing `updatedAt` (no extra `version` column)** — consistent with every model in the schema; sufficient to detect lost updates for Actions and status changes (BR-12).
2. **Keep `Status`/`Priority` as PostgreSQL enums via Prisma** — the value sets are fixed by the course spec, already migrated in Lab 3, and require no runtime-defined values; a reference table would add joins without benefit.
3. **`performedById` FK without name snapshot** — users are deactivated, never deleted (Lab 3 BR-20), so historical performer names always resolve; avoids denormalized audit columns.
4. **Composite index `(ticketId, actionDateTime)`** — matches the canonical ordered-list query (BR-07) and keeps the Ticket Detail payload fast without loading whole collections.

## 8. API Contract

Full formal contract in `api-spec.md` (Issue 27). Summary of increments (all authenticated via the existing session cookie; all write operations backend-authorized per §5.1):

- `POST /api/staff/tickets/:id/actions` — create Action Taken (Staff/Admin) → `201` with saved row; `400` validation (BR-05/BR-06/D-6); `403` role; `404` safe missing; `409` duplicate (BR-13) or stale Ticket (BR-12).
- `PATCH /api/staff/tickets/:id/actions/:actionId` — update Action Taken (Staff/Admin) → `200`; same error semantics; requires last-known `updatedAt` of the Action (BR-12).
- `GET /api/tickets/:id/actions` — list Actions ordered per BR-07; Requester limited to owned Tickets (`403`/non-disclosing otherwise); Staff/Admin on accessible Tickets.
- `PATCH /api/staff/tickets/:id/status` — existing endpoint, now enforcing §5.2 matrix + BR-11 gate + BR-12 stale `409`; success returns the updated Ticket summary.
- `POST /api/tickets/:id/resolved-indication` — existing advisory endpoint, unchanged semantics (BR-10).
- `GET /api/staff/dashboard` — SD-01…SD-06 payload with drill-down query parameters and capped lists (§5.3); `403` for Requesters.
- `GET /api/requester/dashboard` — RD-01…RD-04 payload, session-scoped (BR-16); `403` for Staff/Admin (they use the staff dashboard).
- All Labs 2 and 3 APIs continue unchanged and covered by regression (FR-20).

Error taxonomy (unchanged from Lab 3): `400` field validation with per-field messages, `401` unauthenticated, `403` forbidden without data, `404` non-disclosing missing/foreign resource, `409` conflict (illegal transition, stale update, duplicate, gate), `500` safe generic. Dashboard responses document zero-record behavior, timezone/UTC boundaries, and drill-down parameters (§6.2 of the sheet).

## 9. Acceptance Criteria

Every AC maps to at least one planned test (IDs finalized in `tests.md`, Issue 28).

ID | Criterion | Planned test(s)
---|---|---
AC-01 | Given a permitted IT Staff user and valid data, when an Actions Taken is created, then it is saved under the correct Ticket with the authenticated creator recorded as Performed By. | API-TA-01 (`actions-taken.api.test.ts`), UI-TA-02, E2E-01
AC-02 | Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned. | API-RD-01 (`requester-dashboard.api.test.ts`), UI-RD-01
AC-03 | Given a client that tampers with the performer field, when an Action is created, then Performed By is still the session user. | API-TA-02
AC-04 | Given Follow-Up Required = Yes without a Follow-up Note (or with an empty/over-length note), when the Action is submitted, then `400` field validation is returned and nothing is saved; with a valid note it saves. | API-TA-03, UI-TA-03
AC-05 | Given an authenticated Requester, when they attempt to create or update an Action Taken (direct API), then `403` is returned and no data changes. | API-TA-04 (authorization), API-AUTH-01
AC-06 | Given a Requester, when they view a Ticket they do not own (actions endpoint), then the response is non-disclosing; owned Tickets show all Actions read-only. | API-TA-05, UI-TA-04
AC-07 | Given an assigned Ticket Owner, when a different active IT Staff member records an Action, then it is saved with that performer and the Owner is unchanged (BR-02). | API-TA-06, E2E-01
AC-08 | Given an inactive user reference, when staff attempts to record an Action attributed to them, then the request is rejected with a safe validation error. | API-TA-07
AC-09 | Given an existing Action, when Staff/Admin updates permitted fields with valid data, then `200` returns the updated row; invalid updates return `400`. | API-TA-08, UI-TA-05
AC-10 | Given a double-click or network retry of an Action create, then exactly one Action exists (UI busy state + server duplicate guard `409`). | API-TA-09, UI-TA-06, E2E-01
AC-11 | Given the §5.2 matrix, when a permitted transition is submitted, then status changes and the response reflects it; an unlisted transition returns safe `409` and status is unchanged. | API-WF-01 (`ticket-workflow.api.test.ts`), E2E-02
AC-12 | Given a direct API attempt by a Requester to change status, then `403` is returned; permitted roles succeed only per matrix. | API-WF-02, API-AUTH-02
AC-13 | Given a Requester's "problem appears resolved" indication, then `requesterIndicatedResolvedAt` is stored, status is unchanged, and IT Staff can see the indication. | API-WF-03 (regression: `comments-notes.api.test.ts`)
AC-14 | Given two concurrent edits (stale `updatedAt` on Ticket or Action), then the second write receives `409 Conflict` and the first write's data is preserved. | API-WF-04, API-TA-10
AC-15 | Given a Ticket with zero Actions, when Staff attempts Resolved, then the gate rejects with safe `409`; after ≥ 1 Action it succeeds. Grandfathered legacy Resolved/Closed Tickets remain unchanged. | API-WF-05, MIG-02
AC-16 | Given IT Staff on Ticket Detail, then only permitted transitions for the role/status are shown; after a successful change the summary status badge refreshes. | UI-WF-01 (`TicketWorkflow.test.tsx`), E2E-02
AC-17 | Given a gate rejection or `409` conflict in the UI, then clear feedback is shown and entered data is not lost. | UI-WF-02, UI-TA-03
AC-18 | Given seed data, when the staff dashboard is retrieved, then SD-01…SD-06 values match direct database counts and drill-down parameters are present. | API-SD-01 (`staff-dashboard.api.test.ts`), API-SD-02
AC-19 | Given a Requester, when the staff dashboard is requested, then `403`; given an Administrator, the staff dashboard is returned plus concise user counts (AD-01). | API-SD-03, UI-SD-04
AC-20 | Given the staff dashboard UI, then cards/lists render with loading, empty, forbidden, and safe-failure states and every item drills down to Queue/Detail. | UI-SD-01, UI-SD-02, E2E-03
AC-21 | Given the Requester dashboard UI, then RD-01…RD-04 render session-scoped, drill down into My Tickets, show zero-state when appropriate, and do not duplicate the full My Tickets list. | UI-RD-01, UI-RD-02, E2E-03
AC-22 | Given a Labs 1–3 database, when the Lab 4 migration runs, then all existing rows remain valid; legacy Tickets show zero Actions and behave per BR-18. | MIG-01 (`migration-regression.api.test.ts` regression), MIG-02
AC-23 | Given the seed run twice, then no duplicate rows appear and Tickets/Actions cover every status, priority, ownership, and 0/1/many-action combination (BR-19). | MIG-03, MIG-04
AC-24 | Given the final application, when Labs 1–3 automated suites (auth, authorization, comments/notes, queue/detail, user admin, Lab 1–2 regressions) run on `main`, then all pass. | REG-01…REG-08 (existing suites), E2E regression specs
AC-25 | Given all major screens on desktop/tablet/mobile, then feedback states are consistent, there are no console errors, broken links, placeholders, or unfinished controls, and the responsive/accessibility checklist passes. | UI-STYLE-01, RESP-01…RESP-03, A11Y-01, E2E-01…E2E-03
AC-26 | Given repeated mutating clicks or network retries across Ticket status and dashboard actions, then duplicates are prevented or safely handled everywhere (FR-08). | API-TA-09, UI-SD-03, E2E-01

## 10. Definition of Done

Product-completion checklist for the coding agent (sheet §13):

- [ ] All Section 3 Included scope is implemented; all explicitly excluded work is absent.
- [ ] AC-01…AC-26 are satisfied with passing automated tests run from documented commands on final `main`; no required test is skipped, disabled, or commented out.
- [ ] `docs/lab-04/tests.md` covers **unit, API/integration, UI component, UI style, responsive, authorization, workflow, migration/regression, performance-smoke, and E2E** types, and every AC maps to ≥ 1 passing test with real file paths.
- [ ] Actions Taken API and dashboards are authorized on the backend (direct-API authorization tests prove it; hidden UI is not a control).
- [ ] The transition matrix, resolution gate, advisory indication, and `409` stale-update handling are enforced server-side and verified by `ticket-workflow.api.test.ts`.
- [ ] Migration preserves all Lab 1–3 data; legacy zero-action Tickets behave per BR-18; rollback/recovery documented; seed idempotent and complete (BR-19).
- [ ] Dashboards show backend-computed metrics matching database queries (evidence captured) with drill-down, loading, empty, forbidden, and safe-failure states.
- [ ] Requester Dashboard is strictly session-scoped and does not duplicate My Tickets.
- [ ] Zen Green consistency, responsive desktop/tablet/mobile behavior, and the accessibility checklist (focus, keyboard, semantic labels, non-color cues, no clipping/overlap/horizontal scroll) pass; obsolete Lab 1–3 UI remnants removed.
- [ ] Screenshots for staff-dashboard, requester-dashboard, and actions-taken (desktop/tablet/mobile) exist under `artifacts/lab-04/screenshots/`.
- [ ] No console errors, broken links, placeholder text, or unfinished controls; forms protect entered data after recoverable failures.
- [ ] README (setup, migration, seed, test, demo) is current; `docs/lab-04/{ui-spec.md, api-spec.md, reviewer.md, ai-use.md}` are complete and consistent with this specification.
- [ ] E2E specs `e2e/lab-04/{actions-taken-flow, ticket-resolution, dashboards}.spec.ts` pass.
- [ ] Feature branches merged into `lab4-staging` and then `main`; all Lab 4 GitHub Issues in Done on the Kanban.

## 11. Assumptions and Decisions

Meaningful choices not fixed by the handout (numbered decisions also referenced from §5/§7):

- **D-1 — Optimistic concurrency without a version column**: stale updates are detected by comparing the client's last-read `updatedAt` (Ticket or Action) with the stored value; a mismatch yields `409` (BR-12). Chosen over a `version` integer because every model already carries `@updatedAt`, the write paths are single-row, and it keeps the schema minimal. Trade-off: clock granularity is microseconds in PostgreSQL, which is sufficient for this application's concurrency level.
- **D-2 — Enums over reference tables for Status/Priority**: the value sets are fixed by the course specification and were already migrated in Lab 3; a lookup table would add joins and seed coupling with no runtime-configurable benefit. New Lab 4 behavior is implemented as rules over the existing enums, not new values.
- **D-3 — Resolution gate requires ≥ 1 Action Taken**: the stakeholder requires that "IT Staff must review the work and formally update the Ticket"; requiring at least one recorded Action before `RESOLVED` makes that review auditable and gives dashboards meaning. Existing `RESOLVED`/`CLOSED` Tickets are grandfathered (BR-11/BR-18). Rejected alternative: gate on owner assignment only — too weak, since unassigned work could be marked resolved.
- **D-4 — No hard delete for Actions Taken**: audit trails must not vanish; corrections are made by editing fields (Staff/Admin), consistent with the sheet listing only create and update. Rejected: soft-delete flag — adds UI/state complexity without a stakeholder request.
- **D-5 — "Recent" = 7-day window in UTC**: one rule (BR-15) for all recent metrics keeps API, UI, and tests deterministic; timestamps are stored UTC and rendered in browser-local time as in Labs 1–3. Trade-off: calendar-day boundaries are rolling, not midnight-aligned; acceptable for operational "recently" summaries.
- **D-6 — Action Date/Time editable with bounds**: work is often done before it is logged, so Staff may set the action time on create/edit within `[Ticket.createdAt − 30 days, now + 24 hours]`; out-of-range values fail `400`. The default remains server `now()` so a lazily filled form still records truthfully.
- **D-7 — Duplicate guard**: server rejects an identical (actor, ticket, trimmed description) create within 5 minutes with `409` (BR-13), complementing the UI in-flight lock. Rejected: `Idempotency-Key` infrastructure — heavier than needed for a course service desk and hard to demonstrate in E2E.
- **D-8 — Dashboard payload shape**: each role dashboard is a single `GET` returning metrics + capped (5-item) lists + drill-down query parameters — fewer round trips, small payloads, and directly renderable; full Ticket browsing stays in the Queue/My Tickets screens (sheet §6.2: dashboards summarize, detail screens replace nothing).
- **D-9 — Performer history without snapshots**: `performedById` resolves against `User`; Lab 3 BR-20 forbids deletion (deactivation only), so historical names always render. Rejected: `performedByName` column — denormalization with no deletion risk to protect against.
- **D-10 — Lab 4 transition matrix**: kept identical to the approved Lab 3 matrix (statuses and role rules already enforced there); Lab 4 adds the BR-11 resolution gate and formalizes the matrix as the single source of truth in this specification (§5.2).
- **D-11 — Requester dashboard roles**: Administrators do not get a separate requester-style dashboard; they reuse the IT Staff dashboard plus AD-01 (sheet §4.6 allows reuse). A Staff/Admin calling the requester endpoint receives `403` to keep scope rules unambiguous.
- **D-12 — Document path convention**: the handout mixes separators; this repository uses `lab-04` consistently (`docs/lab-04/`, `server/tests/lab-04/`, `client/tests/lab-04/`, `e2e/lab-04/`, `artifacts/lab-04/`), continuing the Lab 3 convention.
- **Spec-before-code**: this contract is committed on `feature/26-sprint4-contract-spec` before the main implementation PRs (Issues 29–37) are completed, providing the ordering evidence required by grading Part 2.
