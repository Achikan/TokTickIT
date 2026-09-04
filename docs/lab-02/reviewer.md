# Lab 2 — Peer Review Record

**Author:** <full name> — <student id> — GitHub: [@Achikan](https://github.com/Achikan)
**Peer reviewer:** <full name> — <student id> — GitHub: [@il0lk3](https://github.com/il0lk3)

> Every Lab 2 Issue was developed on its own `feature/<n>-<slug>` branch and merged
> into `lab2-staging` only after the peer reviewer approved (no direct commits to
> `main` or `staging`). The friend/peer performs the actual merge after approval.

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
the E2E suite genuinely passes 11/11. I agreed the fourth (initial status `SUBMITTED` vs a
required `New` per BR-02/labsheet §4.3) is a real spec divergence and proposed handling it
as a separate status-workflow change. The reviewer then approved, conceding the tests were
correct for the current staging base.

**PR #34 (Visual inspection):** Approved on first review — the checklist was verified
against the codebase and accurately reflected the ui-spec.

## Pull Requests I reviewed for my partner

Partner's Lab 2 feature PRs, reviewed and approved: [#25](https://github.com/Achikan/TokTickIT/pull/25),
[#28](https://github.com/Achikan/TokTickIT/pull/28), [#29](https://github.com/Achikan/TokTickIT/pull/29),
[#31](https://github.com/Achikan/TokTickIT/pull/31), [#33](https://github.com/Achikan/TokTickIT/pull/33) (each
reviewed by me and approved after the partner's responses).

Representative exchange — **PR #33:** I (as reviewer) initially asked for a `TKT-YYYY-NNNNNN`
format and `New` status. Partner's response corrected me with `git ls-tree`/`git show`
evidence showing the actual `TK-######` format and `SUBMITTED` default. *My response:*
"Sorry for the confusion, and great job on the tests, they definitely work perfectly for the
current staging base." Approved.

## Outcome

All Lab 2 Issues (5–14) are merged into `lab2-staging`, each passing peer review and
approval. Final release PR from `lab2-staging` to `main` is tracked in Issue 15.
