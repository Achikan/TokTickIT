# Lab 3 UI Specification (Zen Green)

Lab 3 reuses the Lab 2 "Zen Green" design language: the same color tokens, typography, control states, button hierarchy, validation placement, badge rules, responsive behavior, and accessibility expectations. New screens must look like part of the same application. This document extends `docs/lab-02/ui-spec.md`; anything not overridden here remains in force.

**Reusable components from Lab 2** (built in Lab 2 and reused without redesign): the application shell/header with role-independent chrome, form field + near-field validation pattern, primary/secondary button set with busy/disabled states, badge components (roles, statuses, priorities), table + card representations, pagination/search/filter/sort controls, attachment upload/list/download/soft-remove component, and category/related-system pickers. New Lab 3 screens compose these components; none are re-implemented from scratch.

## 1. Color Tokens (unchanged from Lab 2)

Token | Value | Intended Use
---|---|---
`--tok-primary` | `#006B3C` | App header, primary actions, strong emphasis.
`--tok-secondary` | `#0B7A46` | Active tabs, focus accents, links, hover states.
`--tok-pale` | `#EAF6EF` | Selected rows, success emphasis, subtle section emphasis.
`--tok-bg` | `#F5F7F6` | Page background.
`--tok-surface` | `#FFFFFF` | Cards/surfaces.
`--tok-text` | Dark charcoal-green (`#1C2B22`) | Body text.
`--tok-field` | `#FFFFFF` + neutral border | Editable fields.
`--tok-readonly` | Soft gray-green/ivory (`#EEF2F0`) | Read-only fields.
`--tok-error` | Dark red text + border | Error messages/borders.
`--tok-warning` | Amber callout/badge only | Warnings.
`--tok-success` | Green confirmation with readable text | Success; never color-alone.

## 2. Role Badges and Status/Priority Badges

- **Role badge**: small pill next to the signed-in name in the shell. Color must be distinct per role (Requester / IT Staff / Administrator) and always include the role text (never color alone).
- **Ticket status badges** for all eight statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER` (warning tint), `RESOLVED` (success tint), `CLOSED` (neutral), `REOPENED`, `CANCELLED` (muted).
- **Priority badges**: Requested Priority and IT Priority share the Lab 2 badge style; IT Priority must be visually distinguishable from Requested Priority (e.g. label prefix "IT:" vs "Req:").
- Badges appear in the Queue, Staff Ticket Detail, and Requester Ticket Detail consistently.

## 3. Authentication Screens

### 3.1 Login
- Single card centered on the Zen Green background: TokTickIT identity, Email field, Password field, Sign In button.
- Validation near-field (missing/invalid email, missing password) with red asterisk on required fields.
- **Busy state**: Sign In shows "Signing in…", disabled, no double submit.
- **Inactive account**: clear safe message (e.g. "This account is not active. Contact an administrator.") without exposing account details.
- **Failure**: safe generic message, entered email preserved, password cleared.
- After successful login the app routes by role (Requester → My Tickets, IT Staff → Staff Queue, Administrator → User Management).

### 3.2 Mandatory Change Password
- Shown only when `requiresPasswordChange` is true (AC-02); no normal app screen is reachable otherwise.
- New Password + Confirm New Password with the policy summary (min 8 chars, at least one lowercase letter, one uppercase letter, one digit and one special character).
- Near-field validation: strength failures, mismatch, and "same as current" message.
- On success: "Password updated" then the role home screen opens.

### 3.3 Application Shell and Logout
- Shell shows the authenticated user's name + role badge, and role-specific navigation: Requester (My Tickets, Create Ticket), IT Staff (Ticket Queue), Administrator (User Management). Unauthorized destinations are never presented (AC-11).
- Logout action in the header; after logout, direct navigation is blocked by the server and the login screen shows.
- Responsive mobile menu remains usable.

## 4. Requester Screens (Regression)

- **Modes**: Create Ticket (create), My Tickets (list), Requester Ticket Detail (view + actions).
- The **Development Requester Selection** screen and **Change Requester** action are removed.
- Create Ticket, My Tickets, and Requester Ticket Detail keep the Lab 2 layout, states, and validation; identity no longer comes from a selector.
- **Requester Ticket Detail additions**:
  - **Public Comments**: list (newest first) with author name and timestamp, plus a comment textarea with validation and busy submit. Visible to Requester, IT Staff, Administrator.
  - **"Problem Appears Resolved"** action: a primary-adjacent button "Mark as appears resolved" that records the indication (idempotent) with success feedback; visibly distinct from the read-only status badge.
  - Internal Notes are never shown to Requesters.

## 5. IT Staff Ticket Queue

- **Mode**: read-only list view (search/filter/sort/pagination; no inline edit).
- Header: title, search box, filter controls (Status, Requested Priority, IT Priority, Owner incl. "Unassigned", Category), sort control, and pagination.
- **Owner is a select, not a free-text id box.** Options are `All`, `Unassigned`, then every active IT Staff and Administrator by name from `GET /api/staff/assignees` (api-spec §6.1a). `All` omits `ownerId`; `Unassigned` sends `ownerId=unassigned`; a person sends their numeric id. It applies immediately, like the other selects.
- **Search and filters stay mounted while results refresh.** The loading/failure/empty feedback is rendered next to the results, not instead of the controls, so changing two filters in a row always works.
- Desktop table columns (justified set, avoid a mega-grid): Ticket Number, Summary, Category, Requested Priority, IT Priority, Current Status, Ticket Owner, Created, Last Updated, Open action.
  - **Why these columns**: each maps to a primary work-staff decision or filter in the queue — identity (`Ticket Number`, `Summary`), routing (`Category`, `Ticket Owner`), triage priority (`Requested Priority` / `IT Priority`), state (`Current Status`), and recency (`Created`, `Last Updated`). The Open action satisfies the primary staff task. Fields intentionally not columns (requester name, full description, attachments count, comment/note counters) are either visible in the row tooltip or reachable in one click from the Detail screen; they would only add noise to a scanning list.
  - **Why not a mega-grid**: Lab 2's requester table is a narrow, requester-owned list. A staff queue with every field as a column would exceed comfortable horizontal scan width, force visual truncation, and hurt readability — especially with 10 columns on a hinged tablet. The justified 10-column set above plus the exact same responsive card/table representation keeps every screen readable and usable per Section 9 without a horizontal scroll or a "frozen-panel tech-demo" layout.
- **Breakpoint between the two representations**: the 10-column table is shown from **992px** up (`d-none d-lg-block`); below 992px the card list carries exactly the same information (`d-lg-none`). 992px is where the shell still has room for the full justified column set — at 820px it does not, and squeezing it in is what previously pushed the last column off screen.
- **The table never scrolls sideways.** It uses `table-layout: fixed` with explicit column widths (`colgroup`, `.queue-table-fixed`), so its width is exactly its container's. There is no `overflow-x: auto` wrapper: a scrolling wrapper hides the defect instead of preventing it, and it is what allowed "Last Updated" to be cut off while the page itself reported no horizontal overflow.
- **Timestamps are compact and machine-readable**: `2026-09-29 11:52` inside `<time dateTime="…">`, wrapping at the date/time space into two lines when the column is narrow. `toLocaleString()` output such as `9/29/2026, 11:52:03 AM` is 21 characters and is not used in the table.
- **Wrapping rules inside the table**: Summary, Category, Owner and the status badge may wrap; Ticket Number and the priority badges must not be truncated. Long statuses such as `WAITING_FOR_REQUESTER` wrap rather than overflow, and every status/priority badge keeps a `title` with its full value.
- Tablet/mobile: responsive representation (card or horizontal-scroll-free table) with the same information and an Open action.
- Badges for status and both priorities; owner shown or "Unassigned".
- States: loading, empty ("No tickets yet"), no-results (search/filters matched nothing) distinct, forbidden (non-staff), and safe failure.

## 6. IT Staff Ticket Detail

- **Modes**: view; edit actions (claim/assign/reassign, IT Priority, Status transition) are only present when permitted by the transition matrix and the viewer's role (AC-13..AC-17).

- Reuses the Lab 2 Ticket screen grouping: fields clearly grouped, only permitted operational fields editable.
- **Editable vs read-only**: summary/description/category read-only for staff; editable per-role fields are Ticket Owner (claim/assign/reassign), IT Priority, and Status (via permitted transitions only).
- **Status change**: a permission-aware control (e.g. select or action buttons) restricted to the transition matrix; a forbidden transition surfaces a safe conflict message, not just a hidden option.
- **Public Comments** and **Internal Notes** are visually distinct (different surface tint, section labels, and an explicit "Internal" marker) so private notes cannot be accidentally posted publicly (AC-17). Both show author + timestamp, append-only styling.
- Attachments section continues to work (upload/list/download/soft-remove) with the Lab 2 attachment states.
- Requester "Problem Appears Resolved" indication is surfaced to staff (e.g. a pale callout) to inform resolution.

## 7. Administrator User Management

- **Modes**: user list (view/search/role filter) and create/edit panels (create + edit with validation and set-initial-password action).
- One screen: user list and create/edit panel.
- **List**: Name, Email, Role badge, Status (Active/Inactive), Edit action.
- **Search** by name or email; **optional role filter** dropdown (no pagination, one filter only — excluded scope).
- **Create**: name, email, role (single select of the three permitted roles), activation toggle, initial password field + policy hint.
- **Edit**: name, email, role, activation state; plus a "Set new initial password" action that marks the account to change at next login.
- Feedback: near-field validation (duplicate email, invalid role, weak initial password), success messages, and safe API-failure messages.
- Safety feedback: attempting to deactivate self or the last active Administrator shows a clear conflict message (AC-21).

## 8. Screen States and Feedback (every screen)

- Initial/idle, Loading, Empty (no data at all), No-results (search/filters found nothing), Forbidden (authenticated but not permitted), Not-found, Conflict, Success, and safe API Failure — provided where meaningful, with visible busy/disabled states during processing.

## 9. Responsive Rules (unchanged from Lab 2)

Viewport | Behavior
---|---
Desktop ≥ 992px | Multi-column as specified; content centered with sensible max width. The queue table is shown here with a fixed layout that fits its container.
Tablet 768–991px | Two-column where practical; comments/notes stack cleanly. The staff queue uses its card representation here (see §5).
Mobile < 768px | Fields and tables stack; touch-friendly buttons; no horizontal page scroll.
All sizes | No clipped labels, overlapping messages, hidden buttons, or unreadable content. Verified at 1280, 1024, 820 and 390 by `e2e/lab-03/responsive.spec.ts` (RESP-01).

## 10. Accessibility (unchanged from Lab 2)

- Accessible labels for all icon-only controls (+ tooltip).
- Visible keyboard focus indicators.
- Non-color indicators for success/warning/error (icon or text, not color alone).
- Keyboard-accessible forms; labels associated with inputs; semantic headings/structure.
- Status/role communicated by text, not color alone.

## 11. Visual Inspection Checklist and Screenshots

> **Status: COMPLETED** — see `docs/lab-03/visual-inspection.md` (Part 9 evidence) with all 75
> screenshots committed under `artifacts/lab-03/screenshots/` (+ 6 API/non-UI evidence captures
> under `artifacts/lab-03/api-evidence/`).

- Colors/tokens match this document; badges consistent for status, Requested Priority, IT Priority, role.
- Editable vs read-only distinct; validation near field; busy/disabled correct.
- Role navigation shows only permitted destinations; Logout present.
- Public Comments vs Internal Notes visually distinct.
- No clipping, overlap, unintended horizontal scrolling; queue table readable and usable at desktop/tablet/mobile; admin list usable without mandatory pagination.
- Loading/empty/no-results/forbidden/failure feedback on all major screens.
- **Screenshots** (Playwright, desktop/tablet/mobile) into `artifacts/lab-03/screenshots/`:
  - `authentication/` — login (valid/invalid/inactive/busy), mandatory change-password, shell with logout.
  - `staff-queue/` — queue with data, search/filters/sorts, empty/no-results.
  - `staff-ticket-detail/` — claim/reassign, IT Priority, status, Public Comments, Internal Notes, attachments.
  - `user-management/` — user list, search/filter, create, edit, set-initial-password.