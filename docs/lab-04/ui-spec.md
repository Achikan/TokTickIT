# Lab 4 UI Specification (Zen Green)

Lab 4 extends the Lab 2/3 "Zen Green" design language: the same color tokens, typography, control states, button hierarchy, validation placement, badge rules, responsive behavior, and accessibility expectations. This document extends `docs/lab-03/ui-spec.md`; anything not overridden here remains in force. Screens and modes below are normative for Issues 31, 33, 34, and 35; metric IDs (SD-01…, RD-01…, AD-01) refer to `specification.md` §5.3.

**Reusable components** (built in Labs 2–3, reused without redesign): application shell/header, form field + near-field validation pattern, primary/secondary buttons with busy/disabled states, badge components, table + card representations, search/filter/sort/pagination controls, attachment and comment/note components, status badge set for all eight statuses. New Lab 4 screens compose these components; none are re-implemented from scratch.

## 1. Application Shell and Navigation

- **Dashboard is added as the first navigation item for every role**: Requester (Dashboard, My Tickets, Create Ticket), IT Staff (Dashboard, Ticket Queue), Administrator (Dashboard, User Management). Active-page indication follows the existing shell convention.
- **Post-login landing destinations stay unchanged from Lab 3** (Requester → My Tickets, IT Staff → Ticket Queue, Administrator → User Management) so Lab 3 authentication/E2E behavior is not regressed; the Dashboard is reached via navigation or drill-down. (Decision recorded here; server behavior unaffected.)
- Logout, role badge, mobile menu, and unauthorized-destination hiding are unchanged.

## 2. Badges and New Cues

- Status, Requested Priority ("Req:"), IT Priority ("IT:"), and role badges: unchanged (lab-03 ui-spec §2).
- **Follow-Up badge** for Actions Taken: neutral pill "Follow-up" with an amber tint **plus a non-color cue** (❗ icon or the literal word "Follow-up"), shown on action rows and in view mode; its absence is shown as plain text "No" (never color alone).
- **Performed By** is rendered as plain text with the user's name and role suffix, e.g. `Dan Engineer (IT Staff)`; deactivated performers still render (specification §11 D-9).
- **Read-only vs editable** affordances keep the Lab 2/3 field tinting (`--tok-readonly` for read-only).

## 3. IT Staff Dashboard (also Administrator)

**Modes**: single read-only operational overview (no inline edits).

**Layout (desktop ≥ 992px)** — one page, sections in this order:
1. Header: "IT Staff Dashboard" (Administrators see the same header) with a short subtitle.
2. **Metric cards row**: SD-01 Unassigned Tickets, SD-02 Owned by Me, AD-01 Users (Administrators only; two compact values: total, active). Each card: label, large value, and a whole-card link with an accessible name ("View unassigned tickets", etc.).
3. **Breakdown row**: SD-03 By Status (compact list of all 8 statuses with counts, status badges as labels) and SD-04 By IT Priority (4 priority badges with counts).
4. **Lists row**: SD-05 Recently Updated (panel list, capped 5) and SD-06 Urgent / High Active (panel list, capped 5). Each row: ticket number, summary (truncating with `title`), status badge, IT priority badge, owner or "Unassigned", compact `<time>` timestamp, and a link to the Ticket Detail.

**Drill-down**: SD-01 → `/staff/tickets?ownerId=unassigned`, SD-02 → `/staff/tickets?ownerId=me`, SD-03 → `/staff/tickets?status=<value>`, SD-04 → `/staff/tickets?itPriority=<value>`, SD-05 → `/staff/tickets?sort=-updatedAt`, SD-06 → Ticket Detail per row (list header links to `/staff/tickets?priorityFlag=urgent-high` only if supported; otherwise the list itself is the drill-down). AD-01 → User Management. Queue filter support for these parameters is part of the API contract (`api-spec.md` §5.3).

**States**:
- **Loading**: skeleton cards/lists (no layout shift); no controls hidden.
- **Empty**: all-zero metrics still render the cards (value `0`) with the drill-down links live; the two list panels show short empty-state text ("No recently updated tickets", "No urgent or high-priority tickets").
- **Forbidden** (403, e.g. Requester navigating by URL): centered safe message, no metric data rendered.
- **Safe failure** (500/network): error callout with a Retry button; entered nothing to preserve.

**Administrator reuse**: identical screen plus the AD-01 card; no separate admin dashboard screen is built (specification §11 D-11).

## 4. Requester Dashboard

**Modes**: single read-only summary, strictly session-scoped.

**Layout**:
1. Header: "My Dashboard".
2. **Metric cards row**: RD-01 My Open Tickets, RD-02 Waiting for Me (warning-tinted badge label + count).
3. **Lists row**: RD-03 Recently Updated (capped 5) and RD-04 Recently Resolved (capped 5, success-tinted section label). Row content: ticket number, summary, status badge, compact timestamp, link to Ticket Detail.

**Not a My Tickets clone**: no search box, filters, pagination, or full list — only the four metrics and two capped lists; every item drills down into My Tickets (`/my-tickets?status=…`) or the detail view (`api-spec.md` §5.4).

**States**: loading skeletons; zero-metrics cards with working drill-downs to the empty My Tickets view; forbidden (403); safe failure with Retry.

## 5. Actions Taken on IT Staff Ticket Detail

Section placement (top→bottom): Ticket information → **Actions Taken** → Public Comments → Internal Notes → Attachments. The section is present for every viewer; the Requester rendering is read-only (below).

### 5.1 List / table (view mode)
- Desktop ≥ 992px: table, columns **Date/Time, Description, Result, Performed By, Follow-Up, Follow-up Note, Attachment Notes, Edit** (Edit column present for IT Staff/Admin only). Ordered per BR-07 (newest first).
- Timestamps compact (`YYYY-MM-DD HH:mm`) inside `<time dateTime>`; Description/Result/Follow-up Note/Attachment Notes truncate with `title` in the table; Follow-Up shows the badge/`No` text from §2.
- Below 992px: card list with the same fields stacked (same breakpoint convention as the queue, lab-03 ui-spec §5); no horizontal page scroll; the table never scrolls sideways (`table-layout: fixed`).
- **Empty state**: "No actions recorded yet." (staff additionally see the Create action button).

### 5.2 Create mode (IT Staff/Admin)
- Trigger: primary button "Add Action" above the list; opens an inline form panel (not a modal) so validation stays near-field and mobile-safe.
- Fields: **Action Date/Time** (`datetime-local`, defaults to now, bounded per specification D-6), **Action Description** (textarea, required, ≤ 2,000), **Result** (textarea, optional, ≤ 2,000), **Follow-Up Required** (checkbox/switch, label "Follow-up needed?"), **Follow-up Note** (textarea — visible and required **iff** the switch is on; near-field error "A follow-up note is required when follow-up is needed."), **Attachment Notes** (text input, optional, hint `e.g. "screenshot-battery-report.png — see tab 2"`).
- **Performed By** is not a form field: the panel shows read-only text "Recorded as: <session user> (automatic)" (FR-05).
- Actions: Save Action (primary, busy state "Saving…", double-submit blocked), Cancel (secondary, discards with no data loss warnings needed).
- **Validation placement**: near-field per field; the first invalid field receives focus on submit.
- **Data preservation**: on any recoverable failure (400/409/500) the form stays mounted with all entered values; the failure message renders above the actions (FR-22).
- **Duplicate guard**: while saving, the button is disabled (FR-08); a server `409 DUPLICATE_ACTION` renders as a clear conflict message ("An identical action was just recorded.") without clearing the form.

### 5.3 View / edit mode
- Clicking a row (or Edit) expands the row into an editable panel with the same fields prefilled; **Performed By stays read-only** (historical record; BR-03).
- Save requires the action's last-read `updatedAt` (sent as a hidden `expectedUpdatedAt`); a `409 STALE_UPDATE` shows conflict feedback with a "Reload actions" action and does not overwrite (BR-12).
- No delete control exists (specification §11 D-4).

### 5.4 Requester read-only rendering
- On the Requester Ticket Detail, the same list renders **without** Add/Edit controls, without Edit column, and without any write affordances; all fields including Follow-up Note and Attachment Notes are visible (sheet §8.3: Requesters see all Actions Taken items).
- Staff-only ticket controls (owner, priority, status) are not rendered for Requesters (unchanged Lab 3 rules).

## 6. Ticket Workflow Controls (Ticket Detail)

- **Transition controls** render only the transitions permitted for the current role and current status per specification §5.2 (FR-13). Implementation: a row of labelled action buttons (e.g. "Start Progress", "Set Waiting for Requester", "Resolve", "Close", "Reopen", "Cancel Ticket") — not a free select — so illegal options are never offered.
- **Resolve availability pre-check**: the "Resolve" button is rendered disabled with helper text "Record at least one Action Taken first." when the Ticket has zero Actions (client convenience only — the backend gate is the authority, BR-11).
- **Requester advisory control** (unchanged semantics, refreshed messaging): the existing "Problem appears resolved" button success message now states explicitly: "Your note was recorded for IT Staff. The ticket status has not changed." (BR-10/FR-10). Staff see the pale advisory callout with the indication timestamp.
- **Destructive transitions** (`CANCELLED`) require an inline confirmation step (second click "Confirm cancel?" within the button group); others apply immediately with a busy state.
- **Feedback**:
  - Success: inline success message + **Ticket summary status badge refreshes in place** (no full reload) (FR-13).
  - `409 FORBIDDEN_TRANSITION`: amber conflict callout ("That status change is no longer allowed. The list has been refreshed.") + control set refresh.
  - `409 RESOLUTION_GATE`: red-adjacent callout with the exact remedy ("Record at least one action on this ticket before resolving.").
  - `409 STALE_UPDATE`: conflict callout with a "Reload ticket" action; no data overwritten.
  - `403`/`404`/`500`: consistent safe-failure patterns from lab-03 ui-spec §8.
- Control-group mapping follows specification §11 D-13: owner assignment, status transitions, and the Actions Taken section are visually and behaviorally separate; recording an Action never changes owner or status by itself.

## 7. Screen States and Feedback (every Lab 4 screen)

- Initial/idle, Loading, Empty (zero metrics / no actions / no recent tickets), No-results (where lists filter), Forbidden (403), Not-found (404), Conflict (409 with recovery action), Success, and safe API Failure — with visible busy/disabled states during processing.
- Error copy is consistent with Labs 2–3 (no raw server messages, no console-only failures).

## 8. Responsive Rules

Viewport | Dashboard | Actions Taken list | Workflow controls
---|---|---|---
Desktop ≥ 992px | Cards in a 3–4 column grid; two list panels side by side | 8-column fixed-layout table (§5.1) | Button row
Tablet 768–991px | 2-column card grid; lists stack | Card list (same fields) | Button row wraps
Mobile < 768px | Single column; cards full width | Card list | Buttons stack full-width
All sizes | No clipped labels, overlapping messages, hidden buttons, or horizontal page scroll; verified at 1280, 1024, 820, and 390 by the Lab 4 responsive E2E (RESP-*).

The dashboard cards and actions table never introduce `overflow-x: auto` wrappers (lab-03 ui-spec §5 rule).

## 9. Accessibility (Lab 2/3 rules + additions)

- Dashboard cards are real links (`<a>`) with accessible names containing the metric label; the whole card may be clickable but exposes one accessible target.
- Follow-Up and status cues are text/icon based, never color alone (§2).
- Inline form panels manage focus: opening Create focuses the first field; failed submit focuses the first invalid field; save success returns focus to the section heading.
- Conflict/gate callouts use `role="status"`/`aria-live="polite"`; validation errors use the existing near-field pattern with `aria-describedby`.
- Transition buttons are real `<button>` elements with text labels; the confirmation step for Cancel is keyboard operable.
- All icon-only controls keep accessible labels + tooltips (Lab 2 rule).

## 10. Visual Inspection Checklist and Screenshots

- Tokens, badges, focus, validation placement, and busy/disabled states match this document and lab-03 ui-spec.
- Dashboard cards: label + value + accessible drill-down; zero-state still legible.
- Actions Taken: staff create/edit vs Requester read-only unmistakable; Follow-Up non-color cue present; form data preserved on failure.
- Workflow controls: only permitted transitions offered; gate/conflict feedback readable; summary badge refreshes.
- No obsolete/duplicate UI from earlier labs remains (sheet §7).
- **Screenshots** (Playwright, desktop/tablet/mobile) into `artifacts/lab-04/screenshots/`:
  - `staff-dashboard/` — cards with data, by-status/priority breakdown, recent + urgent lists, empty, forbidden, safe-failure, Admin reuse with user counts.
  - `requester-dashboard/` — metrics with data, zero-state, drill-down target, forbidden.
  - `actions-taken/` — list with multiple actions (two performers), create form, validation (follow-up gate), edit/stale conflict, requester read-only view.
- Checklist verification is recorded in the Lab 4 visual evidence (Issue 37), mirroring `docs/lab-03/visual-inspection.md`.
