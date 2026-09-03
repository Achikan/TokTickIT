# Lab 2 Test Plan and Results

## 1. Test Strategy

Testing follows Test-Driven Development (TDD) and is planned up front from `specification.md` (Test DD). A test is written/chosen for every Acceptance Criterion and Business Rule before its implementation is accepted. Coverage spans six levels: **unit**, **API/integration**, **UI component**, **UI style**, **responsive**, and **E2E**. Tests live under `server/tests/lab-02/`, `client/tests/lab-02/`, and `e2e/lab-02/`. The plan is created before implementation and updated with final pass status (not reconstructed afterward).

## 2. Planned Tests

Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Status
---|---|---|---|---|---|---
API-01 | API | AC-01, FR-05 | Create a valid Ticket for selected requester | 201; one saved Ticket; official Ticket Number returned | server/tests/lab-02/create-ticket.api.test.ts | Pass
API-02 | API | AC-04, BR-05 | Create Ticket with empty Summary/Description | 400 with field validation errors; no Ticket saved | server/tests/lab-02/create-ticket.api.test.ts | Pass
API-03 | API | AC-01, BR-03 | Official Ticket Number is unique and distinct from numeric id | Number matches documented format; uniqueness enforced | server/tests/lab-02/create-ticket.api.test.ts | Pass
API-04 | API | AC-05, FR-11 | List Tickets returns only selected requester's own Tickets | Requester A sees none of Requester B's Tickets | server/tests/lab-02/my-tickets.api.test.ts | Pass
API-05 | API | AC-07, FR-12 | Pagination returns expected page + metadata | Correct page; page size; total; next/prev indicators | server/tests/lab-02/my-tickets.api.test.ts | Pass
API-06 | API | AC-07, FR-12 | Search and filters narrow the list | Only matching Tickets returned | server/tests/lab-02/my-tickets.api.test.ts | Pass
API-07 | API | AC-07, FR-12 | Sorting ordered as requested | Sort order matches parameter | server/tests/lab-02/my-tickets.api.test.ts | Pass
API-08 | API | BR-10 | Invalid page/size/filter parameters | Safe 400 error, not silently ignored | server/tests/lab-02/my-tickets.api.test.ts | Pass
API-09 | API | AC-03, FR-14 | Retrieve one Ticket owned by another requester | Non-disclosing rejection (404/403) | server/tests/lab-02/ticket-detail.api.test.ts | Pass
API-10 | API | FR-13 | Retrieve one owned Ticket | 200; full Ticket data returned | server/tests/lab-02/ticket-detail.api.test.ts | Pass
API-11 | API | FR-15, AC-11 | Upload valid and invalid (unsupported/oversized) Attachments | Valid -> 201; invalid -> 400, no row created | server/tests/lab-02/attachments.api.test.ts | Pass
API-12 | API | FR-17, AC-08 | Download an active Attachment | 200 and file content returned | server/tests/lab-02/attachments.api.test.ts | Pass
API-13 | API | FR-18, AC-09 | Soft-remove an Attachment with reason | Removal accepted; metadata retained; download blocked | server/tests/lab-02/attachments.api.test.ts | Pass
API-14 | API | FR-14, AC-10 | Upload/download/remove Attachment of a non-owned Ticket | Non-disclosing rejection | server/tests/lab-02/attachments.api.test.ts | Pass
API-15 | API | FR-02, BR-02 | Retrieve active Development Requesters | Only active returned; inactive excluded | server/tests/lab-02/dev-requester.api.test.ts | Pass
UNIT-01 | Unit | BR-03 | Ticket Number generator produces required format | Format matches documented format; unique | server/tests/lab-02/ticket-number.test.ts | Pass
UNIT-02 | Unit | BR-06 | Requested Priority default applied when absent | Default (MEDIUM) used | server/tests/lab-02/create-ticket.api.test.ts | Pass
UI-01 | UI | AC-04 | Create Ticket submit with empty Summary | Field message shown; API not called | client/tests/lab-02/CreateTicket.test.tsx | Pass
UI-02 | UI | AC-01, FR-09 | Create Ticket success | Confirmation shows official Ticket Number | client/tests/lab-02/CreateTicket.test.tsx | Pass
UI-03 | UI | AC-12, FR-10 | Create Ticket API failure | Safe error shown; form values preserved | client/tests/lab-02/CreateTicket.test.tsx | Pass
UI-04 | UI | FR-06 | System-generated read-only fields visually distinct | Read-only styling applied | client/tests/lab-02/CreateTicket.test.tsx | Pass
UI-05 | UI | AC-02, FR-01 | Selected requester shown in shell; Change Requester present | Shell shows name; action available | client/tests/lab-02/RequesterSelection.test.tsx | Pass
UI-06 | UI | FR-02, BR-02 | Development Requester dropdown lists active only, plus loading/empty/failure states | Correct states rendered | client/tests/lab-02/RequesterSelection.test.tsx | Pass
UI-07 | UI | AC-06, FR-04 | Switching requester reloads data | New requester's data shown | client/tests/lab-02/MyTickets.test.tsx | Pass
UI-08 | UI | AC-07, FR-12 | My Tickets list, empty, no-results, and failure states | Correct state rendered | client/tests/lab-02/MyTickets.test.tsx | Pass
UI-09 | UI | FR-13, FR-14 | Ticket Detail read-only presentation | Fields read-only; ownership respected in UI | client/tests/lab-02/RequesterTicketDetail.test.tsx | Pass
UI-10 | UI | FR-15..18 | Attachment actions present; invalid/removed/unavailable states | States rendered; controls correct | client/tests/lab-02/AttachmentSection.test.tsx | Pass
STYLE-01 | UI Style | AC-13, BR-*-styles | Required CSS classes, labels, asterisks, messages, button busy/disabled | Assertions pass per ui-spec | client/tests/lab-02/style.test.tsx | Pass
RESP-01 | Responsive | AC-13 | Screens at desktop/tablet/mobile viewports | No clipping/overlap/h-scroll; usable controls | e2e/lab-02/responsive.spec.ts | Pass
E2E-01 | E2E | AC-01, AC-05 | Requester creates a Ticket then finds it in My Tickets | Confirmation + present in list | e2e/lab-02/requester-ticket-flow.spec.ts | Pass
E2E-02 | E2E | AC-09 | Upload then soft-remove an Attachment; download blocked | Metadata visible; download blocked after removal | e2e/lab-02/requester-ticket-flow.spec.ts | Pass

## 3. Acceptance-Criterion Traceability

AC | Tests
---|---
AC-01 | API-01, API-03, UI-02, E2E-01
AC-02 | UI-05
AC-03 | API-09, API-14
AC-04 | API-02, UI-01
AC-05 | API-04, E2E-01
AC-06 | UI-07
AC-07 | API-05, API-06, API-07, UI-08, RESP-01
AC-08 | API-12
AC-09 | API-13, E2E-02
AC-10 | API-09, API-14
AC-11 | API-11, UI-10
AC-12 | UI-03
AC-13 | STYLE-01, RESP-01, E2E-01
AC-14 (empty vs no-results) | UI-08
AC-15 (attachment states) | UI-10, API-11..14

## 4. Responsive and Visual Checklist

- Colors/tokens match `ui-spec.md` (primary #006B3C, secondary #0B7A46, pale #EAF6EF).
- Editable vs read-only fields clearly distinct.
- Validation messages placed near their field, not only at top.
- Button hierarchy (primary/secondary/disabled/busy) consistent.
- No clipped labels, overlapping messages, hidden buttons, or unreadable attachment names.
- No unintended horizontal page scrolling at any viewport.
- Desktop table and mobile card/responsive-table behavior correct.
- Badges consistent for Requested Priority, IT Priority, Current Status.
- Filters, pagination, attachment controls, and empty states usable at all sizes.
- Playwright screenshots captured for Create Ticket, My Tickets, Ticket Detail at all 3 viewports.

## 5. Test Commands

- Server API/unit: `cd server && npm test`
- Client UI/style: `cd client && npm test`
- E2E + responsive: `npm run test:e2e` (root or as configured)
- Visual screenshots: `npm run screenshots` (artifact path `artifacts/lab-02/screenshots/`)

> Prerequisite for E2E + screenshots: the API server must be listening on `:3000`
> (Playwright auto-starts only the Vite client on `:5173`). Start it with
> `cd server && npm run dev`. On this machine Postgres.app rejects the root shell,
> so run the server as the normal user, e.g.
> `su - yayee -c "cd /Users/yayee/Desktop/TokTickIT/server && npm run dev"`.

## 6. Final Results

All planned tests were implemented and pass (Issue 13, validated on `lab2-staging`):

| Suite | Command | Files | Tests | Status |
|---|---|---|---|---|
| Server (unit + API) | `cd server && npm test` | 10 | 52 | Pass |
| Client (UI + style) | `cd client && npm test` | 8 | 51 | Pass |
| E2E + Responsive (Playwright) | `npm run test:e2e` | 5 specs | 11 | Pass |

- Ticket Number format `TK-<6-digit>` verified (UNIT-01) and end to end (E2E-01).
- Attachment lifecycle (upload → soft-remove → download blocked / 410) verified (API-13, E2E-02).
- Responsive checks run at desktop (1280), tablet (820), and mobile (390) with no
  unintended horizontal page scrolling or hidden/unusable controls (RESP-01).
- Visual screenshots generated for Create Ticket, My Tickets, and Ticket Detail at
  all three viewports into `artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/`.

No planned test is skipped, disabled, or commented out.

## 7. Known Limitations or Deferred Tests

- No authentication-level tests (Lab 3 concern); requester identity is passed directly.
- No IT Staff workflow tests (out of scope).
- Real browser download verification is covered by E2E; unit layer verifies blocking logic.
