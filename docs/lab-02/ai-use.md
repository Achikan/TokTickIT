# Lab 2 — AI Use and Reflection

**LLM/agent used:** [opencode (The Agent SDK)](https://opencode.ai) — an AI coding agent
that writes and verifies code directly in this repository (Spec-Driven Development + TDD).

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | "Turn the Lab 2 labs sheet into a complete engineering contract: scope, user stories, non-functional requirements, and the test plan." | Produced `docs/lab-02/specification.md` + `api-spec.md` + `ui-spec.md` (Issue 5) — the single source of truth every later Issue verified against. |
| 2 | "Design the Lab 2 relational model and seed data from the specs." | Wrote the Prisma schema (Ticket, Attachment, Requested/IT Priority + Current Status enums), migration, and 6-category / related-system / requester seed (Issue 6). |
| 3 | "Write a failing test first, then implement ticket creation and its Create Ticket screen (TDD)." | Added the create-ticket API + UI test first, then the implementation that turns it green (Issue 8); confirm validation errors are shown near the field. |
| 4 | "Implement My Tickets with search, filters, sorting, and pagination, scoped to the requester." | Added the ownership-scoped list API + My Tickets screen + tests (Issue 9). |
| 5 | "Add the Zen Green theme: CSS tokens, button hierarchy, focus states, and responsive breakpoints from ui-spec §7/§12." | Built the token-based stylesheet, active-nav accessibility, and STYLE-01 tests that read the real `styles.css` (Issue 12). |
| 6 | "Set up Playwright E2E that exercises the full requester flow and the responsive rules, with screenshots at desktop/tablet/mobile." | Wrote `playwright.config.ts` (3 chromium projects, `workers: 1`) plus `requester-ticket-flow` / `responsive` specs and `npm run screenshots` (Issue 13). |
| 7 | "The reviewer says the E2E can't pass — re-verify against the actual remote staging and push back with evidence." | Ran `git ls-tree` / `git show` on `origin/lab2-staging` and re-ran the suite (11/11 pass), then replied with code evidence and conceded the one real status gap (Issue 13 review). |
| 8 | "Produce the visual-inspection evidence: complete the ui-spec §14 checklist and regenerate current screenshots." | Wrote `docs/lab-02/visual-inspection.md` with every checklist item evidenced against the code + RESP-01, and refreshed the 9 screenshots (Issue 14). |
| 9 | "Finalise the docs and release: reviewer.md, ai-use.md, updated README, and the lab2-staging → main release PR." | Authored this `reviewer.md`/`ai-use.md`, updated `README.md`, and opened the single release PR tracked in Issue 15. |

## Reflection

Using explicit acceptance criteria and a written spec as the prompt contract made the
agent's output verifiable rather than guessed, and short confirmations ("read the real
`styles.css`", "prove it against the remote") caught a reviewer's incorrect assumptions
about the codebase. I had to reject or correct AI output in a few places — most notably
pushing back to re-verify claims against `origin/lab2-staging` with `git show` instead of
trusting a memory of the format, and re-running tests on the actual base before agreeing a
status (`SUBMITTED`) diverged from the labs sheet's `New` requirement.
