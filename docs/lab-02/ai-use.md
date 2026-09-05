# Lab 2 — AI Use and Reflection

**LLM/agent used:** [opencode (The Agent SDK)](https://opencode.ai) — an AI coding agent
that writes and verifies code directly in this repository (Spec-Driven Development + TDD).

## Selected key prompts (6–10)

Each row shows a **real, verbatim-style prompt** I gave and what I *then* did with the
result. The point of including them is not to show that AI "autofilled" the work, but to
show how I reasoned about, steered, and corrected the agent at each step.

| # | The prompt I gave (as I actually asked it) | What I did with the result / how I refined it |
|---|----------------------------------------------|------------------------------------------------|
| 1 | "Turn the Lab 2 labs sheet into a complete engineering contract: scope, user stories, non-functional requirements, numbered acceptance criteria, and a test plan." | Read the sheet myself first, then had the agent draft `specification.md` + `api-spec.md` + `ui-spec.md` (Issue 5). I re-ordered the criteria and re-worded ambiguous rules so each was verifiable before any implementation started. |
| 2 | "Design the relational model + seed from the specs, with Ticket Number, Current Status as enums, and uuid IDs." | Reviewed the Prisma schema draft against the spec by hand, then wrote the migration and seed (Issue 6). I chose `TK-<6-digit>` for the ticket number. My first draft defaulted status to `SUBMITTED`; I later corrected it to `NEW` (labsheet §4.3) before release, noting the decision explicitly rather than letting the agent guess. |
| 3 | "Write a failing test first, then implement ticket creation with field-level validation (TDD)." | Kept the red-green-refactor loop: I asked the agent to write the failing test, refused the implementation until the test was added, and only then allowed it to turn the test green (Issue 8). I had the agent confirm the validation message appears *next to* the field, per ui-spec §7. |
| 4 | "Implement My Tickets scoped to the requester, with search, filters, sorting, and pagination. What are the ownership rules?" | Pushed the agent to state the ownership/404 rules explicitly in the API, then verified the list actually isolated requester A from requester B in tests (Issue 9). I caught that search should also match the ticket number and added it. |
| 5 | "Add the Zen Green theme: CSS tokens, button hierarchy, focus states, and responsive breakpoints from ui-spec §7/§12." | I refused an earlier draft that hard-coded colors in tests; asked the agent to read the *real* `styles.css` and assert tokens from it (STYLE-01), and to surface `aria-current` on the active nav (Issue 12). Both fixes came from my review, not the agent. |
| 6 | "Set up Playwright E2E for the full requester flow plus responsive rules, with screenshots at desktop/tablet/mobile." | I specified `workers: 1` myself because ticket numbers come from a running counter and parallel creates collide; then I serialized the suite and wired `npm run screenshots` (Issue 13). The E2E passes 11/11 only because I forced that design decision. |
| 7 | "The reviewer says the E2E can't pass — re-verify against the actual remote and push back with evidence if needed." | I did NOT take the reviewer's word or the agent's guess: I ran `git ls-tree` / `git show` on `origin/lab2-staging` and re-ran the suite myself, then replied with code evidence. I conceded the one real gap the reviewer found (initial status defaulted to `SUBMITTED` vs lab-sheet §4.3 "New") and fixed it to `NEW` before the release. |
| 8 | "Produce the visual-inspection evidence: complete the ui-spec §14 checklist and regenerate current screenshots." | I checked each checklist item against the actual code and the RESP-01 assertions before writing it down, and refreshed all 9 screenshots so the evidence matches the final UI (Issue 14) — evidence, not memory. |
| 9 | "Finalise the docs and release: reviewer.md, ai-use.md, updated README, and the lab2-staging → main release PR." | I reviewed every PR's real review comments and approvals to fill `reviewer.md` accurately, and verified the final test counts (server 52/52, client 51/51, E2E 11/11) before writing `tests.md`. The release PR is held until peer approval per the workflow. |

## My Reflection

The most valuable habit I built this Lab was **treating the AI's output as a draft to be
verified, not a finished answer** — I re-read the labs sheet and specs myself, restated
requirements back to the agent in precise, verifiable terms, and confirmed results against
the real repository (`git ls-tree`/`git show`, re-running the suites) instead of trusting
either the agent's or the reviewer's memory. The clearest example was PR #33: rather than
accept the reviewer's claims or let the agent autofill a reply, I produced the evidence
myself and only conceded the one point that was genuinely divergent. Where I most improved
my prompts was making each one name the *acceptance criterion* and the *place to look* in
the code (e.g. "read the real `styles.css`", "assert `aria-current`"), which turned vague
requests into checkable work. I also had to reject/correct AI output several times — most
notably forcing `workers: 1` on the E2E suite and insisting validation appear next to the
field. In short, the AI sped up my coding, but the thinking that made it correct — what to
ask, where to check, and when to refuse an answer — was my own.
