# Lab 2 — Peer Review Record

**Author:** นางสาวอชิรญา อินตา — 67070505229 — GitHub: [@Achikan](https://github.com/Achikan)
**Peer reviewer:** นายธนากร พหุลรัตน์ — 67070505217 — GitHub: [@il0lk3](https://github.com/il0lk3)

> Two-way peer review per the lab: I wrote all Lab 2 feature PRs in
> `Achikan/TokTickIT` (reviewed + approved by my partner, § below), and I reviewed
> every one of my partner's Lab 2 PRs in `il0lk3/TokTickIT` (see the review table).
> Every Issue was developed on its own `feature/<n>-<slug>` branch and merged into
> `lab2-staging` only after the reviewer approved; no direct commits to `main`/`staging`.

## Pull Requests I authored (reviewed by my partner)

| PR | Issue | Branch | Reviewer verdict |
|----|-------|--------|------------------|
| [#25](https://github.com/Achikan/TokTickIT/pull/25) | 5 — Engineering contract | `feature/5-spec-test-plan` | Approved |
| [#26](https://github.com/Achikan/TokTickIT/pull/26) | 6 — DB model + seed | `feature/6-db-models-seed` | Approved |
| [#27](https://github.com/Achikan/TokTickIT/pull/27) | 7 — Requester selection | `feature/7-requester-selection` | Approved |
| [#28](https://github.com/Achikan/TokTickIT/pull/28) | 8 — Ticket creation | `feature/8-ticket-creation` | Approved (after 1 revision) |
| [#29](https://github.com/Achikan/TokTickIT/pull/29) | 9 — My Tickets | `feature/9-my-tickets` | Approved (after 1 revision) |
| [#30](https://github.com/Achikan/TokTickIT/pull/30) | 10 — Ticket Detail | `feature/10-ticket-detail` | Approved (after 1 revision) |
| [#31](https://github.com/Achikan/TokTickIT/pull/31) | 11 — Attachment lifecycle | `feature/11-attachments` | Approved (after 1 revision) |
| [#32](https://github.com/Achikan/TokTickIT/pull/32) | 12 — Zen Green UI & Responsive | `feature/12-zen-green-ui` | Approved (after 2 revisions) |
| [#33](https://github.com/Achikan/TokTickIT/pull/33) | 13 — Automated tests | `feature/13-automated-tests` | Approved (after 1 revision) |
| [#34](https://github.com/Achikan/TokTickIT/pull/34) | 14 — Visual inspection | `feature/14-visual-inspection` | Approved |
| [#35](https://github.com/Achikan/TokTickIT/pull/35) | 15 — Docs review & release | `feature/15-docs-review-release` | Approved |

### Representative review comments I received and how I responded

**PR #28 (Ticket creation) — validation:** "The Create Ticket screen and API validation
look great, but the header validation should be enforced server-side too."
*Response:* Enforced the request-header validation on the server and added an API test;
then approved.

**PR #29 (My Tickets):** "Search should also match the ticket number, and pagination
metadata should be complete." *Response:* Added ticket-number search coverage and verified
pagination metadata (page/size/total/totalPages); then approved.

**PR #31 (Attachments):** "Download of a soft-removed attachment should return 410, not
the file." *Response:* Changed `GET /api/attachments/:id/download` to return **410 Gone**
for a removed attachment (AC-06) and added a test; then approved.

**PR #32 (UI):** Three review comments — the CSS-token test should read the real
`styles.css` instead of a hardcoded string; the validation test should also assert the
`is-invalid` class; and `aria-current` should be on the active nav. *Response:* Rewrote the
token test to read `styles.css` via `fs`, added `is-invalid` assertions, and surfaced the
`aria-current="page"` active-nav implementation with an enhanced test that proves the
indicator moves between tabs; approved after the second revision.

**PR #33 (Automated tests):** The reviewer initially flagged four mismatches (ticket-number
format, success text, DOM wrapper, initial status). *Response:* Re-verified against
`origin/lab2-staging` with `git ls-tree` / `git show` — three of the asserted values
(`TK-######`, "Ticket created.", `.alert`) are what the merged code actually produces, and
the E2E suite genuinely passes 11/11. The reviewer was right on the fourth: my initial
status default `SUBMITTED` diverged from BR-02/labsheet §4.3's "New", so I corrected the
data model/API/UI to `NEW` (migration `20260905141000_ticket_status_new`) before release.
The reviewer then approved, conceding the tests were correct for the current staging base.

**PR #34 (Visual inspection):** Approved on first review — the checklist was verified
against the codebase and accurately reflected the ui-spec.

## Pull Requests I reviewed for my partner

The pairing is a **two-way peer review**: my partner @il0lk3 reviewed all my PRs in
`Achikan/TokTickIT`, and I reviewed all of theirs in `il0lk3/TokTickIT`. My review
trail on the partner's Lab 2 PRs, exactly as recorded on GitHub
(CHANGES_REQUESTED → partner's fix → APPROVED unless noted):

| PR (partner's repo) | Partner's Issue / PR | My comment (summary) | Verdict |
|----|---------------------|----------------------|---------|
| [#22](https://github.com/il0lk3/TokTickIT/pull/22) | Issue 1 — Sprint spec & test plan | spec cross-checked vs labsheet | APPROVED |
| [#23](https://github.com/il0lk3/TokTickIT/pull/23) | Issue 2 — DB models & reference data | model review → fixes → re-review | CHANGES_REQUESTED ×2 → APPROVED |
| [#24](https://github.com/il0lk3/TokTickIT/pull/24) | Issue 3 — Requester selector | confirmed `isActive: true` filter + context flow | COMMENTED → APPROVED |
| [#25](https://github.com/il0lk3/TokTickIT/pull/25) | Issue 4 — Create Ticket API | API contract review → fix → approve | CHANGES_REQUESTED → APPROVED |
| [#26](https://github.com/il0lk3/TokTickIT/pull/26) | Issue 5 — Create Ticket UI | UI spec alignment → fix → approve | CHANGES_REQUESTED → APPROVED |
| [#27](https://github.com/il0lk3/TokTickIT/pull/27) | Issue 6 — My Tickets API + UI | pagination/search/isolation verified → fix → approve | CHANGES_REQUESTED → APPROVED |
| [#28](https://github.com/il0lk3/TokTickIT/pull/28) | Issue 7 — Ticket Detail & soft-remove | Part 8 cross-check → fix → approve | CHANGES_REQUESTED → APPROVED |
| [#29](https://github.com/il0lk3/TokTickIT/pull/29) | Issue 8 — E2E & final release polish | `webServer` reproducibility, tests.md sync, 6-level test table to labsheet §9 | CHANGES_REQUESTED ×2 → APPROVED |
| [#30](https://github.com/il0lk3/TokTickIT/pull/30) | docs — Finalize docs, screenshots, E2E tests | verified 46 screenshots on disk + rubric Parts 1/6–9 | APPROVED |

Representative exchange — **PR #29 (as recorded on `il0lk3/TokTickIT`):** as reviewer I
checked Issue 8 against labsheet §8.7/8.8, §9.1–9.2, §12, and §13, and requested two
rounds of blockers: E2E reproducibility (add `webServer`, correct `e2e/package.json`
script) and keeping `tests.md` in sync with the planned-test table. My partner fixed both
(`c7f0203`), I re-verified, and approved. The full review threads are on
[PR #29](https://github.com/il0lk3/TokTickIT/pull/29) and my approvals on all nine PRs are
captured in `part-1-git-evidence/05-pr-review-table.png`.

## Outcome

All Lab 2 Issues (5–15) are implemented on `feature/<n>-<slug>` branches and merged into
`lab2-staging` after peer review approval from @il0lk3, per the workflow. The final release
PR from `lab2-staging` to `main` ([PR #36](https://github.com/Achikan/TokTickIT/pull/36))
is awaiting the partner's approval before merge.
