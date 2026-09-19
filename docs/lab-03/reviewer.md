# Lab 3 — Peer Review Record

**Author:** อชิรญา อินตา (Achiraya Intha) — 67070505229 — GitHub: [@Achikan](https://github.com/Achikan)
**Peer reviewer:** ธนากร พหุลรัตน์ (Thanakorn Phahulrat) — 67070505217 — GitHub: [@il0lk3](https://github.com/il0lk3)

> Two-way peer review per the lab: all Lab 3 feature PRs in `Achikan/TokTickIT`
> were reviewed and approved by my partner before they were merged into
> `lab3-staging`, and I reviewed my partner's Lab 3 PRs in `il0lk3/TokTickIT`.
> Every Issue was developed on its own `feature/<n>-<slug>` branch and merged
> only after the reviewer approved; no direct commits went to `main`.

## Pull Requests I authored (reviewed by my partner)

| PR | Issue | Branch | Reviewer verdict |
|----|-------|--------|------------------|
| [#49](https://github.com/Achikan/TokTickIT/pull/49) | 16 — Sprint 3 engineering contract | `feature/16-sprint-3-contract` | Approved (after 1 revision) |
| [#50](https://github.com/Achikan/TokTickIT/pull/50) | 17 — Migration & User model | `feature/17-database-migration-user-model` | Approved |
| [#51](https://github.com/Achikan/TokTickIT/pull/51) | 18 — Authentication & authorization API | `feature/18-auth-api` | Approved (after 1 revision) |
| [#52](https://github.com/Achikan/TokTickIT/pull/52) | 19 — Login & authentication UI | `feature/19-auth-ui` | Approved |
| [#53](https://github.com/Achikan/TokTickIT/pull/53) | 20 — Requester regression | `feature/20-requester-regression` | Approved (after 1 revision) |
| [#54](https://github.com/Achikan/TokTickIT/pull/54) | 21 — IT Staff Ticket Queue | `feature/21-staff-ticket-queue` | Approved (after 1 revision) |
| [#56](https://github.com/Achikan/TokTickIT/pull/56) | 22 — IT Staff Ticket Detail (supersedes [#55](https://github.com/Achikan/TokTickIT/pull/55)) | `feature/22-staff-ticket-detail` | Approved (after 1 revision) |
| [#57](https://github.com/Achikan/TokTickIT/pull/57) | 23 — Administrator User Management | `feature/23-admin-user-management` | Approved (after 1 revision) |
| [#58](https://github.com/Achikan/TokTickIT/pull/58) | 24 — E2E testing, responsive & accessibility | `feature/24-e2e-responsive-accessibility` | Approved (after 2 revisions) |
| [#TBD](https://github.com/Achikan/TokTickIT) | 25 — Final review, screenshots & release | `feature/25-final-review-screenshots-release` | Issues 16–24 merged; awaiting this release review |

### Representative review comments I received and how I responded

**PR #51 (Auth API) — password policy:** "A password like `password123` would easily
bypass the backend validation. Could you update the regex to enforce uppercase, lowercase,
number and special character so it matches the frontend UI checklist?"
*Response:* The reviewer was right that stronger validation is better. I extended
`passwordPolicyError` to require min 8 chars plus lower, upper, digit and special, synced the
contract docs (`api-spec.md` §1.4, `ui-spec.md` §3.2, `specification.md`), and extended
API-05 to reject a password missing each class. Full suite stayed green (89 passed | 3 todo);
then approved.

**PR #54 (Staff queue) — admin authorization:** "The Authorization Matrix explicitly says
`No` for Administrator access to the Ticket Queue endpoints, but the implementation allows it."
*Response:* Re-checked every queue endpoint against `requireRole`/authorization rules from
`api-spec.md` and aligned the queue controller and staff-queue API tests so only `IT_STAFF`
(A and B) reach them; added AC-10 authorization tests; then approved.

**PR #57 (User management) — initial-password error surfacing:** "The backend returns the
specific reason in `fields.newInitialPassword`, but `submitInitialPassword` drops it and the
user only sees a generic `Invalid input.`."
*Response:* Fixed in 3eb9d74 — the field reason is now shown inline
(`is-invalid` + `invalid-feedback` + `aria-invalid`), matching Lab 3 sheet §4.4 and BR-17, with
a UI-16 regression test (13/13; client suite 93/93); then approved.

**PR #58 (E2E) — first revision, missing test files:** "The config references E2E-05, RESP-01
and `responsive.spec.ts`, but only E2E-01..04 are in the diff."
*Response:* Added `user-administration.spec.ts` (E2E-05), `responsive.spec.ts` (RESP-01) and
`accessibility.spec.ts` (A11Y-01) plus a `<main>` landmark, re-requested review.

**PR #58 — second revision, AC-12 gap:** "There are still no E2E tests in `e2e/lab-03/` that
drive a Requester submitting a ticket through the UI — a direct violation of AC-12."
*Response:* Added `requester-flow.spec.ts` — create ticket through the Create Ticket UI,
find/open it in My Tickets and Ticket Detail, and upload + soft-remove an Attachment under the
session identity (porting the Lab 2 E2E-01/E2E-02 flows). Full suite 25/25 E2E + 93/93 client;
then approved.

## Pull Requests I reviewed for my partner

The pairing is a two-way peer review: my partner @il0lk3 reviewed all my Lab 3 PRs in
`Achikan/TokTickIT`, and I reviewed their Sprint 3 work in `il0lk3/TokTickIT`.

| PR (partner's repo) | Partner's Issue / PR | My comment (summary) | Verdict |
|----|---------------------|----------------------|---------|
| [#41](https://github.com/il0lk3/TokTickIT/pull/41) | Sprint 3 specification & test plan | cross-checked all four files against `Lab_3_sheet`, flagging AC/BR gaps → fixes → approve | CHANGES_REQUESTED → APPROVED |
| [#42](https://github.com/il0lk3/TokTickIT/pull/42) | User model, migration & seed | verified migration and seed; flagged Lab 2 continuity and schema blockers → fixes → approve | CHANGES_REQUESTED → APPROVED |
| [#43](https://github.com/il0lk3/TokTickIT/pull/43) | Authentication API & session | verified locally at PR head (`dbd6fdc`): server suite 33/33 (auth 8, session 3, …) | APPROVED |
| [#44](https://github.com/il0lk3/TokTickIT/pull/44) | Login & App Shell | no code blockers; required the PR base to be retargeted to `lab3-staging` before merge | COMMENTED → merged after base fix |
| [#45](https://github.com/il0lk3/TokTickIT/pull/45) | Login & Change-Password UI + shell | verified UI against ui-spec (states, focus, role navigation); requested small fixes → approve | CHANGES_REQUESTED → APPROVED |

## Outcome

All Lab 3 Issues (16–25) are implemented on `feature/<n>-<slug>` branches and merged into
`lab3-staging` after peer-review approval from @il0lk3. Issues 17–24 (implementation) and this
final review/screenshots Issue 25 form the deliverable set for Lab 3 **Parts 1–9** of the report,
with the release from `lab3-staging` to `main` as the last step (§14 — the repository `main`
branch remains the source of truth).