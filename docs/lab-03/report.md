# Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens

**Project:** TokTickIT — IT service desk (CPE 334, Labs 1–4)
**Section:** 1
**Lab 3 scope:** User model & roles (Requester / IT Staff / Administrator), Authentication UI,
IT Staff Ticket Queue + Ticket Detail operations, Administrator User Management, Zen Green
responsive UI
**Author:** อชิรญา อินตา (Achiraya Intha) — 67070505229 — GitHub: [@Achikan](https://github.com/Achikan)
**Peer reviewer:** ธนากร พหุลรัตน์ (Thanakorn Phahulrat) — 67070505217 — GitHub: [@il0lk3](https://github.com/il0lk3)
**Repository:** https://github.com/Achikan/TokTickIT
**GitHub Project board:** https://github.com/users/Achikan/projects (Kanban — all Lab 3 Issues in Done, see `kanban-done.png`)

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
| **Rendered `reviewer.md` (in this report)** | `artifacts/lab-03/report-evidence/part-1-git-evidence/07-rendered-reviewer-md-p1.png` and `-p2.png` — see the two images at the end of this part |
| README | [README.md](https://github.com/Achikan/TokTickIT/blob/main/README.md) |
| .gitignore | [.gitignore](https://github.com/Achikan/TokTickIT/blob/main/.gitignore) |
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
| #59 | `feature/25-final-review-screenshots-release` → `lab3-staging` | feat(Issue 25): Final review, screenshots & release integration | APPROVED |
| #60 | `feature/25-final-review-screenshots-release` → `lab3-staging` | docs(Issue 25): Lab 3 sheet checklist gap fixes | APPROVED |

(PR #55 was the first Issue 22 merge and was superseded on the same day by PR #56, which
addressed the final review notes; the review record shows the approved PR #56. PR #60 is the
second Issue 25 staging merge carrying the sheet-driven doc/evidence fixes.)

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

### Rendered `reviewer.md`

The sheet asks for the reviewer record itself, not only a PR screenshot, so
`docs/lab-03/reviewer.md` is rendered into this report below. It is the authoritative
record: both partners, both directions of the review, every Lab 3 PR, the representative
review comments and the responses, and the final verdicts. The black header band on each
page carries the source path and the commit the render came from
(`node scripts/render-docs.mjs`).

Page 1 of 2 — author/reviewer, the two-way peer-review statement, the ten Lab 3 PRs authored
and reviewed by the partner, and the first review comments:

![Rendered reviewer.md — page 1 of 2](../../artifacts/lab-03/report-evidence/part-1-git-evidence/07-rendered-reviewer-md-p1.png)

Page 2 of 2 — the remaining review responses, the five partner PRs reviewed in
`il0lk3/TokTickIT`, and the outcome:

![Rendered reviewer.md — page 2 of 2](../../artifacts/lab-03/report-evidence/part-1-git-evidence/07-rendered-reviewer-md-p2.png)

---

## Answer Part 2: Spec DD

**Linked rendered copy:** [docs/lab-03/specification.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/specification.md)

The Lab 3 specification is the engineering contract written **before** any implementation.
All four contract files were added in a single commit and released before the first line of
Lab 3 code existed. The timestamps below are read from `git log --date=iso` and the GitHub
REST API, and the captures are of the live github.com pages
(`node scripts/evidence-spec-order.mjs`, raw output in
`artifacts/lab-03/report-evidence/part-2-spec-evidence/01-spec-order.txt`):

| Event | Timestamp (UTC) | Source |
|---|---|---|
| Contract committed — `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` | **2026-09-17 12:42:24** | `git log --diff-filter=A` → `716684e4` on `feature/16-sprint-3-contract` |
| PR **#49** merged into `lab3-staging` (Issue 16: Sprint 3 Engineering Contract) | **2026-09-17 13:16:13** | `gh api repos/Achikan/TokTickIT/pulls/49` (33m 49s after the commit) |
| First implementation commit — database migration & User model | **2026-09-17 13:45:17** | `git log --ancestry-path 716684e4..main` → `90abb7fa` (29m 4s after the merge) |
| PR **#50** opened (Issue 17: Database Migration & User Model) | **2026-09-17 13:45:36** | `gh api repos/Achikan/TokTickIT/pulls/50` |
| PR **#50** merged | 2026-09-17 14:37:50 | `gh api repos/Achikan/TokTickIT/pulls/50` |

**Contract → first implementation commit: 1h 2m 53s.** A scan of every pull request in the
repository through the GitHub API confirms that **0** Lab 3 implementation PRs (#50 and up)
were opened before PR #49 was merged — the count is measured, not asserted. The contract is
split into three documents:

- [specification.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/specification.md) — numbered requirements, business rules, the
  authorization rule, acceptance criteria, migration decisions (incl. the explicit
  `SUBMITTED → NEW` status-migration rule from the Lab 2 review), and the Product Definition
  of Done;
- [api-spec.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/api-spec.md) — endpoint contracts, authentication mechanism, request/response
  shapes, statuses, authorization, and safe errors;
- [ui-spec.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/ui-spec.md) — screen structure, modes, controls, feedback, role behavior,
  responsive rules, and the visual checklist.

The numbered engineering contract includes:

- **Functional Requirements (FR-01 … FR-23)** covering the User model and roles, session
  authentication, password change, requester regression requirements (public comments and
  resolution indication), IT Staff queue and detail operations, and Administrator user
  management.
- **Business Rules (BR-01 … BR-21)** including one role per User, ownership
  (one primary Ticket Owner), the authorization matrix rule (Requester is forbidden from
  internal-note/ownership/status endpoints without exposing note content), and the permitted
  status-transition matrix.
- **Acceptance Criteria (AC-01 … AC-24)**, each mapped to a planned test in `tests.md`.
- **Definition of Done** requiring all scope implemented, all ACs satisfied, all planned
  automated tests passing from documented commands, and no required test skipped.

### Ordering evidence

The timeline, built from the timestamps above:

![Spec existed before implementation PRs](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/01-spec-before-impl.png)

**Every Sprint 3 pull request in one capture** — the raw `git log` line, the
`createdAt`/`mergedAt` of each PR from the GitHub API, and the three computed intervals
(`node scripts/evidence-timeline.mjs`; raw output in
`artifacts/lab-03/evidence/spec-before-code.txt`):

![Contract commit, all PR timestamps and the computed intervals](../../artifacts/lab-03/evidence/spec-before-code.png)

| PR | Created (UTC) | Merged (UTC) | Role in the ordering |
|---|---|---|---|
| **#49** Issue 16: Sprint 3 Engineering Contract | 2026-09-17 12:42:44 | **2026-09-17 13:16:13** | **Specification DD — merged before any implementation PR existed** |
| #50 Issue 17: Database Migration & User Model | 2026-09-17 13:45:36 | 2026-09-17 14:37:50 | First implementation PR (29m 23s after the #49 merge) |
| #51 Issue 18: Authentication & Authorization API | 2026-09-17 15:33:48 | 2026-09-17 16:38:27 | Implementation |
| #52 Issue 19: Login & Authentication UI | 2026-09-17 16:49:06 | 2026-09-17 17:15:41 | Implementation |
| #53 Issue 20: requester regression | 2026-09-18 07:07:22 | 2026-09-18 07:45:39 | Implementation |
| #54 Issue 21: IT Staff Ticket Queue | 2026-09-18 08:03:47 | 2026-09-18 08:43:45 | Implementation |
| #55 Issue 22: IT Staff Ticket Detail (first attempt) | 2026-09-18 09:05:35 | **never merged** | Superseded the same day by #56 |
| #56 Issue 22: IT Staff Ticket Detail (supersedes #55) | 2026-09-18 12:05:50 | 2026-09-18 12:08:01 | Implementation — the merge that actually shipped Issue 22 |
| #57 Issue 23: Administrator User Management | 2026-09-19 06:57:59 | 2026-09-19 07:56:24 | Implementation |
| #58 Issue 24: E2E testing, responsive & accessibility | 2026-09-19 09:04:14 | 2026-09-19 10:06:46 | Implementation |
| #59 Issue 25: Final review, screenshots & release integration | 2026-09-19 10:31:10 | 2026-09-19 11:05:18 | Integration into `lab3-staging` |
| #60 Issue 25: sheet checklist gap fixes | 2026-09-29 14:33:05 | 2026-09-29 14:45:47 | Documentation only |
| #62 Issue 25: real unit + style tests, sheet-format test plan | 2026-09-29 16:59:12 | 2026-09-29 17:15:16 | Test coverage only |
| #63 Release Lab 3 — Sprint 3 | 2026-09-29 17:18:11 | 2026-09-29 17:55:23 | Release `lab3-staging` → `main` |

Three points are stated explicitly so the record is accurate: **PR #55 was never merged** (the
GitHub API returns an empty `merged_at`; #56 is the merge that shipped Issue 22); PRs #60, #62 and
#63 are documentation, test and release work that comes after the features by design; and the
reviewer requested changes on **#49 itself** at 13:05:43 UTC, before merging it at 13:16:13, so the
specification passed review while no Lab 3 code existed yet. The full write-up, with the commands
used, is [docs/lab-03/timeline-evidence.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/timeline-evidence.md).

**The contract commit on GitHub** — `716684e4`, authored 2026-09-17 12:42:24 UTC. The green
banner is added by the evidence script and quotes the absolute timestamp from
`git log --date=iso`, because the GitHub UI itself only renders "2 weeks ago":

![Contract commit 716684e4](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/06-github-spec-commit.png)

**PR #49 — the specification release.** Opened 12:42:44 UTC, merged 13:16:13 UTC. The
timeline underneath is the real GitHub conversation, including the reviewer's
"requested changes" at 13:05:43 UTC that forced the `SUBMITTED → NEW` status-migration
correction recorded in `specification.md`:

![PR #49 — Sprint 3 Engineering Contract](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/04-github-pr49.png)

**PR #50 — the first implementation PR.** Opened 13:45:36 UTC, i.e. **29 minutes after PR #49
was merged** and only 19 seconds after the first implementation commit:

![PR #50 — Database Migration & User Model](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/05-github-pr50.png)

### The submitted PDF

`npm run pdf:lab3` builds `docs/lab-03/report_lab03_67070505229.pdf` from this file
(`scripts/build-report.mjs` → pandoc → Chromium print → `scripts/check-report-pdf.py`). The build is
deterministic and self-checking; the checker fails the build rather than shipping a bad PDF.

| Property of the submitted PDF | Measured value |
|---|---|
| Format | A4 portrait, cover page + clickable contents page, then Answer Parts 1–9 in order |
| Pages | **72** (the previous build was 102) |
| Size | **9.56 MB** (the previous build was 17.1 MB) |
| Images per page | 2–3 on evidence pages; 8 pages carry one tall sliced capture each (pages 10–13, 26, 29, 41, 60) |
| Figures | 131 sources → 146 placements (very tall stitched captures are sliced so each slice still prints at A4 width) |
| Legibility | worst effective print resolution **119 dpi** (phone captures are 390 px wide, so they print ~75 mm wide instead of being upscaled); 115 of 131 sources are ≥1000 px wide |
| Page breaks | no figure, table row or heading is split across pages (`break-inside: avoid`) |
| Links | 27 internal (cover → part, contents → part) + 18 external `https://` links, all clickable |
| Machine checks | "Answer Part 1…9" present and in order, cover name + student ID present, no blank pages, ≤ 10 MB |

Image budget per figure class (print height cap): tall ≤ 115 mm, large ≤ 90 mm, medium ≤ 70 mm,
small ≤ 50 mm, page width 186 mm. Every figure is captioned with its `Figure N — …` label taken
from the markdown alt text, and the running footer carries `Page N of M`.

### Rendered specification documents

The contract itself, rendered into this report rather than only linked.

`specification.md` — numbered requirements, business rules, the authorization rule,
acceptance criteria and the Definition of Done (5 pages):

![Rendered specification.md — page 1](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/02-rendered-specification-md-p1.png)

![Rendered specification.md — page 2](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/02-rendered-specification-md-p2.png)

![Rendered specification.md — page 3](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/02-rendered-specification-md-p3.png)

![Rendered specification.md — page 4](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/02-rendered-specification-md-p4.png)

![Rendered specification.md — page 5](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/02-rendered-specification-md-p5.png)

`api-spec.md` — endpoint contracts, authentication mechanism, request/response shapes,
statuses, authorization and safe errors (5 pages):

![Rendered api-spec.md — page 1](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/03-rendered-api-spec-md-p1.png)

![Rendered api-spec.md — page 2](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/03-rendered-api-spec-md-p2.png)

![Rendered api-spec.md — page 3](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/03-rendered-api-spec-md-p3.png)

![Rendered api-spec.md — page 4](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/03-rendered-api-spec-md-p4.png)

![Rendered api-spec.md — page 5](../../artifacts/lab-03/report-evidence/part-2-spec-evidence/03-rendered-api-spec-md-p5.png)

---

## Answer Part 3: Test DD and Traceability

**Linked rendered copy:** [docs/lab-03/tests.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/tests.md)

The planned-test table (Test DD) was written up front from `specification.md`; every Acceptance
Criterion and Business Rule has a planned test whose name embeds the relevant tags (e.g.
`PWD-01, AC-06, FR-06`). Test file paths in `tests.md` match the real suite:
`server/tests/lab-03/*.api.test.ts`, `client/tests/lab-03/*.test.tsx`,
`e2e/lab-03/authentication.spec.ts`, `requester-flow.spec.ts`, `staff-ticket-flow.spec.ts`,
`user-administration.spec.ts`, `responsive.spec.ts`, and `accessibility.spec.ts`.

### Final pass status — provenance of these captures

The captures below are real terminal output from the suites **as they stand on the
documentation branch `docs/lab3-test-evidence`, at base commit `e8c75b6` plus the Part 6 and
Part 9 fixes listed in `artifacts/lab-03/test-output/00-main-commit.txt`** — the working tree
that this report describes. Every capture repeats that provenance in its own header
(branch, base commit, changed files), so the numbers can always be traced to the code they
came from. Nothing in this section was typed by hand.

The earlier capture taken on `main` at `d3e2be4` (*Merge pull request #63 from
Achikan/lab3-staging*, 2026-09-30 — server 195, client 98, e2e 25) is **superseded**: the fixes
below added `GET /api/staff/assignees` (+4 API tests), the owner `<select>`, compact timestamps,
the fixed queue table, clipping assertions at a fourth viewport (+3 client tests, +2 E2E tests),
and the machine-verified visual checklist. It is kept only as the "Earlier capture
(superseded)" line inside `00-main-commit.txt`.

| Suite | Command | Result |
|---|---|---|
| Server (unit + API) — `cd server && npm test` | 199 (20 files) | ✅ 199/199 — 0 failed, 0 skipped |
| Client (UI + style) — `cd client && npm test` | 101 (14 files) | ✅ 101/101 — 0 failed, 0 skipped |
| E2E + responsive + accessibility — `npm run test:e2e` | 38 | ✅ 38/38 — 0 failed, 0 skipped |
| **Total** | 338 | ✅ **338 passed / 0 failed / 0 skipped** |

Pre-flight check: searching `server/tests`, `client/tests` and `e2e` for `test.skip`,
`it.skip`, `describe.skip`, `.only(`, `xit(`, `xdescribe(` and `.todo(` returns **0
matches**, so nothing is skipped or left as a placeholder.

#### Full run — all suites

![Full test summary — server 199, client 101, e2e 38](../../artifacts/lab-03/test-output/png/00-full-summary.png)

#### By requirement category

| Category | Pass | Fail | Skip | Files |
|---|---|---|---|---|
| Unit — `*.unit.test.ts` | ✅ 17 | 0 | 0 | 4 |
| API / integration | ✅ 110 | 0 | 0 | 5 |
| Authorization / role gates | ✅ 12 | 0 | 0 | 1 |
| Migration / regression (Lab 2 suites) | ✅ 55 | 0 | 0 | 7 |
| UI component + UI style | ✅ 56 | 0 | 0 | 7 |
| E2E + responsive + accessibility | ✅ 38 | 0 | 0 | 6 specs |

**Unit — 17/17**

![Unit tests — 17 passed](../../artifacts/lab-03/test-output/png/01-unit.png)

**API / integration — 110/110**

![API tests — 110 passed](../../artifacts/lab-03/test-output/png/02-api.png)

**Authorization — 12/12**

![Authorization tests — 12 passed](../../artifacts/lab-03/test-output/png/03-authorization.png)

**Migration / regression — 55/55**

![Regression tests — 55 passed](../../artifacts/lab-03/test-output/png/04-regression.png)

**UI component + style — 56/56**

![UI tests — 56 passed](../../artifacts/lab-03/test-output/png/05-ui-component.png)

**E2E + responsive + accessibility — 38/38**

![E2E tests — 38 passed](../../artifacts/lab-03/test-output/png/06-e2e.png)

#### How the totals reconcile

The server and client totals include the earlier labs, because Lab 3 must not regress
them. Server 199 = Lab 3 **146** (17 unit + 110 API + 12 authorization + 7 migration) +
Lab 2 **48** + Lab 1 **5**. Client 101 = Lab 3 **56** + Lab 2 **42** + Lab 1 **3**. E2E runs
against `e2e/lab-03` only, where **17 tests** are defined in 6 spec files and Playwright
executes **38**: every spec on the desktop 1280 project (10 tests), plus RESP-01 re-run at
narrow-desktop 1024, tablet 820 and mobile 390 (7 tests × 3 extra projects). Full breakdown in [`tests.md` §6.2](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/tests.md).

### Rendered `tests.md` — Test DD and traceability

The test plan itself, rendered into this report: the strategy, all 69 planned-test rows with
their real file paths and Final status, the acceptance-criterion traceability matrix, the
migration/regression evidence, the commands, and the final status with the per-category
breakdown (6 pages).

![Rendered tests.md — page 1](../../artifacts/lab-03/report-evidence/part-3-test-evidence/04-rendered-tests-md-p1.png)

![Rendered tests.md — page 2](../../artifacts/lab-03/report-evidence/part-3-test-evidence/04-rendered-tests-md-p2.png)

![Rendered tests.md — page 3](../../artifacts/lab-03/report-evidence/part-3-test-evidence/04-rendered-tests-md-p3.png)

![Rendered tests.md — page 4](../../artifacts/lab-03/report-evidence/part-3-test-evidence/04-rendered-tests-md-p4.png)

![Rendered tests.md — page 5](../../artifacts/lab-03/report-evidence/part-3-test-evidence/04-rendered-tests-md-p5.png)

![Rendered tests.md — page 6](../../artifacts/lab-03/report-evidence/part-3-test-evidence/04-rendered-tests-md-p6.png)

The untrimmed terminal output is committed as plain text in
[`artifacts/lab-03/test-output/`](https://github.com/Achikan/TokTickIT/tree/main/artifacts/lab-03/test-output);
the PNGs above are renders of those files (`node scripts/render-test-logs.mjs`). For the two
longest logs the render keeps the header, the `main` commit line, every passing test file
and the final `Test Files` / `Tests` / `Duration` block, and states how many per-test lines
were trimmed.

---

## Answer Part 4: AI Use with Reflection

**Linked rendered copy:** [docs/lab-03/ai-use.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/ai-use.md)

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

Evidence below demonstrates (in order): the login form pre-filled, client-side validation
(required fields + invalid email format), safe failure (invalid credentials and network
error), inactive-account handling, the busy state, the mandatory first-login password change,
mismatch rejection, the authenticated shell for each role showing the signed-in user/role,
logout, and direct API access blocked after logout (401).

![Login — valid form (pre-filled)](../../artifacts/lab-03/screenshots/authentication/auth-01-login-form-desktop.png)

![Login — client-side validation (empty submit)](../../artifacts/lab-03/screenshots/authentication/auth-02-required-validation-desktop.png)

![Login — invalid email format rejected](../../artifacts/lab-03/screenshots/authentication/auth-03-invalid-email-format-desktop.png)

![Login — safe failure (invalid credentials)](../../artifacts/lab-03/screenshots/authentication/auth-04-invalid-credentials-desktop.png)

![Login — inactive account handling](../../artifacts/lab-03/screenshots/authentication/auth-05-inactive-account-desktop.png)

![Login — busy state ("Signing in…")](../../artifacts/lab-03/screenshots/authentication/auth-06-submit-busy-desktop.png)

![Login — safe failure on network error (AC-05)](../../artifacts/lab-03/screenshots/authentication/auth-07-safe-failure-desktop.png)

![Mandatory first-login password change](../../artifacts/lab-03/screenshots/authentication/auth-08-mandatory-change-password-desktop.png)

![Password policy — mismatch rejected](../../artifacts/lab-03/screenshots/authentication/auth-09-change-password-mismatch-desktop.png)

![Password updated — authenticated shell](../../artifacts/lab-03/screenshots/authentication/auth-10-password-updated-shell-desktop.png)

![Authenticated shell — Requester role navigation](../../artifacts/lab-03/screenshots/authentication/auth-11-requester-shell-desktop.png)

![Authenticated shell — IT Staff role navigation](../../artifacts/lab-03/screenshots/authentication/auth-12-staff-shell-desktop.png)

![Authenticated shell — Administrator role navigation](../../artifacts/lab-03/screenshots/authentication/auth-13-admin-shell-desktop.png)

![After logout — login only](../../artifacts/lab-03/screenshots/authentication/auth-14-post-logout-login-desktop.png)

![API after logout — 401 (no session cookie)](../../artifacts/lab-03/api-evidence/part-5-auth/05-api-401-after-logout.png)

---

## Answer Part 6: Working IT Staff Ticket Queue UI

Evidence below demonstrates realistic queue data, search, status filter, IT-Priority sorting,
owner filter (unassigned), pagination (>10 rows), loading / empty / no-results / failure
feedback, and the open-detail action. Requester access to the staff queue is forbidden (403).

![Queue — realistic data, ownership + status/priority badges](../../artifacts/lab-03/screenshots/staff-queue/queue-01-queue-full-data-desktop.png)

![Queue — search by ticket content](../../artifacts/lab-03/screenshots/staff-queue/queue-02-search-desktop.png)

![Queue — status filter (RESOLVED)](../../artifacts/lab-03/screenshots/staff-queue/queue-03-filters-applied-desktop.png)

![Queue — sort by IT Priority](../../artifacts/lab-03/screenshots/staff-queue/queue-04-sort-desktop.png)

![Queue — pagination (multi-page results)](../../artifacts/lab-03/screenshots/staff-queue/queue-05-pagination-page-2-desktop.png)

![Queue — owner filter (unassigned)](../../artifacts/lab-03/screenshots/staff-queue/queue-06-owner-unassigned-desktop.png)

![Queue — loading state](../../artifacts/lab-03/screenshots/staff-queue/queue-07-loading-desktop.png)

![Queue — empty state (no tickets yet)](../../artifacts/lab-03/screenshots/staff-queue/queue-08-empty-desktop.png)

![Queue — no-results state](../../artifacts/lab-03/screenshots/staff-queue/queue-09-no-results-desktop.png)

![Queue — failure feedback (network error)](../../artifacts/lab-03/screenshots/staff-queue/queue-10-failure-desktop.png)

**Owner filter.** The Owner control is a select of `All`, `Unassigned` and every active IT
Staff / Administrator by name, backed by `GET /api/staff/assignees` (api-spec §6.1a).
It previously accepted a raw user id typed into a text box, which no user could guess.

![Queue — owner filter as a select of assignable staff](../../artifacts/lab-03/screenshots/staff-queue/queue-06-owner-unassigned-desktop.png)

**All ten columns fit, at every viewport.** The queue table no longer needs sideways
scrolling: it uses a fixed layout sized to its container, and timestamps render compactly
as `2026-09-29 11:52`. The capture below is 1024px wide — the width with the least room,
where the `Last Updated` column used to be cut off.

![Queue — 1024px: all ten columns readable, no horizontal scroll](../../artifacts/lab-03/screenshots/staff-queue/queue-13-list-narrow-desktop-1024.png)

![Queue — tablet (820px): card representation, same information](../../artifacts/lab-03/screenshots/staff-queue/queue-11-list-tablet.png)

![Queue — mobile (390px): card representation, same information](../../artifacts/lab-03/screenshots/staff-queue/queue-12-list-mobile.png)

**Verification.** `npm run test:e2e` runs RESP-01 at 1280 / 1024 / 820 / 390. It asserts no
page-level horizontal scrolling *and* — via `expectNoClippedContent` — that nothing is cut
off inside a clipping box, that all ten column headers are visible, and that every cell's
text is complete. Re-introducing the old `nowrap` timestamp makes that test fail, so it is a
real regression test rather than a formality.

![Req-03-style API authorization — requester forbidden from staff queue (403)](../../artifacts/lab-03/api-evidence/part-6-queue/api-403-requester-queue.png)

---

## Answer Part 7: Working IT Staff Ticket Detail UI

Evidence below demonstrates (a total of 15 detail + 11 requester captures + API evidence):
seeded detail with Public Comment + Internal Note, claim (FR-14), reassign owner, IT Priority
(FR-15), permitted status transitions (NEW → OPEN → IN_PROGRESS) and a forbidden transition
rejected, Public Comments vs Internal Notes with required-field validation, requester
resolution indication, attachment continuity (Lab 2 attachments carried over), failure
feedback, the full Requester flow (My Tickets → create → comment → resolution indication,
foreign-ticket safe failure, role navigation), and direct API authorization evidence.

![Detail — overview of a seeded NEW unassigned ticket](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-01-overview-desktop.png)

![Detail — claim (FR-14)](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-02-claim-desktop.png)

![Detail — reassign owner](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-03-reassign-desktop.png)

![Detail — IT Priority HIGH (FR-15)](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-04-it-priority-desktop.png)

![Detail — permitted status NEW → OPEN → IN_PROGRESS (FR-16)](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-05-status-in-progress-desktop.png)

![Detail — forbidden transition rejected (409)](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-06-status-transition-rejected-desktop.png)

![Detail — Public Comment posted](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-07-public-comment-posted-desktop.png)

![Detail — Public Comment required-field validation](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-08-public-comment-required-desktop.png)

![Detail — Internal Note posted](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-09-internal-note-posted-desktop.png)

![Detail — Internal Note required-field validation](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-10-internal-note-required-desktop.png)

![Detail — attachment continuity (Lab 2 attachments carried over)](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-11-attachments-desktop.png)

![Detail — requester resolution indication](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-12-requester-resolved-indication-desktop.png)

![Detail — failure feedback (network error)](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-13-safe-failure-desktop.png)

![Requester — My Tickets list](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-01-my-tickets-list-desktop.png)

![Requester — create ticket form](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-02-create-ticket-form-desktop.png)

![Requester — ticket detail](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-03-ticket-detail-desktop.png)

![Requester — Public Comment posted](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-04-public-comment-posted-desktop.png)

![Requester — resolution indication](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-05-resolved-indication-desktop.png)

![Requester — foreign-ticket safe failure (404)](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-06-foreign-ticket-safe-failure-desktop.png)

![Requester — role navigation restricted from staff views](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-07-requester-nav-role-restriction-desktop.png)

![API authorization — Administrator-only endpoint rejected for IT_STAFF (403)](../../artifacts/lab-03/report-evidence/part-7-detail/07-staff-api-403-admin.png)

![API authorization — requester forbidden from internal notes (403)](../../artifacts/lab-03/api-evidence/part-7-detail/api-403-requester-notes.png)

![API authorization — requester cannot read a foreign ticket (404)](../../artifacts/lab-03/api-evidence/part-7-detail/api-404-foreign-ticket.png)

![API authorization — forbidden status transition (409)](../../artifacts/lab-03/api-evidence/part-7-detail/api-409-forbidden-transition.png)

---

## Answer Part 8: Working Administrator User Management UI

Evidence below demonstrates the minimalist User Management screen: the list (Name, Email, Role,
Status, Edit), search by name, optional role filtering, create user with a permitted role and
initial password, required-field / duplicate-email validation, editing, setting a new initial
password + required change at next login, no-results and failure feedback, the two
Administrator safety rules, forbidden access for non-Administrators (shell nav + API 403), and
responsive Zen Green presentation.

![User list](../../artifacts/lab-03/screenshots/user-management/users-01-list-desktop.png)

![Search by name](../../artifacts/lab-03/screenshots/user-management/users-02-name-search-desktop.png)

![Role filter — shows "(filtered)" count](../../artifacts/lab-03/screenshots/user-management/users-03-role-filter-desktop.png)

![Create user — form](../../artifacts/lab-03/screenshots/user-management/users-04-create-form-desktop.png)

![Create user — required-field validation](../../artifacts/lab-03/screenshots/user-management/users-05-create-required-validation-desktop.png)

![Create user — duplicate email rejected](../../artifacts/lab-03/screenshots/user-management/users-06-create-duplicate-email-desktop.png)

![Create user — success + initial password notice](../../artifacts/lab-03/screenshots/user-management/users-07-create-success-desktop.png)

![Edit user — form](../../artifacts/lab-03/screenshots/user-management/users-08-edit-form-desktop.png)

![Edit user — saved (role + name updated)](../../artifacts/lab-03/screenshots/user-management/users-09-edit-save-success-desktop.png)

![Set new initial password — form](../../artifacts/lab-03/screenshots/user-management/users-10-set-new-initial-password-desktop.png)

![Set new initial password — invalid value rejected](../../artifacts/lab-03/screenshots/user-management/users-11-set-initial-password-invalid-desktop.png)

![Required password change at next login](../../artifacts/lab-03/screenshots/user-management/users-12-required-change-next-login-desktop.png)

![User list — no results](../../artifacts/lab-03/screenshots/user-management/users-13-list-no-results-desktop.png)

![User list — failure feedback](../../artifacts/lab-03/screenshots/user-management/users-14-safe-failure-desktop.png)

![Safety rule — last active Administrator cannot be deactivated](../../artifacts/lab-03/screenshots/user-management/users-15-last-admin-blocked-desktop.png)

![Safety rule — self-deactivation prevented](../../artifacts/lab-03/screenshots/user-management/users-16-self-deactivation-blocked-desktop.png)

![Non-Administrator shell — no User Management navigation](../../artifacts/lab-03/screenshots/user-management/users-17-staff-no-management-nav-desktop.png)

![API authorization — User Management forbidden for IT_STAFF (403)](../../artifacts/lab-03/api-evidence/part-8-users/08-users-api-403-for-staff.png)

---

## Answer Part 9: Zen Green UI and Responsive Evidence

Both files are **rendered into this report** below, not just linked, so the checklist and the
specification can be read without leaving the document. Rendered by
`node scripts/render-docs.mjs`; each page is cut on a heading or table-row boundary so
nothing is sliced mid-row.

### Visual checklist — `visual-inspection.md`

The sheet's nine items — design consistency, role navigation, badges, editable/read-only fields,
validation placement, focus, clipping, overlap and horizontal overflow — are **measured in a real
browser** by `node scripts/verify-visual-checklist.mjs`: 220 measurements across 4 viewports
(1280 / 1024 / 820 / 390), 3 roles and 7 screens, **220 passed, 0 failed**. The checker reads
computed styles and DOM geometry, exits non-zero on any failure, and writes its evidence to
`artifacts/lab-03/visual-evidence/visual-check.{json,md}`.

| # | Checklist item | Measured | Result |
|---|---|---:|---|
| 1 | Design consistency | 28 | ✅ |
| 2 | Role navigation shows only permitted destinations | 24 | ✅ |
| 3 | Badges: status + both priorities, as text | 4 | ✅ |
| 4 | Editable vs read-only fields distinct | 24 | ✅ |
| 5 | Validation messages next to their field | 28 | ✅ |
| 6 | Visible keyboard focus indicator | 28 | ✅ |
| 7 | No clipped content | 28 | ✅ |
| 8 | No overlapping content | 28 | ✅ |
| 9 | No horizontal page overflow | 28 | ✅ |

The geometry detectors were proven to fail on injected defects (a 1600px container reported
`scrolls sideways by 570px`; an ellipsis-truncated ticket number and an absolutely positioned
overlay were both caught), so a pass is not a rubber stamp. The pass also found and fixed a real
inconsistency: the mobile queue card's status badge had no `title`, unlike the desktop table badge.

The full checklist, the per-item measured detail and the screenshot inventory are rendered below:

![Rendered visual-inspection.md — page 1](../../artifacts/lab-03/report-evidence/part-9-visual-evidence/01-rendered-visual-inspection-md-p1.png)

![Rendered visual-inspection.md — page 2](../../artifacts/lab-03/report-evidence/part-9-visual-evidence/01-rendered-visual-inspection-md-p2.png)

![Rendered visual-inspection.md — page 3](../../artifacts/lab-03/report-evidence/part-9-visual-evidence/01-rendered-visual-inspection-md-p3.png)

### UI specification — `ui-spec.md`

Color tokens, role/status/priority badges, every screen's structure, modes, controls and
feedback, the screen-state matrix, the responsive rules and the accessibility rules
(3 pages):

![Rendered ui-spec.md — page 1](../../artifacts/lab-03/report-evidence/part-9-visual-evidence/02-rendered-ui-spec-md-p1.png)

![Rendered ui-spec.md — page 2](../../artifacts/lab-03/report-evidence/part-9-visual-evidence/02-rendered-ui-spec-md-p2.png)

![Rendered ui-spec.md — page 3](../../artifacts/lab-03/report-evidence/part-9-visual-evidence/02-rendered-ui-spec-md-p3.png)

Source files: [visual-inspection.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/visual-inspection.md)
and [ui-spec.md](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-03/ui-spec.md).

The 15 committed responsive captures below cover the major Lab 3 screens at **1024×900,
tablet 820×900 and mobile 390×844** and are readable without zoom (desktop 1280×900 captures
are embedded throughout Parts 5–8 above):

### Authentication — login and password change

![Login — tablet](../../artifacts/lab-03/screenshots/authentication/auth-15-login-form-tablet.png)

![Login — mobile](../../artifacts/lab-03/screenshots/authentication/auth-16-login-form-mobile.png)

![Change password — tablet](../../artifacts/lab-03/screenshots/authentication/auth-17-change-password-tablet.png)

![Change password — mobile](../../artifacts/lab-03/screenshots/authentication/auth-18-change-password-mobile.png)

### IT Staff Ticket Queue

![Queue — 1024px](../../artifacts/lab-03/screenshots/staff-queue/queue-13-list-narrow-desktop-1024.png)

![Queue — tablet (820px)](../../artifacts/lab-03/screenshots/staff-queue/queue-11-list-tablet.png)

![Queue — mobile (390px)](../../artifacts/lab-03/screenshots/staff-queue/queue-12-list-mobile.png)

### IT Staff Ticket Detail

![Requester My Tickets — tablet](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-08-my-tickets-list-tablet.png)

![Requester My Tickets — mobile](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-09-my-tickets-list-mobile.png)

![Requester Ticket Detail — tablet](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-10-ticket-detail-tablet.png)

![Requester Ticket Detail — mobile](../../artifacts/lab-03/screenshots/staff-ticket-detail/requester-11-ticket-detail-mobile.png)

![Staff Ticket Detail — tablet](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-14-detail-tablet.png)

![Staff Ticket Detail — mobile](../../artifacts/lab-03/screenshots/staff-ticket-detail/detail-15-detail-mobile.png)

### User Management

![User list — tablet](../../artifacts/lab-03/screenshots/user-management/users-18-list-tablet.png)

![User list — mobile](../../artifacts/lab-03/screenshots/user-management/users-19-list-mobile.png)