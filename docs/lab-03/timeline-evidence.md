# Lab 3 — Timeline Evidence: the specification preceded the code

Purpose: evidence for **Part 2** of the Lab 3 report — that `specification.md`, `api-spec.md`,
`ui-spec.md` and `tests.md` were created and merged *before* any implementation pull request.

Every timestamp on this page was read from `git log --date=iso` and from the GitHub REST API
(`gh pr view --json number,title,createdAt,mergedAt`). Nothing is typed in by hand. Regenerate
with `node scripts/evidence-timeline.mjs`, which also produces
`artifacts/lab-03/evidence/spec-before-code.png`.

## 1. When the contract files were created

```console
$ git log --diff-filter=A --format='%h | %ad | %an | %s' --date=iso \
    -- docs/lab-03/specification.md docs/lab-03/tests.md \
       docs/lab-03/api-spec.md docs/lab-03/ui-spec.md

716684e | 2026-09-17 19:42:24 +0700 | kantawan | docs(Issue 16): Sprint 3 engineering contract — specification, api-spec, ui-spec, tests
```

All four contract files were added in **one commit**, `716684e4`, at
**2026-09-17 12:42:24 UTC** (+0700 local 19:42:24) on branch
`feature/16-sprint-3-contract`. There is no earlier version of any of the four files.

## 2. Pull request timeline, ordered by time

All values are UTC, taken verbatim from the GitHub API.

| PR | Title | createdAt | mergedAt | Role |
|---|---|---|---|---|
| [#49](https://github.com/Achikan/TokTickIT/pull/49) | Issue 16: Sprint 3 Engineering Contract | 2026-09-17 12:42:44 | **2026-09-17 13:16:13** | **Specification DD — spec before code** |
| [#50](https://github.com/Achikan/TokTickIT/pull/50) | Issue 17: Database Migration & User Model | 2026-09-17 13:45:36 | 2026-09-17 14:37:50 | Implementation (first code PR) |
| [#51](https://github.com/Achikan/TokTickIT/pull/51) | Issue 18: Authentication & Authorization API | 2026-09-17 15:33:48 | 2026-09-17 16:38:27 | Implementation |
| [#52](https://github.com/Achikan/TokTickIT/pull/52) | Issue 19: Login & Authentication UI | 2026-09-17 16:49:06 | 2026-09-17 17:15:41 | Implementation |
| [#53](https://github.com/Achikan/TokTickIT/pull/53) | Issue 20: requester regression | 2026-09-18 07:07:22 | 2026-09-18 07:45:39 | Implementation |
| [#54](https://github.com/Achikan/TokTickIT/pull/54) | Issue 21: IT Staff Ticket Queue | 2026-09-18 08:03:47 | 2026-09-18 08:43:45 | Implementation |
| [#55](https://github.com/Achikan/TokTickIT/pull/55) | Issue 22: IT Staff Ticket Detail (first attempt) | 2026-09-18 09:05:35 | **never merged** | Implementation — superseded, see §4 |
| [#56](https://github.com/Achikan/TokTickIT/pull/56) | Issue 22: IT Staff Ticket Detail (supersedes #55) | 2026-09-18 12:05:50 | 2026-09-18 12:08:01 | Implementation |
| [#57](https://github.com/Achikan/TokTickIT/pull/57) | Issue 23: Administrator User Management | 2026-09-19 06:57:59 | 2026-09-19 07:56:24 | Implementation |
| [#58](https://github.com/Achikan/TokTickIT/pull/58) | Issue 24: E2E testing, responsive & accessibility | 2026-09-19 09:04:14 | 2026-09-19 10:06:46 | Implementation |
| [#59](https://github.com/Achikan/TokTickIT/pull/59) | Issue 25: Final review, screenshots & release integration | 2026-09-19 10:31:10 | 2026-09-19 11:05:18 | Integration into `lab3-staging` |
| [#60](https://github.com/Achikan/TokTickIT/pull/60) | Issue 25: Lab 3 sheet checklist gap fixes | 2026-09-29 14:33:05 | 2026-09-29 14:45:47 | Documentation fixes |
| [#62](https://github.com/Achikan/TokTickIT/pull/62) | Issue 25: real unit + style test coverage, sheet-format test plan | 2026-09-29 16:59:12 | 2026-09-29 17:15:16 | Test coverage |
| [#63](https://github.com/Achikan/TokTickIT/pull/63) | Release Lab 3 — Sprint 3 | 2026-09-29 17:18:11 | 2026-09-29 17:55:23 | Release `lab3-staging` → **`main`** |

## 3. Does #49 really come first?

Yes. The ordering holds on the actual data, with no reordering:

| Check | Result |
|---|---|
| Contract committed | 2026-09-17 **12:42:24** UTC (`716684e4`) |
| PR #49 merged | 2026-09-17 **13:16:13** UTC |
| PR #50 opened (first implementation PR) | 2026-09-17 **13:45:36** UTC |
| Gap from #49 merged to #50 opened | **29m 23s** |
| Gap from contract commit to first implementation PR | **1h 3m 12s** |
| Implementation PRs (#50–#63) opened before #49 merged | **0** |

The last row was measured by listing every pull request in the repository through the API
(`gh api repos/Achikan/TokTickIT/pulls?state=all&per_page=100`) and comparing each
`created_at` against PR #49's `merged_at`. No Lab 3 implementation PR predates the
specification merge. The Lab 1 / Lab 2 pull requests (#1–#48) predate Sprint 3 entirely and are
outside the scope of this comparison.

The first implementation commit itself is `90abb7fa` at **2026-09-17 13:45:17 UTC**, found with
`git log --reverse --ancestry-path 716684e4..main -- server/prisma/schema.prisma server/src
client/src` — 19 seconds before PR #50 was opened.

## 4. Things this evidence does not claim

Stated plainly so the record is accurate:

- **PR #55 was never merged.** GitHub returns an empty `merged_at` for it. It was opened
  2026-09-18 09:05:35 UTC and superseded the same day by PR #56, which is the merge that
  actually brought Issue 22 into `lab3-staging` (opened 12:05:50, merged 12:08:01 UTC). The
  report shows the approved PR #56, not #55.
- **PR #60, #62 and #63 are later documentation/test/release work**, not new features. They
  touch documentation, tests and evidence, so they sit after the implementation PRs by
  design and do not affect the spec-before-code ordering.
- **The reviewer requested changes on PR #49** at 2026-09-17 13:05:43 UTC, before merging it
  at 13:16:13. The requested correction — mapping the Lab 2 `SUBMITTED` default status to
  `NEW` in the migration rules — is recorded in `specification.md` under the enum-change
  section. The specification therefore went through review *before* any code existed, not
  only before it was merged.
