# Lab 3 — Zen Green UI and Visual Inspection Checklist (Part 9 evidence)

Part 9 of the Lab 3 sheet asks for the completed visual checklist covering nine items:
**design consistency, role navigation, badges, editable/read-only fields, validation placement,
focus, clipping, overlap and horizontal overflow**, together with rendered `ui-spec.md` and
desktop/tablet/mobile screenshots of all major screens.

Every item below is **measured in a real browser**, not asserted by eye. The checker is
`scripts/verify-visual-checklist.mjs`; it drives the running app with Playwright, reads computed
styles and DOM geometry, prints a pass/fail table and exits non-zero if anything fails.

```bash
# API on :3000 and Vite client on :5173 must be running
node scripts/verify-visual-checklist.mjs                 # all roles, 4 viewports
VIEWPORTS=1280 ROLES=staff node scripts/verify-visual-checklist.mjs   # narrower run
```

| Setting | Value |
|---|---|
| Command | `node scripts/verify-visual-checklist.mjs` (reseeds with `npm --prefix server run prisma:seed`, `SEED=0` to skip) |
| Generated | `2026-10-04T13:27:39.637Z` (`artifacts/lab-03/visual-evidence/visual-check.json`) |
| Viewports | 1280×900 desktop, 1024×900 narrow desktop, 820×900 tablet, 390×900 mobile |
| Roles | Administrator, IT Staff, Requester (separate browser context per role, so no session leaks) |
| Screens | login, User Management, Ticket Queue, Staff Ticket Detail, My Tickets, Requester Ticket Detail, Create Ticket |
| Result | **220 / 220 measurements passed, 0 failed** |

Machine-readable copies: `artifacts/lab-03/visual-evidence/visual-check.json` and
`artifacts/lab-03/visual-evidence/visual-check.md` (same numbers, per item).

## Checklist — the nine items from the sheet

| # | Sheet item | How it is measured | Measured | Result |
|---|---|---|---:|---|
| 1 | Design consistency | Computed background of an enabled `.btn-tok-primary` must equal `#006B3C`, card surfaces `#FFFFFF`, page `#F5F7F6`; every `.badge` must have a text label | 28 | ✅ pass |
| 2 | Role navigation | The `nav[aria-label="Primary navigation"]` items must all be permitted for the signed-in role, and Logout plus the signed-in identity must be in the header | 24 | ✅ pass |
| 3 | Badges | Every visible ticket row (table rows **and** mobile cards) must carry a status badge plus both priority badges, each with a `title` | 4 | ✅ pass |
| 4 | Editable / read-only fields | Read-only fields must not be editable (`readonly`/`aria-readonly`, never `contenteditable`), and their background must differ from editable controls | 24 | ✅ pass |
| 5 | Validation placement | After a forced invalid submit, each message must sit in the same form group as the field it belongs to | 28 | ✅ pass |
| 6 | Focus | Walk the whole tab order with real `Tab` presses; every visible stop must show an outline, box-shadow or border-colour focus ring | 28 | ✅ pass |
| 7 | Clipping | No element may have `scrollWidth > clientWidth + 1` or `text-overflow: ellipsis` while its text is cut | 28 | ✅ pass |
| 8 | Overlap | Pairwise intersection of per-line client rects (`getClientRects()`) of text-bearing leaves must stay under 30% of the smaller box | 28 | ✅ pass |
| 9 | Horizontal overflow | `documentElement.scrollWidth - clientWidth` must be ≤ 1px | 28 | ✅ pass |

### Measured detail per item

Verbatim from `artifacts/lab-03/visual-evidence/visual-check.json`:

```
Design consistency (tokens, surfaces, labelled badges)
1280x900     login: tokens match, all badges labelled
1280x900     user-management: tokens match, all badges labelled
1280x900     ticket-queue: tokens match, all badges labelled
1280x900     staff-ticket-detail: tokens match, all badges labelled

Role navigation shows only permitted destinations
1280x900     user-management: ADMIN sees 1 destinations, all permitted + Logout
1280x900     ticket-queue: IT_STAFF sees 1 destinations, all permitted + Logout
1280x900     staff-ticket-detail: IT_STAFF sees 1 destinations, all permitted + Logout
1280x900     my-tickets: REQUESTER sees 2 destinations, all permitted + Logout

Badges: status + both priorities, as text
1280x900     ticket-queue: 10 ticket rows carry status + both priorities as text

Editable vs read-only fields distinct
1280x900     staff-ticket-detail: editable rgb(255, 255, 255) vs read-only rgb(238, 242, 240)
1280x900     ticket-detail: editable rgb(255, 255, 255) vs read-only rgb(238, 242, 240)
1280x900     create-ticket: editable rgb(255, 255, 255) vs read-only rgb(238, 242, 240)
1280x900     user-management: no read-only field on this screen

Validation messages next to their field
1280x900     login: each validation message sits inside its field's form group
1280x900     user-management: each validation message sits inside its field's form group
1280x900     ticket-queue: each validation message sits inside its field's form group
1280x900     staff-ticket-detail: each validation message sits inside its field's form group

Visible keyboard focus indicator
1280x900     login: 34 tab stops, all show a focus ring
1280x900     user-management: 44 tab stops, all show a focus ring
1280x900     ticket-queue: 43 tab stops, all show a focus ring
1280x900     staff-ticket-detail: 42 tab stops, all show a focus ring

No clipped content
1280x900     login: no clipped or ellipsis-truncated content
1280x900     user-management: no clipped or ellipsis-truncated content
1280x900     ticket-queue: no clipped or ellipsis-truncated content
1280x900     staff-ticket-detail: no clipped or ellipsis-truncated content

No overlapping content
1280x900     login: 3 text elements, none overlapping
1280x900     user-management: 106 text elements, none overlapping
1280x900     ticket-queue: 128 text elements, none overlapping
1280x900     staff-ticket-detail: 55 text elements, none overlapping

No horizontal page overflow
1280x900     login: document does not scroll sideways
1280x900     user-management: document does not scroll sideways
1280x900     ticket-queue: document does not scroll sideways
1280x900     staff-ticket-detail: document does not scroll sideways
```

## The checkers are proven to fail on real defects

A checklist that can only pass is worthless, so each geometry detector was verified against
injected defects on the running app (temporary CSS/DOM injection, reverted afterwards):

| Injected defect | Detector output |
|---|---|
| `main.container { width: 1600px }` at 390px | `FAIL — document scrolls sideways by 570px` |
| `max-width: 60px; overflow: hidden; text-overflow: ellipsis` on a ticket number | `FAIL — div.fw-semibold scrollW=88>clientW=60; div truncated: "TK-000057"` (all 10 rows) |
| Absolutely positioned clone of a ticket number over the original | `FAIL — "TK-000057" x "TK-000057"` |

The same detectors back the E2E regression spec: adding `white-space: nowrap` to the queue table
made RESP-01 fail at 1024/820/390, and removing it made the suite pass again
(`e2e/lab-03/helpers.ts` → `expectNoClippedContent`, `expectTableFullyVisible`).

## Defect this checklist found and fixed

Item 3 caught a real inconsistency between the two queue presentations: at ≥992px the status badge
carried `title="Status NEW"`, but the mobile card version rendered the same badge with no `title`,
so hovering the abbreviated card badge gave no explanation. Fixed in
`client/src/StaffTicketQueue.tsx` by adding the same `title` to the card badge; the item now passes
at all four viewports and `client/tests/lab-03/StaffTicketQueue.test.tsx` + the full E2E suite were
re-run after the change.

## Supplementary checks (beyond the nine items)

These are not sheet items but were verified in the same pass and are referenced by other parts:

| Check | Result | Evidence |
|---|---|---|
| Public Comments vs Internal Notes visually distinct (tint + explicit "Internal" marker, never colour alone) | ✅ | `staff-ticket-detail/detail-07-public-comment-posted-desktop.png`, `detail-09-internal-note-posted-desktop.png`; STYLE-02 client tests |
| Status/role communicated as text, not colour alone (screen-reader readable) | ✅ | `.badge` text + `title` measured in item 1/3; A11Y-01 Playwright spec |
| Loading / empty / no-results / forbidden / failure feedback on all major screens | ✅ | `staff-queue/queue-07..10`, `staff-ticket-detail/detail-13`, `user-management/users-13/14`; server + client tests |
| Keyboard-accessible forms with labelled inputs | ✅ | A11Y-01 Playwright spec (tab order, focus indicator, landmarks) plus item 6 above |

## Screenshot set (`artifacts/lab-03/screenshots/`)

76 PNGs regenerated by `npm run screenshots:lab3` (reseeds first, `SEED=0` to skip), matching the
`ui-spec.md` §11 directory layout, plus 6 API/non-UI captures in `artifacts/lab-03/api-evidence/`:

- **authentication/** — `auth-01..14` (login valid/required validation/invalid email/invalid
  credentials/inactive/busy/network failure, mandatory change-password, mismatch, password updated,
  per-role shell, post-logout) + `auth-15..18` responsive (login and change-password at tablet/mobile).
- **staff-queue/** — `queue-01..10` (full data, search, status filter, IT-Priority sort, pagination
  page 2, owner-unassigned filter, loading, empty, no-results, failure) + `queue-11/12` responsive
  tablet/mobile + **`queue-13-list-narrow-desktop-1024.png`** for the 1024×900 narrow desktop.
- **staff-ticket-detail/** — `requester-01..11` (My Tickets list, create form, detail, public comment
  posted, resolution indication, foreign-ticket 404, role-nav restriction, responsive) and
  `detail-01..15` (overview, claim FR-14, reassign, IT Priority FR-15, status FR-16, forbidden
  transition 409, public comment post/required, internal note post/required, attachments,
  requester-resolved indication, failure, responsive).
- **user-management/** — `users-01..17` (list, search, role filter, create form/required
  validation/duplicate/success, edit form/success, set-initial-password form/invalid,
  required-change-next-login, no-results, failure, last-active-admin blocked, self-deactivation
  blocked, non-admin no nav) + `users-18/19` responsive.

API/non-UI evidence in `artifacts/lab-03/api-evidence/`:

- `part-5-auth/05-api-401-after-logout.png` — API after logout → 401.
- `part-6-queue/api-403-requester-queue.png` — Requester forbidden from staff queue → 403.
- `part-7-detail/api-403-requester-notes.png` — Requester forbidden from internal notes → 403.
- `part-7-detail/api-404-foreign-ticket.png` — Requester cannot read a foreign ticket → 404.
- `part-7-detail/api-409-forbidden-transition.png` — Forbidden status transition → 409.
- `part-8-users/08-users-api-403-for-staff.png` — User Management forbidden for IT_STAFF → 403.
