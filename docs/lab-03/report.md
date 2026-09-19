# Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens

**Project:** TokTickIT — IT service desk (CPE 334, Labs 1–4)
**Lab 3 scope:** User model & roles (Requester / IT Staff / Administrator), Authentication UI,
IT Staff Ticket Queue + Ticket Detail operations, Administrator User Management, Zen Green
responsive UI
**Author:** อชิรญา อินตา (Achiraya Intha) — 67070505229 — GitHub: [@Achikan](https://github.com/Achikan)
**Peer reviewer:** ธนากร พหุลรัตน์ (Thanakorn Phahulrat) — 67070505217 — GitHub: [@il0lk3](https://github.com/il0lk3)
**Repository:** https://github.com/Achikan/TokTickIT

All documentation lives in `docs/lab-03/` of the submitted repository (built on
`lab3-staging`; the final release PR to `main` is merged after peer approval). Screenshots are
readable at normal zoom and are embedded below with their source paths.

---

## Answer Part 1: Git Use with Engineering Workflow

**Evidence: commit history in the final branch showing feature branches merged into `lab3-staging` then `main`.**

The same workflow as in Lab 2, applied to the Sprint 3 issues: `feature/<n>-<slug>` branch →
peer review on a Pull Request → reviewer approves → merge into `lab3-staging` → final release
PR `lab3-staging` → `main`. All Lab 3 issues **#16–#25** are closed (Kanban Done), every feature
PR was reviewed and approved by my partner before merge, and I reviewed my partner's Sprint 3
PRs in `il0lk3/TokTickIT` in return (two-way peer review).

| Item | Evidence |
|---|---|
| Commit history (feature → staging → main graph) | `artifacts/lab-03/report-evidence/part-1-git-evidence/01-commit-history.png` |
| PR review record (all Lab 3 PRs reviewed + approved, 2-way) | `artifacts/lab-03/report-evidence/part-1-git-evidence/05-pr-review-table.png` |
| Peer reviews I gave on my partner's Sprint 3 PRs | `artifacts/lab-03/report-evidence/part-1-git-evidence/05b-reviewed-partner-prs.png` |
| GitHub Issues (all closed = Kanban Done) | `artifacts/lab-03/report-evidence/part-1-git-evidence/06-issues-done.png` |
| GitHub Project board — all cards in Done | `artifacts/lab-03/report-evidence/part-1-git-evidence/kanban-done.png` |
| Rendered reviewer.md | [docs/lab-03/reviewer.md](reviewer.md) |
| README | [README.md](../../README.md) |
| .gitignore | [.gitignore](../../.gitignore) |
| Directory structure in the IDE | `artifacts/lab-03/report-evidence/part-1-git-evidence/02-directory-structure.png` |
| README content | `artifacts/lab-03/report-evidence/part-1-git-evidence/03-readme.png` |
| .gitignore content | `artifacts/lab-03/report-evidence/part-1-git-evidence/04-gitignore.png` |

**PR list (all written by me, reviewed by @il0lk3, merged into `lab3-staging`):**

| PR | Branch → base | Title | Verdict |
|---|---|---|---|
| #49 | `feature/16-sprint-3-contract` → `lab3-staging` | Issue 16: Sprint 3 Engineering Contract (spec DD) | APPROVED |
| #50 | `feature/17-database-migration-user-model` → `lab3-staging` | Issue 17: Database Migration & User Model | APPROVED |
| #51 | `feature/18-auth-api` → `lab3-staging` | Issue 18: Authentication & Authorization API | APPROVED |
| #52 | `feature/19-auth-ui` → `lab3-staging` | Issue 19: Login & Authentication UI | APPROVED |
| #53 | `feature/20-requester-regression` → `lab3-staging` | feat(Issue 20): requester regression — auth identity, public comments & resolution indication | APPROVED |
| #54 | `feature/21-staff-ticket-queue` → `lab3-staging` | feat(Issue 21): IT Staff Ticket Queue — search, filters, sorting, pagination | APPROVED |
| #56 | `feature/22-staff-ticket-detail` → `lab3-staging` | feat(Issue 22): IT Staff Ticket Detail — ownership, IT priority, status, comments & notes | APPROVED |
| #57 | `feature/23-admin-user-management` → `lab3-staging` | feat(Issue 23): Administrator User Management | APPROVED |
| #58 | `feature/24-e2e-responsive-accessibility` → `lab3-staging` | feat(Issue 24): E2E testing, responsive & accessibility | APPROVED |
| #59 | `feature/25-final-review-screenshots-release` → `lab3-staging` | feat(Issue 25): Final review, screenshots & release integration | Under review (@il0lk3) |

(PR #55 was the first Issue 22 merge and was superseded on the same day by PR #56, which
addressed the final review notes; the review record shows the approved PR #56.)

> Lab 3 GitHub Issues are **#16–#25** — all *Closed* (Done) as shown in
> `part-1-git-evidence/06-issues-done.png` and `kanban-done.png`.

![Commit history](../../artifacts/lab-03/report-evidence/part-1-git-evidence/01-commit-history.png)

![PR review table](../../artifacts/lab-03/report-evidence/part-1-git-evidence/05-pr-review-table.png)

![Peer reviews I gave on partner's Sprint 3 PRs](../../artifacts/lab-03/report-evidence/part-1-git-evidence/05b-reviewed-partner-prs.png)

![Issues all closed](../../artifacts/lab-03/report-evidence/part-1-git-evidence/06-issues-done.png)

![Kanban board — all Issues in Done](../../artifacts/lab-03/report-evidence/part-1-git-evidence/kanban-done.png)

![Directory structure](../../artifacts/lab-03/report-evidence/part-1-git-evidence/02-directory-structure.png)

![README](../../artifacts/lab-03/report-evidence/part-1-git-evidence/03-readme.png)

![.gitignore](../../artifacts/lab-03/report-evidence/part-1-git-evidence/04-gitignore.png)

---

## Answer Part 2: Spec DD

**Linked rendered copy:** [docs/lab-03/specification.md](specification.md)

The Lab 3 specification is the engineering contract written **before** any implementation:
PR **#49** (Issue 16: Sprint 3 Engineering Contract) merged on **2026-09-17 13:16 UTC**, and
the first implementation PR **#50** (Issue 17: Database Migration & User Model) merged later on
**2026-09-17 14:37 UTC**. The contract is split into three documents:

- [specification.md](specification.md) — numbered requirements, business rules, the
  authorization rule, acceptance criteria, migration decisions (incl. the explicit
  `SUBMITTED → NEW` status-migration rule from the Lab 2 review), and the Product Definition
  of Done;
- [api-spec.md](api-spec.md) — endpoint contracts, authentication mechanism, request/response
  shapes, statuses, authorization, and safe errors;
- [ui-spec.md](ui-spec.md) — screen structure, modes, controls, feedback, role behavior,
  responsive rules, and the visual checklist.

The numbered engineering contract includes:

- **Functional Requirements (FR-01 … FR-24)** covering the User model and roles, session
  authentication, password change, requester regression requirements (public comments and
  resolution indication), IT Staff queue and detail operations, and Administrator user
  management.
- **Business Rules (BR-01 … BR-14)** including one role per User, ownership
  (one primary Ticket Owner), the authorization matrix rule (Requester is forbidden from
  internal-note/ownership/status endpoints without exposing note content), and the permitted
  status-transition matrix.
- **Acceptance Criteria (AC-01 … AC-24)**, each mapped to a planned test in `tests.md`.
- **Definition of Done** requiring all scope implemented, all ACs satisfied, all planned
  automated tests passing from documented commands, and no required test skipped.

The snapshot below records the exact file history and PR merge timestamps:

![Spec existed before implementation PRs](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/01-spec-before-impl.png)

---

## Answer Part 3: Test DD and Traceability

**Linked rendered copy:** [docs/lab-03/tests.md](tests.md)

The planned-test table (Test DD) was written up front from `specification.md`; every Acceptance
Criterion and Business Rule has a planned test whose name embeds the relevant tags (e.g.
`PWD-01, AC-06, FR-06`). Test file paths in `tests.md` match the real suite:
`server/tests/lab-03/*.api.test.ts`, `client/tests/lab-03/*.test.tsx`,
`e2e/lab-03/authentication.spec.ts`, `requester-flow.spec.ts`, `staff-ticket-flow.spec.ts`,
`user-administration.spec.ts`, `responsive.spec.ts`, and `accessibility.spec.ts`.

### Final pass status (from `main`-ready `lab3-staging`)

| Suite | Count | Result |
|---|---|---|
| Server (unit + API) — `cd server && npm test` | 176 (16 files) | ✅ 176 passed + 2 todo |
| Client (UI + style) — `cd client && npm test` | 93 | ✅ 93/93 |
| E2E + responsive + accessibility — `npm run test:e2e` | 25 | ✅ 25/25 (E2E-01..05, RESP-01 ×5, A11Y-01 ×5) |

Complete passing output, captured from the current implementation:

![Server tests — 176 passed](../../artifacts/lab-03/report-evidence/part-3-test-evidence/01-server-tests-pass.png)

![Client tests — 93/93](../../artifacts/lab-03/report-evidence/part-3-test-evidence/02-client-tests-pass.png)

![E2E + responsive + accessibility — 25/25](../../artifacts/lab-03/report-evidence/part-3-test-evidence/03-e2e-tests-pass.png)

(The rubric asks for output *from main*; the same code and counts are on `main` after the
release PR merge — output above was generated from the Lab 3 release branch.)

---

## Answer Part 4: AI Use with Reflection

**Linked rendered copy:** [docs/lab-03/ai-use.md](ai-use.md)

- **LLM/agent used:** Anthropic Claude (`claude-class`) accessed as a coding agent through
  [opencode](https://opencode.ai) — an agentic CLI that reads, edits, runs and verifies code in
  this repository, used for Spec-Driven Development (Appendix A workflow) and TDD.
- `ai-use.md` records **9 key prompts** I actually gave, each with what I did with the result
  and how I refined it — including prompts that exposed gaps (e.g. the `SUBMITTED → NEW`
  status-migration review from PR #34, and the privilege-behavior check that requester-only
  endpoints stay isolated), not only polished steps.

**My Reflection:** the specification agent produced a strong draft but repeatedly drifted from
what the lab sheet actually asked (rules are "examples of mandatory rules, not a complete
specification"), so I treated `Lab_3_sheet` §8–§14 as the source of truth and verified every
generated requirement, authorization rule, and acceptance criterion myself before
implementation. The coding agent is fast at plumbing, but the product decisions — the
single-role rule, the ownership/status matrix, minimising the Administrator screen, and which
states need explicit UI feedback — were things I had to reason about and verify against the
rubric. I kept the habit from Lab 2: ask the right questions myself, then use the agent to
implement and close the gaps I identified.

---

## Answer Part 5: Working Login and Password Change UI

Evidence below demonstrates (in order): the login form pre-filled, client-side validation,
safe failure with invalid credentials, inactive-account handling, the busy state, the mandatory
first-login password change, weak-password policy rejection, the authenticated shell showing
the signed-in user/role, logout, and direct API access blocked after logout (401).

![Login — valid form (pre-filled)](../../artifacts/lab-03/report-evidence/part-5-auth/05-login-valid-form.png)

![Login — client-side validation (empty submit)](../../artifacts/lab-03/report-evidence/part-5-auth/05-login-field-errors.png)

![Login — safe failure (invalid credentials)](../../artifacts/lab-03/report-evidence/part-5-auth/05-login-invalid.png)

![Login — inactive account handling](../../artifacts/lab-03/report-evidence/part-5-auth/05-login-inactive.png)

![Login — busy state ("Signing in…")](../../artifacts/lab-03/report-evidence/part-5-auth/05-login-busy.png)

![Mandatory first-login password change](../../artifacts/lab-03/report-evidence/part-5-auth/05-change-password-mandatory.png)

![Password policy — weak new password rejected](../../artifacts/lab-03/report-evidence/part-5-auth/05-change-password-weak.png)

![Authenticated shell — user + role + role navigation](../../artifacts/lab-03/report-evidence/part-5-auth/05-shell-authenticated.png)

![After logout — login only](../../artifacts/lab-03/report-evidence/part-5-auth/05-post-logout-login.png)

![API after logout — 401 (no session cookie)](../../artifacts/lab-03/report-evidence/part-5-auth/05-api-401-after-logout.png)

---

## Answer Part 6: Working IT Staff Ticket Queue UI

Evidence below demonstrates realistic queue data, search, status filter, IT-Priority sorting,
pagination (>10 rows), the open-detail action, and empty / no-results / failure feedback.

![Queue — realistic data, ownership + status/priority badges](../../artifacts/lab-03/report-evidence/part-6-queue/06-queue-full.png)

![Queue — search by ticket content](../../artifacts/lab-03/report-evidence/part-6-queue/06-queue-search.png)

![Queue — status filter (RESOLVED)](../../artifacts/lab-03/report-evidence/part-6-queue/06-queue-filter-status.png)

![Queue — sort by IT Priority](../../artifacts/lab-03/report-evidence/part-6-queue/06-queue-sort.png)

![Queue — no-results state](../../artifacts/lab-03/report-evidence/part-6-queue/06-queue-empty-no-results.png)

![Queue — pagination (multi-page results)](../../artifacts/lab-03/report-evidence/part-6-queue/06-queue-pagination.png)

![Queue — failure feedback (network error)](../../artifacts/lab-03/report-evidence/part-6-queue/06-queue-failure.png)

---

## Answer Part 7: Working IT Staff Ticket Detail UI

Evidence below demonstrates seeded detail with Public Comment + Internal Note, claim,
reassign, IT Priority, permitted status transitions (NEW → OPEN → IN_PROGRESS), Public
Comments vs Internal Notes, requester resolution indication + Attachment continuity,
Attachment presentation, and direct API authorization evidence (a total of 10 captures).

![Detail — seeded ticket (NEW, unassigned, comment + note)](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-seeded.png)

![Detail — reading a fresh ticket](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-reading.png)

![Detail — claim (FR-14)](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-claim.png)

![Detail — reassign owner](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-reassign.png)

![Detail — IT Priority HIGH (FR-15)](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-priority.png)

![Detail — permitted status NEW → OPEN → IN_PROGRESS (FR-16)](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-status-in-progress.png)

![Detail — Public Comment + Internal Note appended](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-comments-notes.png)

![Detail — requester resolution indication](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-requester-resolved.png)

![Detail — Attachment continuity (Lab 2 attachments carried over)](../../artifacts/lab-03/report-evidence/part-7-detail/07-detail-attachments.png)

![API authorization — Administrator-only endpoint rejected for IT_STAFF (403)](../../artifacts/lab-03/report-evidence/part-7-detail/07-staff-api-403-admin.png)

---

## Answer Part 8: Working Administrator User Management UI

Evidence below demonstrates the minimalist User Management screen: the list (Name, Email, Role,
Status, Edit), search by name, optional role filtering, create user with a permitted role and
initial password, duplicate-email and weak-password validation, editing, setting a new initial
password + required change at next login, the two Administrator safety rules, forbidden access
for non-Administrators (shell nav + API 403), and responsive Zen Green presentation.

![User list](../../artifacts/lab-03/report-evidence/part-8-users/08-users-list.png)

![Search by name](../../artifacts/lab-03/report-evidence/part-8-users/08-users-search.png)

![Role filter](../../artifacts/lab-03/report-evidence/part-8-users/08-users-role-filter.png)

![Create user — form](../../artifacts/lab-03/report-evidence/part-8-users/08-users-create-form.png)

![Create user — success + initial password notice](../../artifacts/lab-03/report-evidence/part-8-users/08-users-create-success.png)

![Create user — duplicate email rejected](../../artifacts/lab-03/report-evidence/part-8-users/08-users-create-duplicate-email.png)

![Create user — weak initial password rejected](../../artifacts/lab-03/report-evidence/part-8-users/08-users-create-weak-password.png)

![Edit user — updated](../../artifacts/lab-03/report-evidence/part-8-users/08-users-edit-updated.png)

![Set new initial password — form](../../artifacts/lab-03/report-evidence/part-8-users/08-users-set-initial-password-form.png)

![Set new initial password — invalid value rejected](../../artifacts/lab-03/report-evidence/part-8-users/08-users-set-password-invalid.png)

![Set new initial password — success](../../artifacts/lab-03/report-evidence/part-8-users/08-users-set-initial-password-success.png)

![Required password change at next login](../../artifacts/lab-03/report-evidence/part-8-users/08-users-required-change-next-login.png)

![Safety rule — last active Administrator cannot be deactivated](../../artifacts/lab-03/report-evidence/part-8-users/08-users-last-admin-blocked.png)

![Safety rule — self-deactivation prevented](../../artifacts/lab-03/report-evidence/part-8-users/08-users-self-deactivation-blocked.png)

![Non-Administrator shell — no User Management navigation](../../artifacts/lab-03/report-evidence/part-8-users/08-staff-shell-role-nav.png)

![API authorization — User Management forbidden for IT_STAFF (403)](../../artifacts/lab-03/report-evidence/part-8-users/08-users-api-403-for-staff.png)

---

## Answer Part 9: Zen Green UI and Responsive Evidence

**Linked rendered copy:** [docs/lab-03/ui-spec.md](ui-spec.md)

The completed **visual checklist** is [docs/lab-03/visual-inspection.md](visual-inspection.md)
— checked against the code, the ui-spec §14 checklist (tokens/colors, editable vs read-only
fields, validation placement, role navigation, Comments vs Notes distinction, badges,
busy/disabled states) and the RESP-01 Playwright spec, with every item ✅.

The 27 committed screenshots below cover all major Lab 3 screens at **desktop 1280×900,
tablet 820×900, and mobile 390×844** and are readable without zoom:

### Authentication

![Login — desktop](../../artifacts/lab-03/screenshots/authentication/login-desktop.png)
![Login — tablet](../../artifacts/lab-03/screenshots/authentication/login-tablet.png)
![Login — mobile](../../artifacts/lab-03/screenshots/authentication/login-mobile.png)

![Change password — desktop](../../artifacts/lab-03/screenshots/authentication/change-password-desktop.png)
![Change password — tablet](../../artifacts/lab-03/screenshots/authentication/change-password-tablet.png)
![Change password — mobile](../../artifacts/lab-03/screenshots/authentication/change-password-mobile.png)

![Shell — desktop](../../artifacts/lab-03/screenshots/authentication/shell-desktop.png)
![Shell — tablet](../../artifacts/lab-03/screenshots/authentication/shell-tablet.png)
![Shell — mobile](../../artifacts/lab-03/screenshots/authentication/shell-mobile.png)

### IT Staff Ticket Queue

![Queue — desktop](../../artifacts/lab-03/screenshots/staff-queue/queue-desktop.png)
![Queue — tablet](../../artifacts/lab-03/screenshots/staff-queue/queue-tablet.png)
![Queue — mobile](../../artifacts/lab-03/screenshots/staff-queue/queue-mobile.png)

### IT Staff Ticket Detail

![Ticket detail (seeded) — desktop](../../artifacts/lab-03/screenshots/staff-ticket-detail/seeded-details-desktop.png)
![Ticket detail (seeded) — tablet](../../artifacts/lab-03/screenshots/staff-ticket-detail/seeded-details-tablet.png)
![Ticket detail (seeded) — mobile](../../artifacts/lab-03/screenshots/staff-ticket-detail/seeded-details-mobile.png)

![Ticket detail (operations) — desktop](../../artifacts/lab-03/screenshots/staff-ticket-detail/operations-desktop.png)
![Ticket detail (operations) — tablet](../../artifacts/lab-03/screenshots/staff-ticket-detail/operations-tablet.png)
![Ticket detail (operations) — mobile](../../artifacts/lab-03/screenshots/staff-ticket-detail/operations-mobile.png)

### User Management

![User list — desktop](../../artifacts/lab-03/screenshots/user-management/list-desktop.png)
![User list — tablet](../../artifacts/lab-03/screenshots/user-management/list-tablet.png)
![User list — mobile](../../artifacts/lab-03/screenshots/user-management/list-mobile.png)

![Create user — desktop](../../artifacts/lab-03/screenshots/user-management/create-desktop.png)
![Create user — tablet](../../artifacts/lab-03/screenshots/user-management/create-tablet.png)
![Create user — mobile](../../artifacts/lab-03/screenshots/user-management/create-mobile.png)

![Set initial password — desktop](../../artifacts/lab-03/screenshots/user-management/edit-set-initial-password-desktop.png)
![Set initial password — tablet](../../artifacts/lab-03/screenshots/user-management/edit-set-initial-password-tablet.png)
![Set initial password — mobile](../../artifacts/lab-03/screenshots/user-management/edit-set-initial-password-mobile.png)