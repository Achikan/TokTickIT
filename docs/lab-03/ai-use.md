# Lab 3 — AI Use and Reflection

**LLM/agent used:** Anthropic Claude (claude-class) accessed as a coding agent through
[opencode](https://opencode.ai) — an agentic CLI that reads, edits, runs and verifies code in
this repository (Spec-Driven Development + TDD, per the Lab 3 sheet).

## Selected key prompts (6–10)

Each row is a **real, verbatim-style prompt** I gave and what I *then* did with the result.
The point is not to show that AI "autofilled" the work, but to show how I steered, verified,
and corrected the agent at each step.

| # | The prompt I gave (as I actually asked it) | What I did with the result / how I refined it |
|---|----------------------------------------------|------------------------------------------------|
| 1 | "Turn the Lab 3 sheet (§4–§9) into the Sprint 3 engineering contract — numbered FR/BR, authorization, migration decisions, ACs, and DoD." | Transformed the handout into `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` (Issue 16) **before** any implementation, and made the SUBMITTED→NEW migration decision explicit from the sheet §4.3 rather than letting the agent guess. |
| 2 | "Migrate DevelopmentRequester to a User model with roles (REQUESTER/IT_STAFF/ADMIN), hash passwords, and keep Lab 2 Tickets/Attachments valid." | Reviewed the Prisma migration and seed myself; the reviewer's PR #53 comment that the migration files were missing was correct — I re-verified `git status` and pushed the schema+migration before merge (Issue 17/20). |
| 3 | "Enforce the full password policy server-side (min 8, lower, upper, digit, special) and extend API-05 to reject each missing class." | This came from review PR #51: I deliberately refined the prompt to list every character class because the reviewer showed `password123` passed validation; I then synced `api-spec.md` §1.4 / `ui-spec.md` §3.2 so code and contract match (Issue 18). |
| 4 | "Implement the IT Staff Ticket Queue per AC-13..17: search, filters, sorting, pagination, ownership, badges, responsive." | Named the acceptance criteria in the prompt, then checked the Authorization Matrix myself — the reviewer found queue endpoints reachable by Admin (AC-10) in PR #54 and I closed that gap before merge (Issue 21). |
| 5 | "Preview the Admin user-management screen for self-deactivation and last-active-Administrator safety rules (BR)." | I asked the agent to surface the exact safety rules and then caught, via PR #57 review, that a weak new initial password showed the generic message instead of the server's specific reason; fixed it inline with `aria-invalid` + a UI-16 regression test (Issue 23). |
| 6 | "Create the missing Playwright specs the config references — E2E-05, RESP-01 and A11Y-01 under e2e/lab-03." | My partner flagged these absent from PR #58; I matched the existing `helpers.ts` conventions, wired the specs to the desktop/tablet/mobile projects, added a `<main>` landmark for the A11Y landmarks test, and re-ran the whole suite (Issue 24). |
| 7 | "Add `requester-flow.spec.ts` — drive a Requester submitting a Ticket through the Create Ticket UI under session auth (AC-12), then find/open it in My Tickets and manage its Attachment." | This closed the second review round on PR #58; I ported the Lab 2 E2E-01/E2E-02 flows and asserted the Requester is read from the session (read-only field), not a selector. |
| 8 | "Generate desktop/tablet/mobile screenshots for authentication, staff-queue, staff-ticket-detail and user-management into artifacts/lab-03/screenshots." | Wrote `scripts/screenshots-lab3.mjs` that logs in through the real session-auth UI (including the mandatory first-password change) and captures 27 PNGs; I debugged the fixtures myself (distinct active vs pending-password requesters per viewport) instead of accepting a first draft that failed. |
| 9 | "Fill tests.md Part 3 final status and reviewer.md from the real GitHub review threads on PRs #49–#58." | I pulled each PR's actual verdicts/comments via the GitHub API and put only verifiable numbers in `tests.md` (server 176 passed | 2 todo, client 93/93, E2E 25/25) — evidence, not memory. |

## My Reflection

The discipline I carried into Lab 3 was: **the sheet is the contract, and the agent is the
contractor — I stay the verifier.** Before asking for implementation I turned the handout into
numbered FR/BR/AC myself (Issue 16) and I named the acceptance criterion inside most of my
prompts, which made the replies checkable instead of plausible. The high-leverage moments were
the reviews: my partner caught things I had missed exactly because I had to *respond* with
evidence — a missing migration (PR #53), an admin authorization leak (PR #54), a swallowed
password error (PR #57), and two rounds of absent E2E specs (PR #58). In each case I did not
just relay the agent's fix back; I re-verified against the running system (re-running
`npm test`, the client suite, and `npx playwright test`) and gave the reviewer the exact
reason. The screenshots also taught me that "just capture the screen" is insufficient — I had
to separate the fixture that proves the mandatory password-change screen from the one that
drives the ticket, and the cookie state management between roles so each viewport's evidence
was genuinely independent. AI again accelerated the work substantially, but the reasoning —
which criteria to encode, where to look, and when to reject a first attempt — was mine.