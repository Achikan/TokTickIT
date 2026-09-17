# Lab 3 UI Specification (Zen Green)

Lab 3 reuses the Lab 2 "Zen Green" design language: the same color tokens, typography, control states, button hierarchy, validation placement, badge rules, responsive behavior, and accessibility expectations. New screens must look like part of the same application. This document extends `docs/lab-02/ui-spec.md`; anything not overridden here remains in force.

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

- The **Development Requester Selection** screen and **Change Requester** action are removed.
- Create Ticket, My Tickets, and Requester Ticket Detail keep the Lab 2 layout, states, and validation; identity no longer comes from a selector.
- **Requester Ticket Detail additions**:
  - **Public Comments**: list (newest first) with author name and timestamp, plus a comment textarea with validation and busy submit. Visible to Requester, IT Staff, Administrator.
  - **"Problem Appears Resolved"** action: a primary-adjacent button "Mark as appears resolved" that records the indication (idempotent) with success feedback; visibly distinct from the read-only status badge.
  - Internal Notes are never shown to Requesters.

## 5. IT Staff Ticket Queue

- Header: title, search box, filter controls (Status, Requested Priority, IT Priority, Owner incl. "Unassigned", Category), sort control, and pagination.
- Desktop table columns (justified set, avoid a mega-grid): Ticket Number, Summary, Category, Requested Priority, IT Priority, Current Status, Ticket Owner, Created, Last Updated, Open action.
- Tablet/mobile: responsive representation (card or horizontal-scroll-free table) with the same information and an Open action.
- Badges for status and both priorities; owner shown or "Unassigned".
- States: loading, empty ("No tickets yet"), no-results (search/filters matched nothing) distinct, forbidden (non-staff), and safe failure.

## 6. IT Staff Ticket Detail

- Reuses the Lab 2 Ticket screen grouping: fields clearly grouped, only permitted operational fields editable.
- **Editable vs read-only**: summary/description/category read-only for staff; editable per-role fields are Ticket Owner (claim/assign/reassign), IT Priority, and Status (via permitted transitions only).
- **Status change**: a permission-aware control (e.g. select or action buttons) restricted to the transition matrix; a forbidden transition surfaces a safe conflict message, not just a hidden option.
- **Public Comments** and **Internal Notes** are visually distinct (different surface tint, section labels, and an explicit "Internal" marker) so private notes cannot be accidentally posted publicly (AC-17). Both show author + timestamp, append-only styling.
- Attachments section continues to work (upload/list/download/soft-remove) with the Lab 2 attachment states.
- Requester "Problem Appears Resolved" indication is surfaced to staff (e.g. a pale callout) to inform resolution.

## 7. Administrator User Management

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
Desktop ≥ 992px | Multi-column as specified; content centered with sensible max width.
Tablet 768–991px | Two-column where practical; comments/notes stack cleanly.
Mobile < 768px | Fields and tables stack; touch-friendly buttons; no horizontal page scroll.
All sizes | No clipped labels, overlapping messages, hidden buttons, or unreadable content.

## 10. Accessibility (unchanged from Lab 2)

- Accessible labels for all icon-only controls (+ tooltip).
- Visible keyboard focus indicators.
- Non-color indicators for success/warning/error (icon or text, not color alone).
- Keyboard-accessible forms; labels associated with inputs; semantic headings/structure.
- Status/role communicated by text, not color alone.

## 11. Visual Inspection Checklist and Screenshots

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