# Lab 2 — LEB2 Project Implementation and Report

**Project:** TokTickIT — IT service desk (CPE 334, Labs 1–4)
**Lab 2 scope:** Development Requester session → Create Ticket → My Tickets → Ticket Detail + Attachments → Zen Green responsive UI
**Author:** นางสาวอชิรญา อินตา — 67070505229 — GitHub: [@Achikan](https://github.com/Achikan)
**Peer reviewer:** นายธนากร พหุลรัตน์ — 67070505217 — GitHub: [@il0lk3](https://github.com/il0lk3)
**Repository:** https://github.com/Achikan/TokTickIT

All documentation lives in `docs/lab-02/` of the submitted repository (`main` branch after
the release merge; this report was built from `lab2-staging`, which is byte-identical to
`main` once the release PR is merged). Screenshots are readable at normal zoom and are
embedded below with their source paths.

---

## Answer Part 1: Git Use with Engineering Workflow

**Evidence: commit history in the final `main` branch showing feature branches merged into staging then main.**

The workflow used for every Lab 2 Issue: `feature/<n>-<slug>` branch → peer review on a Pull
Request → reviewer approves → merge into `lab2-staging` → final release PR `lab2-staging` → `main`.

Commits are small, conventional, and tied to Issues (`feat:`, `docs:`, `refactor:`, `fix:`).

| Item | Evidence |
|---|---|
| Commit history (feature → staging → main graph) | `artifacts/lab-02/screenshots/part-1-git-evidence/01-commit-history.png` |
| PR review record (all Lab 2 PRs reviewed and approved, 2-way) | `artifacts/lab-02/screenshots/part-1-git-evidence/05-pr-review-table.png` |
| Peer reviews I gave on my partner's PRs | `artifacts/lab-02/screenshots/part-1-git-evidence/05b-reviewed-partner-prs.png` |
| GitHub Issues (all closed = Kanban Done) | `artifacts/lab-02/screenshots/part-1-git-evidence/06-issues-done.png` |
| Rendered reviewer.md | [docs/lab-02/reviewer.md](reviewer.md) |
| README | [README.md](../../README.md) |
| .gitignore | [.gitignore](../../.gitignore) |
| Directory structure in the IDE | `artifacts/lab-02/screenshots/part-1-git-evidence/02-directory-structure.png` |
| README content | `artifacts/lab-02/screenshots/part-1-git-evidence/03-readme.png` |
| .gitignore content | `artifacts/lab-02/screenshots/part-1-git-evidence/04-gitignore.png` |

**PR list (all written by me, reviewed by @il0lk3, merged into `lab2-staging`):**

| PR | Branch → base | Title | Verdict |
|---|---|---|---|
| #25 | `feature/5-spec-test-plan` → `lab2-staging` | docs: Lab 2 engineering contract (Issue 5) | CHANGES_REQUESTED → APPROVED |
| #26 | `feature/6-db-models-seed` → `lab2-staging` | feat: Lab 2 data model, migration, seed (Issue 6) | APPROVED |
| #27 | `feature/7-requester-selection` → `lab2-staging` | feat: Development Requester selection (Issue 7) | APPROVED |
| #28 | `feature/8-ticket-creation` → `lab2-staging` | feat: Ticket creation API + Create Ticket (Issue 8) | CHANGES_REQUESTED → APPROVED |
| #29 | `feature/9-my-tickets` → `lab2-staging` | feat: My Tickets list (Issue 9) | CHANGES_REQUESTED → APPROVED |
| #30 | `feature/10-ticket-detail` → `lab2-staging` | feat: Ticket Detail screen (Issue 10) | CHANGES_REQUESTED → APPROVED |
| #31 | `feature/11-attachments` → `lab2-staging` | feat: Attachment lifecycle (Issue 11) | CHANGES_REQUESTED → APPROVED |
| #32 | `feature/12-zen-green-ui` → `lab2-staging` | feat: Zen Green UI & Responsive (Issue 12) | CHANGES_REQUESTED → APPROVED |
| #33 | `feature/13-automated-tests` → `lab2-staging` | feat: Automated Tests E2E (Issue 13) | CHANGES_REQUESTED → APPROVED |
| #34 | `feature/14-visual-inspection` → `lab2-staging` | docs: Visual Inspection & Evidence (Issue 14) | APPROVED |
| #35 | `feature/15-docs-review-release` → `lab2-staging` | docs: finalize Lab 2 docs (Issue 15) | APPROVED |
| #36 | `lab2-staging` → `main` | Release Lab 2 | Peer-approved → merged into `main` |

> Lab 2 GitHub Issues are **#13–#23** (Issue 5 "Sprint Specification & Test Plan" through
> Issue 15 "Documentation, Review & Release"; Issues #2–#12 are Lab 1 and earlier setup).
> Peer review is **two-way**: I reviewed all of my partner's Lab 2 PRs
> (`il0lk3/TokTickIT` #22–#30) in addition to receiving my partner's reviews — see
> `05b-reviewed-partner-prs.png` below.

![Commit history](../../artifacts/lab-02/screenshots/part-1-git-evidence/01-commit-history.png)

![PR review table](../../artifacts/lab-02/screenshots/part-1-git-evidence/05-pr-review-table.png)

![Peer reviews I gave on partner's PRs](../../artifacts/lab-02/screenshots/part-1-git-evidence/05b-reviewed-partner-prs.png)

![Issues all closed](../../artifacts/lab-02/screenshots/part-1-git-evidence/06-issues-done.png)

![Directory structure](../../artifacts/lab-02/screenshots/part-1-git-evidence/02-directory-structure.png)

![README](../../artifacts/lab-02/screenshots/part-1-git-evidence/03-readme.png)

![.gitignore](../../artifacts/lab-02/screenshots/part-1-git-evidence/04-gitignore.png)

**Kanban:** GitHub Project board used with all Issues moved to **Done** as work completed.
The final board screenshot (all cards in Done) is captured manually from the GitHub web UI —
see `kanban-done.png` below. All Issues #13–#23 are *Closed* as shown in
`part-1-git-evidence/06-issues-done.png`.

![Kanban board — all Issues in Done](../../artifacts/lab-02/screenshots/kanban-done.png)

---

## Answer Part 2: Spec DD

**Linked rendered copy:** [docs/lab-02/specification.md](specification.md)

The specification is an engineering contract written **before** any implementation
(commit `5a42d1f` in `feature/5-spec-test-plan`, merged via PR #25 on 2026-09-01 —
*before* the first implementation PR #28 on 2026-09-02). The full contract content:

### Functional Requirements (FR-01 … FR-19)

- **FR-01** Development Requester Selection screen to choose the current requester.
- **FR-02** Selection screen loads only *active* Development Requesters from PostgreSQL via the API.
- **FR-03** After selection, the shell shows the requester's name + a Change Requester action.
- **FR-04** Switching requester reloads requester-specific data.
- **FR-05** Create Ticket screen captures a validated Ticket for the selected requester.
- **FR-06** Ticket creation produces a system-generated official Ticket Number distinct from the numeric `id`.
- **FR-07** Create Ticket loads reference data (Category, Related System, Requested Priority) from the backend/database.
- **FR-08** Summary and Description are required and validated with near-field messages.
- **FR-09** On success, the screen displays the official Ticket Number and saved values.
- **FR-10** On API failure the form shows a safe error state and preserves entered values.
- **FR-11** My Tickets screen lists only Tickets owned by the selected requester.
- **FR-12** My Tickets supports search, filtering, sorting, and pagination.
- **FR-13** Requester Ticket Detail (view mode) shows the current Ticket read-only.
- **FR-14** Only the owner requester may retrieve, view, or download a Ticket's data.
- **FR-15** The system allows uploading an Attachment to an owned Ticket.
- **FR-16** The system allows retrieving Attachment metadata.
- **FR-17** The system allows downloading an active Attachment; a soft-removed one cannot be downloaded.
- **FR-18** The system allows soft-removing an Attachment, capturing a removal reason while retaining metadata.
- **FR-19** All failure, empty, loading, and no-results states are handled clearly in the UI.

### Business Rules (BR-01 … BR-11)

- **BR-01** A Ticket belongs to exactly one Development Requester (creator/owner).
- **BR-02** Only active Development Requesters may be selected/appear; inactive ones never appear.
- **BR-03** The official Ticket Number is unique, system-generated, and immutable after creation.
- **BR-04** A requester may only see/open/download/soft-remove attachments of Tickets they own.
- **BR-05** Summary and Description are required (non-empty after trimming).
- **BR-06** Requested Priority defaults to `MEDIUM` when not supplied.
- **BR-07** Attachment uploads reject unsupported types and oversized files with a safe, field-related error; no row is created.
- **BR-08** Soft removal is the only removal operation; metadata is retained and marked removed with a reason/timestamp.
- **BR-09** A removed Attachment's metadata stays visible, but downloads are blocked.
- **BR-10** Invalid search/filter/page parameters are rejected safely (specific error), not silently ignored.
- **BR-11** A requester with no selected context cannot access My Tickets/Detail; the selection screen is shown.

### Acceptance Criteria (AC-01 … AC-15)

- **AC-01** Valid submit → one Ticket saved, official Ticket Number displayed.
- **AC-02** No requester selected + open My Tickets → selection screen shown.
- **AC-03** Requester B requesting Requester A's Ticket → data not returned.
- **AC-04** Empty Summary+Description submit → field-level messages, no API call.
- **AC-05** Successful creation → created Ticket present in that requester's My Tickets.
- **AC-06** Switch A→B → A's Tickets disappear.
- **AC-07** Search/filter/sort/pagination applied → list updates + metadata reflects result.
- **AC-08** Active Attachment on owned Ticket → download returns the file.
- **AC-09** Soft-removed Attachment → download blocked, metadata remains visible.
- **AC-10** Non-owner requests Ticket/Attachment → rejected with a non-disclosing error.
- **AC-11** Unsupported type / oversized file → safe field-level error, no Attachment created.
- **AC-12** Backend failure during submission → safe error state, entered values preserved.
- **AC-13** Desktop / tablet / mobile → responsive, no clipping/overlap/hidden buttons/horizontal scroll.
- **AC-14** Empty list → "empty" state; search/filters with no matches → distinct "no-results" state.
- **AC-15** Attachment states uploading/invalid/active/soft-removed/unavailable → each presented distinctly.

### Definition of Done

- All approved scope implemented; all Acceptance Criteria satisfied.
- All planned automated tests pass from documented commands on the final branch; every AC maps to test evidence.
- No required test skipped, disabled, or commented out.
- Screens/APIs conform to `specification.md`, `api-spec.md`, `ui-spec.md`.
- Success, failure, and boundary cases handled (validation, ownership, states, responsive).
- README setup/test instructions current; workflow demonstrable.

The screenshot below proves the spec existed before the implementation PRs:

![Spec before implementation PRs](../../artifacts/lab-02/screenshots/part-2-spec-evidence/01-spec-before-impl.png)

---

## Answer Part 3: Test DD and Traceability

**Linked rendered copy:** [docs/lab-02/tests.md](tests.md)

The plan was written up front (Test DD) from `specification.md`; every Acceptance Criterion
and Business Rule has a planned test whose name embeds the relevant tags (e.g. `API-04,
AC-05, FR-11`). Final pass status is shown at the bottom.

### Planned-test table (rendered from `tests.md`)

| Test ID | Type | Req / AC | What It Tests | Test File | Status |
|---|---|---|---|---|---|
| API-01 | API | AC-01, FR-05 | Create valid Ticket; official number returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-02 | API | AC-04, BR-05 | Empty Summary/Description → 400, nothing saved | `create-ticket.api.test.ts` | Pass |
| API-03 | API | AC-01, BR-03 | Ticket Number unique, distinct from numeric id | `create-ticket.api.test.ts` | Pass |
| API-04 | API | AC-05, FR-11 | List returns only the requester's own Tickets | `my-tickets.api.test.ts` | Pass |
| API-05 | API | AC-07, FR-12 | Pagination page + metadata correct | `my-tickets.api.test.ts` | Pass |
| API-06 | API | AC-07, FR-12 | Search/filters narrow the list | `my-tickets.api.test.ts` | Pass |
| API-07 | API | AC-07, FR-12 | Sorting ordered as requested | `my-tickets.api.test.ts` | Pass |
| API-08 | API | BR-10 | Invalid page/size/filter → safe 400 | `my-tickets.api.test.ts` | Pass |
| API-09 | API | AC-03, FR-14 | Retrieve foreign Ticket → non-disclosing rejection | `ticket-detail.api.test.ts` | Pass |
| API-10 | API | FR-13 | Retrieve one owned Ticket → full data | `ticket-detail.api.test.ts` | Pass |
| API-11 | API | FR-15, AC-11 | Valid + invalid/oversized Attachment upload | `attachments.api.test.ts` | Pass |
| API-12 | API | FR-17, AC-08 | Download active Attachment → file returned | `attachments.api.test.ts` | Pass |
| API-13 | API | FR-18, AC-09 | Soft-remove with reason; download blocked | `attachments.api.test.ts` | Pass |
| API-14 | API | FR-14, AC-10 | Upload/download/remove on foreign Ticket → rejected | `attachments.api.test.ts` | Pass |
| API-15 | API | FR-02, BR-02 | Only active Development Requesters returned | `dev-requester.api.test.ts` | Pass |
| UNIT-01 | Unit | BR-03 | Ticket Number generator format + uniqueness | `ticket-number.test.ts` | Pass |
| UNIT-02 | Unit | BR-06 | Requested Priority default (MEDIUM) | `create-ticket.api.test.ts` | Pass |
| UI-01 | UI | AC-04 | Empty Summary → near-field message, no call | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-02 | UI | AC-01, FR-09 | Create success → shows official number | `CreateTicket.test.tsx` | Pass |
| UI-03 | UI | AC-12, FR-10 | API failure → safe error, values preserved | `CreateTicket.test.tsx` | Pass |
| UI-04 | UI | FR-06 | Read-only system fields visually distinct | `CreateTicket.test.tsx` | Pass |
| UI-05 | UI | AC-02, FR-01 | Shell shows requester + Change Requester | `RequesterSelection.test.tsx` | Pass |
| UI-06 | UI | FR-02, BR-02 | Dropdown active-only + loading/empty/failure | `RequesterSelection.test.tsx` | Pass |
| UI-07 | UI | AC-06, FR-04 | Switching requester reloads data | `MyTickets.test.tsx` | Pass |
| UI-08 | UI | AC-07, FR-12 | List, empty, no-results, failure states | `MyTickets.test.tsx` | Pass |
| UI-09 | UI | FR-13, FR-14 | Ticket Detail read-only presentation | `RequesterTicketDetail.test.tsx` | Pass |
| UI-10 | UI | FR-15..18 | Attachment actions + invalid/removed/unavailable states | `AttachmentSection.test.tsx` | Pass |
| STYLE-01 | UI Style | AC-13 | Tokens/labels/asterisks/messages/busy-disabled | `client/tests/lab-02/style.test.tsx` | Pass |
| RESP-01 | Responsive | AC-13 | No clip/overlap/h-scroll; usable at 3 viewports | `e2e/lab-02/responsive.spec.ts` | Pass |
| E2E-01 | E2E | AC-01, AC-05 | Create Ticket → find it in My Tickets | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| E2E-02 | E2E | AC-09 | Upload → soft-remove; download blocked | `requester-ticket-flow.spec.ts` | Pass |

### Acceptance-Criterion traceability (every AC has ≥1 test)

AC-01 → API-01, API-03, UI-02, E2E-01 · AC-02 → UI-05 · AC-03 → API-09, API-14 ·
AC-04 → API-02, UI-01 · AC-05 → API-04, E2E-01 · AC-06 → UI-07 · AC-07 → API-05..07, UI-08, RESP-01 ·
AC-08 → API-12 · AC-09 → API-13, E2E-02 · AC-10 → API-09, API-14 · AC-11 → API-11, UI-10 ·
AC-12 → UI-03 · AC-13 → STYLE-01, RESP-01 · AC-14 → UI-08 · AC-15 → API-11..14, UI-10.

### Final pass status

| Suite | Count | Result |
|---|---|---|
| Server (unit + API) — `npm test` in `server/` | 52 | ✅ 52/52 |
| Client (UI + style) — `npm test` in `client/` | 51 | ✅ 51/51 |
| E2E + responsive — `npm run test:e2e` (root) | 11 | ✅ 11/11 |

Complete passing output, captured from the current implementation:

![Server tests 52/52](../../artifacts/lab-02/screenshots/part-3-test-evidence/01-server-tests-pass.png)

![Client tests 51/51](../../artifacts/lab-02/screenshots/part-3-test-evidence/02-client-tests-pass.png)

![E2E + responsive 11/11](../../artifacts/lab-02/screenshots/part-3-test-evidence/03-e2e-tests-pass.png)

(The rubric asks for output *from main*; the same code and counts are on `main` after the
release PR #36 merge — output above was generated from the Lab 2 release branch.)

---

## Answer Part 4: AI Use with Reflection

**Linked rendered copy:** [docs/lab-02/ai-use.md](ai-use.md)

- **LLM/agent used:** opencode (The Agent SDK) — an AI coding agent that edits and verifies code
  in this repository, used for Spec-Driven Development (Appendix A workflow) and TDD.
- Below are **selected real prompts** (9 of them, verbatim-style as I asked them) and what I
  then did with each result. Prompts that exposed gaps are recorded too, not only polished steps.

| # | The prompt I gave (as I actually asked it) | What I did with the result / how I refined it |
|---|---|---|
| 1 | "Turn the Lab 2 labs sheet into a complete engineering contract: scope, user stories, non-functional requirements, numbered acceptance criteria, and a test plan." | Read the sheet myself first, then had the agent draft spec/api-spec/ui-spec (Issue 5). I re-ordered criteria and re-worded ambiguous rules so each was verifiable before implementation. |
| 2 | "Design the relational model + seed from the specs, with Ticket Number, Current Status as enums, and uuid IDs." | Reviewed the Prisma schema by hand, wrote migration + seed (Issue 6). Chose `TK-<6-digit>`; my first draft defaulted status to `SUBMITTED`, later corrected to `NEW` (§4.3) before release. |
| 3 | "Write a failing test first, then implement ticket creation with field-level validation (TDD)." | Kept red-green-refactor: asked for a failing test, refused implementation until the test existed, confirmed validation appears *next to* the field (ui-spec §7). |
| 4 | "Implement My Tickets scoped to the requester, with search, filters, sorting, and pagination. What are the ownership rules?" | Pushed the agent to state ownership/404 rules explicitly in the API, then verified requester A/B isolation in tests (Issue 9). Caught that search should also match ticket number and added it. |
| 5 | "Add the Zen Green theme: CSS tokens, button hierarchy, focus states, and responsive breakpoints from ui-spec §7/§12." | Refused an earlier draft that hard-coded colors in tests; asked the agent to read the *real* `styles.css` and assert tokens (STYLE-01), and to surface `aria-current` on the active nav (Issue 12). |
| 6 | "Set up Playwright E2E for the full requester flow plus responsive rules, with screenshots at desktop/tablet/mobile." | Specified `workers: 1` myself because ticket numbers come from a running counter and parallel creates collide; serialized the suite and wired `npm run screenshots` (Issue 13). |
| 7 | "The reviewer says the E2E can't pass — re-verify against the actual remote and push back with evidence if needed." | Ran `git ls-tree`/`git show` on `origin/lab2-staging` and re-ran the suite myself, then replied with code evidence; conceded the real gap (`SUBMITTED` → fixed to `NEW`) for the release. |
| 8 | "Produce the visual-inspection evidence: complete the ui-spec §14 checklist and regenerate current screenshots." | Checked each checklist item against the actual code and RESP-01 assertions before writing it, and refreshed all screenshots so evidence matches the final UI (Issue 14). |
| 9 | "Finalise the docs and release: reviewer.md, ai-use.md, updated README, and the lab2-staging → main release PR." | Reviewed every PR's real review comments/approvals to fill `reviewer.md`, verified final test counts (52/52, 51/51, 11/11) before writing `tests.md`. Release PR held for peer approval. |

**My Reflection:** The agent drafts are good accelerators but not a substitute for reading the
labsheet and rubric myself. Several agent suggestions silently drifted from what the teacher
asked for (e.g., screenshot coverage of the requested Create-Ticket states), and my first
status default (`SUBMITTED`) missed the §4.3 "New" wording until a peer review caught it.
I learned to treat the rubric as the source of truth, review every generated item against it
myself, and use the agent to close the gaps I found — not the reverse. Writing my own prompt
summary ("I will earn the information by asking the right questions, not by reading the
answers") became my guiding principle.

---

## Answer Part 5: Development Requester Select Screen

The simulated **login** screen lets the session choose *who* the Development Requester is. It is
scored inside Part 6 (Working Ticket Screen: Create Mode).

States captured — loading, loaded active-user dropdown, selected-user display, empty (no active
requesters), and API-failure (safe error message):

![Requester selection — loading](../../artifacts/lab-02/screenshots/requester-selection/loading.png)

![Requester selection — loaded dropdown (active requesters only)](../../artifacts/lab-02/screenshots/requester-selection/loaded-dropdown.png)

![Requester selection — selected](../../artifacts/lab-02/screenshots/requester-selection/selected.png)

![Requester selection — empty ("There are no active development requesters.")](../../artifacts/lab-02/screenshots/requester-selection/empty.png)

![Requester selection — API failure ("Unable to load development requesters.")](../../artifacts/lab-02/screenshots/requester-selection/api-failure.png)

The requested user is shown in the header ("Selected Requester") with a **Change Requester**
action that returns to the selection screen. Inactive requesters (e.g. Evan) never appear
(BR-02).

---

## Answer Part 6: Working Ticket Screen — Create Mode

Evidence covers the Teacher's §4 User Stories and the required states.

### 1. Requester field populated from the Development Requester; saved ticket matches

The requester is chosen *before* entering the app; the saved Ticket stores the matching
`requesterId`, and the official ticket number + saved values come back from the database:

![UI requester field ↔ DB requesterId](../../artifacts/lab-02/screenshots/part-6-evidence/01-requester-field-db.png)

### 2. Reference data loaded from the database

![Reference data from DB (categories + related systems)](../../artifacts/lab-02/screenshots/part-6-evidence/02-reference-data-db.png)

### 3–6. Required states (initial, validation failure, submitting, success, API failure, invalid attachment)

The Create Ticket form now includes the **Attachments** field (labsheet §4.4), so the invalid
attachment check happens at Create mode itself:

![Create Ticket — initial empty form](../../artifacts/lab-02/screenshots/create-ticket-states/01-initial.png)

![Create Ticket — validation failure (field-level messages)](../../artifacts/lab-02/screenshots/create-ticket-states/02-validation-failure.png)

![Create Ticket — invalid attachment rejected (unsupported `.txt` type, field-level error)](../../artifacts/lab-02/screenshots/create-ticket-states/03-invalid-attachment.png)

![Create Ticket — valid files selected (attach before submit)](../../artifacts/lab-02/screenshots/create-ticket-states/04-files-selected.png)

![Create Ticket — submitting (button busy "Submitting…")](../../artifacts/lab-02/screenshots/create-ticket-states/05-submitting.png)

![Create Ticket — success (official TK-###### number from backend)](../../artifacts/lab-02/screenshots/create-ticket-states/06-success.png)

![Create Ticket — API failure (safe error, form values preserved)](../../artifacts/lab-02/screenshots/create-ticket-states/07-api-failure.png)

---

## Answer Part 7: Working My Tickets Screen

Requester **Alice** selected → her ticket list. Switch to Requester **Bob** → Alice's tickets
disappear (requester-scoped list). Then search, filters, sort, pagination, empty state,
no-results, and cross-requester access evidence.

| State | Screenshot |
|---|---|
| Requester A (Alice) ticket list | `part-7-my-tickets/01-alice-list.png` |
| Requester B (Bob) ticket list (A's disappear) | `part-7-my-tickets/02-bob-list.png` |
| Search | `part-7-my-tickets/03-search.png` |
| Filter by category | `part-7-my-tickets/04-filter-category.png` |
| Filter by priority | `part-7-my-tickets/05-filter-priority.png` |
| Filter by status — no matches | `part-7-my-tickets/06-filter-status-no-matches.png` |
| Sort | `part-7-my-tickets/07-sort.png` |
| Pagination | `part-7-my-tickets/08-pagination.png` |
| Empty state (Requester C — no tickets) | `part-7-my-tickets/09-empty-state.png` |
| No-results state | `part-7-my-tickets/10-no-results.png` |
| Cross-requester: Alice's list excludes Bob's tickets | `part-78-evidence/01-my-tickets-owner-only.png` |
| Cross-requester: direct access to another requester's ticket rejected | `part-78-evidence/02-unauthorized-access-rejected.png` |

![Alice list](../../artifacts/lab-02/screenshots/part-7-my-tickets/01-alice-list.png)

![Bob list](../../artifacts/lab-02/screenshots/part-7-my-tickets/02-bob-list.png)

![Search](../../artifacts/lab-02/screenshots/part-7-my-tickets/03-search.png)

![Filter category](../../artifacts/lab-02/screenshots/part-7-my-tickets/04-filter-category.png)

![Filter priority](../../artifacts/lab-02/screenshots/part-7-my-tickets/05-filter-priority.png)

![Filter status no-match](../../artifacts/lab-02/screenshots/part-7-my-tickets/06-filter-status-no-matches.png)

![Sort](../../artifacts/lab-02/screenshots/part-7-my-tickets/07-sort.png)

![Pagination](../../artifacts/lab-02/screenshots/part-7-my-tickets/08-pagination.png)

![Empty state](../../artifacts/lab-02/screenshots/part-7-my-tickets/09-empty-state.png)

![No results](../../artifacts/lab-02/screenshots/part-7-my-tickets/10-no-results.png)

![Owner-only list](../../artifacts/lab-02/screenshots/part-78-evidence/01-my-tickets-owner-only.png)

![Unauthorized access rejected](../../artifacts/lab-02/screenshots/part-78-evidence/02-unauthorized-access-rejected.png)

---

## Answer Part 8: Working Ticket Screen — View Mode and Attachments

Owned Ticket Detail, add attachment, download active attachment, soft removal with reason,
retained metadata, blocked removed download, and unauthorized ticket-access evidence.

| State | Screenshot |
|---|---|
| Owned Ticket Detail (read-only fields, status/priority badges) | `part-8-ticket-detail/01-owned-detail.png` |
| Add attachment — selected file shown before upload | `part-8-ticket-detail/02-add-attachment.png` |
| Download active attachment | `part-8-ticket-detail/03-download-active.png` |
| Soft-removal with reason — inline input panel | `part-8-ticket-detail/04-removal-reason-input.png` |
| Soft-removed (Screenshot REMOVED, reason retained) | `part-8-ticket-detail/05-soft-removed.png` |
| Blocked removed download (410 on API) | `part-8-ticket-detail/06-blocked-download.png` |
| Unauthorized ticket access rejected (non-disclosing 404) | `part-78-evidence/02-unauthorized-access-rejected.png` |
| Attachment states (initial / valid / invalid / removed) | `ticket-detail-attachments/01..04` |

![Owned ticket detail](../../artifacts/lab-02/screenshots/part-8-ticket-detail/01-owned-detail.png)

![Add attachment — selected file](../../artifacts/lab-02/screenshots/part-8-ticket-detail/02-add-attachment.png)

![Download active](../../artifacts/lab-02/screenshots/part-8-ticket-detail/03-download-active.png)

![Soft-removal reason input](../../artifacts/lab-02/screenshots/part-8-ticket-detail/04-removal-reason-input.png)

![Soft removed — metadata retained](../../artifacts/lab-02/screenshots/part-8-ticket-detail/05-soft-removed.png)

![Blocked download](../../artifacts/lab-02/screenshots/part-8-ticket-detail/06-blocked-download.png)

Attachment lifecycle states:

![Attachments initial](../../artifacts/lab-02/screenshots/ticket-detail-attachments/01-initial.png)

![Valid upload](../../artifacts/lab-02/screenshots/ticket-detail-attachments/02-valid-uploaded.png)

![Invalid rejected](../../artifacts/lab-02/screenshots/ticket-detail-attachments/03-invalid-attach.png)

![Soft-removed, metadata retained](../../artifacts/lab-02/screenshots/ticket-detail-attachments/04-soft-removed.png)

**Soft removal (BR-08/BR-09):** the reason is captured in an **inline input panel** on Ticket
Detail (no `window.prompt`), the row's metadata stays visible with the reason, and the download
action is replaced by a **Blocked** indicator that returns 410 on any API attempt.

**Cross-requester rejection:** the API verifies the requester owns the ticket/attachment. A
request with Alice's `X-Requester-Id` for Bob's ticket returns a generic 404 (does not leak
existence), and the UI has no access to the foreign ticket number. Evidence:
`part-78-evidence/02-unauthorized-access-rejected.png`.

---

## Answer Part 9: Zen Green UI and Responsive Evidence

**Linked rendered UI spec:** [docs/lab-02/ui-spec.md](ui-spec.md)

The reusable "Zen Green" presentation system covers color tokens, control states, required-field
markers/validation placement, button hierarchy, attachment presentation, screen states, app
shell/navigation, and responsive rules (ui-spec §1–§13).

### Completed visual checklist (visual-inspection.md §2, all ✅)

| # | Checklist item | Verdict |
|---|---|---|
| 1 | Colors/tokens match ui-spec (primary `#006B3C`, secondary `#0B7A46`, pale `#EAF6EF`) — asserted by STYLE-01 | ✅ |
| 2 | Editable vs read-only fields clearly distinct (`.readonly-field`, `.form-control`) | ✅ |
| 3 | Validation message near its field (`.is-invalid` + message below control) | ✅ |
| 4 | Button hierarchy primary/secondary/destructive/disabled/busy | ✅ |
| 5 | No clipping / overlap / unintended horizontal scroll (RESP-01 at 3 viewports) | ✅ |
| 6 | Desktop My Tickets table correct | ✅ |
| 7 | Mobile card / responsive-table correct | ✅ |
| 8 | Badges consistent (Requested/IT priority, Current Status) | ✅ |
| 9 | Filters, pagination, attachment controls, empty states usable at all sizes | ✅ |
| 10 | Screen states present (initial/loading/empty/no-results/failure/success) | ✅ |
| 11 | App shell + active navigation (`aria-current="page"` on active tab) | ✅ |
| 12 | Accessibility: visible focus, labels, non-color indicators, reduced-motion | ✅ |

Initial Current Status is `NEW`, matching labsheet §4.3; no deviations remain.

Desktop / tablet / mobile screenshots of the three main screens:

| Screen | Desktop (1280) | Tablet (820) | Mobile (390) |
|---|---|---|---|
| Create Ticket | `create-ticket/desktop.png` | `create-ticket/tablet.png` | `create-ticket/mobile.png` |
| My Tickets | `my-tickets/desktop.png` | `my-tickets/tablet.png` | `my-tickets/mobile.png` |
| Ticket Detail | `ticket-detail/desktop.png` | `ticket-detail/tablet.png` | `ticket-detail/mobile.png` |

![Create Ticket desktop](../../artifacts/lab-02/screenshots/create-ticket/desktop.png)

![Create Ticket tablet](../../artifacts/lab-02/screenshots/create-ticket/tablet.png)

![Create Ticket mobile](../../artifacts/lab-02/screenshots/create-ticket/mobile.png)

![My Tickets desktop](../../artifacts/lab-02/screenshots/my-tickets/desktop.png)

![My Tickets tablet](../../artifacts/lab-02/screenshots/my-tickets/tablet.png)

![My Tickets mobile](../../artifacts/lab-02/screenshots/my-tickets/mobile.png)

![Ticket Detail desktop](../../artifacts/lab-02/screenshots/ticket-detail/desktop.png)

![Ticket Detail tablet](../../artifacts/lab-02/screenshots/ticket-detail/tablet.png)

![Ticket Detail mobile](../../artifacts/lab-02/screenshots/ticket-detail/mobile.png)

All 12 checklist items pass, enforced by the automated RESP-01 responsive assertions (no
horizontal scroll at any viewport) and STYLE-01 token tests. Full per-state screen coverage is
in [visual-inspection.md §3](visual-inspection.md).