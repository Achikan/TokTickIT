# Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Semester:** 1/2026 — Sections 1, 2, HS, 31, 32  
**Lab Assignment:** Lab 4. TokTickIT Actions Taken, Dashboards, and Final Regression (Score: 60)  
**Student Name:** อชิรญา อินตา (Achiraya Intha)  
**Student ID:** 67070505229  
**Section:** 1  
**Repository (Public / Accessible):** [https://github.com/Achikan/TokTickIT](https://github.com/Achikan/TokTickIT)  
**Staging Branch:** [https://github.com/Achikan/TokTickIT/tree/lab4-staging](https://github.com/Achikan/TokTickIT/tree/lab4-staging)  
**Peer Reviewer:** ธนากร พหุลรัตน์ (Thanakorn Phahulrat) — 67070505217 — GitHub: [@il0lk3](https://github.com/il0lk3)  
**Partner Repository:** [https://github.com/il0lk3/TokTickIT](https://github.com/il0lk3/TokTickIT)  
**GitHub Project / Kanban:** [https://github.com/users/Achikan/projects](https://github.com/users/Achikan/projects) (All 37 Issues in Done)

---

### Core Engineering Contract & Documentation Links (on `main`)
1. **Engineering Specification:** [`docs/lab-04/specification.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/specification.md) — 11 required sections, numbered FR-01..22, BR-01..21, AC-01..26, DoD.
2. **UI Specification:** [`docs/lab-04/ui-spec.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/ui-spec.md) — Zen Green tokens, screen states, responsive rules, accessibility rules.
3. **API Contract:** [`docs/lab-04/api-spec.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/api-spec.md) — REST endpoints, validation, status codes, concurrency, metric queries.
4. **Test Plan & Traceability:** [`docs/lab-04/tests.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/tests.md) — 10 test types, AC traceability, 330 server tests, 139 client tests, E2E specs.
5. **Peer Review Record:** [`docs/lab-04/reviewer.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/reviewer.md) — Two-way peer review record for PRs #78–#91 with @il0lk3.
6. **AI Use & Reflection:** [`docs/lab-04/ai-use.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/ai-use.md) — Google Gemini agent, 10 key prompts, steering & reflections.

---

## Answer Part 1: Git Use with Engineering Workflow

**Summary:**  
Part 1 proves that all Sprint 4 development adhered to rigorous engineering workflow discipline: each requirement was decomposed into dedicated GitHub Issues (#26–#37) before coding; each feature was implemented on an isolated `feature/<issue>-<slug>` branch; every increment was integrated via Pull Request (#78–#91) with two-way human peer review from `@il0lk3` before merging into `lab4-staging`; and no direct commits bypassed review. All 37 project issues are in the Closed / Done column on the Kanban board.

| Deliverable Item | Repository Link / Evidence Path | Description |
|---|---|---|
| Repository Source | [https://github.com/Achikan/TokTickIT](https://github.com/Achikan/TokTickIT) | Main project repository |
| Staging Branch | [Achikan/TokTickIT @ lab4-staging](https://github.com/Achikan/TokTickIT/tree/lab4-staging) | Integration branch for Sprint 4 features |
| Kanban Project Board | [GitHub Project Board](https://github.com/users/Achikan/projects) | 100% of Issues (#1–#37) Closed / Done |
| Peer Review Record | [`docs/lab-04/reviewer.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/reviewer.md) | Author / Reviewer record, PR log, comment-response threads |
| Project README | [`README.md`](https://github.com/Achikan/TokTickIT/blob/main/README.md) | Full architectural stack, Lab 4 directory map, and test instructions |
| Project .gitignore | [`.gitignore`](https://github.com/Achikan/TokTickIT/blob/main/.gitignore) | Verified clean: no secrets, no .env, no node_modules |

### Sprint 4 Pull Requests Authored and Reviewed by Partner (@il0lk3)

| PR | Issue | Branch → Base | Title & Scope | Verdict |
|---|---|---|---|---|
| [#78](https://github.com/Achikan/TokTickIT/pull/78) | #66 (Issue 26) | `feature/26-sprint4-contract-spec` → `lab4-staging` | Sprint 4 engineering contract (`specification.md`) | Approved |
| [#79](https://github.com/Achikan/TokTickIT/pull/79) | #67 (Issue 27) | `feature/27-sprint4-contract-ui-api-spec` → `lab4-staging` | Sprint 4 UI & API contracts (`ui-spec.md`, `api-spec.md`) | Approved |
| [#80](https://github.com/Achikan/TokTickIT/pull/80) | #68 (Issue 28) | `feature/28-sprint4-test-plan` → `lab4-staging` | Sprint 4 test plan & traceability (`tests.md`) | Approved |
| [#81](https://github.com/Achikan/TokTickIT/pull/81) | #69 (Issue 29) | `feature/29-actions-taken-migration-seed` → `lab4-staging` | ActionTaken model, migration & idempotent seed | Approved |
| [#82](https://github.com/Achikan/TokTickIT/pull/82) | #70 (Issue 30) | `feature/30-actions-taken-api` → `lab4-staging` | Actions Taken REST API & authorization | Approved |
| [#83](https://github.com/Achikan/TokTickIT/pull/83) | #71 (Issue 31) | `feature/31-actions-taken-ui` → `lab4-staging` | Actions Taken UI on Ticket Detail | Approved |
| [#84](https://github.com/Achikan/TokTickIT/pull/84) | #72 (Issue 32) | `feature/32-ticket-workflow-api` → `lab4-staging` | Ticket Workflow — Transition Matrix & Resolution Gate (Backend) | Approved |
| [#85](https://github.com/Achikan/TokTickIT/pull/85) | #73 (Issue 33) | `feature/33-ticket-workflow-ui` → `lab4-staging` | Ticket Workflow — UI Status Controls | Approved |
| [#86](https://github.com/Achikan/TokTickIT/pull/86) | #74 (Issue 34) | `feature/34-staff-dashboard` → `lab4-staging` | IT Staff Dashboard (API + UI) | Approved |
| [#87](https://github.com/Achikan/TokTickIT/pull/87) | #75 (Issue 35) | `feature/35-requester-dashboard` → `lab4-staging` | Requester Dashboard (API + UI) | Approved |
| [#89](https://github.com/Achikan/TokTickIT/pull/89) | #76 (Issue 36) | `feature/36-final-regression-product-hardening` → `lab4-staging` | Final Regression & Product Hardening | Approved |
| [#90](https://github.com/Achikan/TokTickIT/pull/90) | #77 (Issue 37) | `feature/37-zen-green-polish-release` → `lab4-staging` | Zen Green Polish, Accessibility, Screenshots & Release | Approved |
| [#91](https://github.com/Achikan/TokTickIT/pull/91) | Handout §12 | `feature/lab4-e2e-specs` → `lab4-staging` | Standalone Playwright E2E Specs (`e2e/lab-04/`) | Approved |

### Evidence Screenshots — Git & Engineering Workflow

![Figure 1.1: Git Commit History Graph](../../artifacts/lab-04/report-images/p1-01-commit-history.png)
*Figure 1.1: Git commit history graph demonstrating feature branch isolation, commit discipline, and clean merges into lab4-staging.*

![Figure 1.2: Merged Pull Requests List](../../artifacts/lab-04/report-images/p1-02-pr-list.png)
*Figure 1.2: GitHub Pull Requests list demonstrating all Sprint 4 PRs (#78–#91) reviewed by @il0lk3 and merged into lab4-staging.*

![Figure 1.3: Repository Directory Structure](../../artifacts/lab-04/report-images/p1-03-directory-structure.png)
*Figure 1.3: Repository directory tree showing docs/lab-04/, server/tests/lab-04/, client/tests/lab-04/, e2e/lab-04/, and artifacts/.*

![Figure 1.4: GitHub Issues and Kanban Board in Done](../../artifacts/lab-04/report-images/p1-04-issues-done.png)
*Figure 1.4: GitHub Issues list confirming all 37 project issues are in the Closed / Done state.*

![Figure 1.5: Rendered reviewer.md Record](../../artifacts/lab-04/report-images/p1-05-rendered-reviewer.png)
*Figure 1.5: Rendered docs/lab-04/reviewer.md recording two-way peer review details, representative comments, and author response threads.*

---

## Answer Part 2: Spec DD (Specification-Driven Development)

**Summary:**  
Part 2 proves that Sprint 4 followed strict Spec-Driven Development: the engineering contracts ([`specification.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/specification.md), [`ui-spec.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/ui-spec.md), [`api-spec.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/api-spec.md)) were authored, committed, and frozen under PR #78 and #79 **before** any database migration or implementation code was written. The specification establishes numbered functional requirements (FR-01..22), business rules (BR-01..21), the 8-status transition matrix, resolution gate, dashboard metrics formulas, acceptance criteria (AC-01..26), and a comprehensive Definition of Done.

### Key Specification Elements Defined Before Coding:
1. **Numbered Functional Requirements:** FR-01 through FR-08 (Actions Taken), FR-09 through FR-14 (Ticket Workflow), FR-15 through FR-19 (Role Dashboards), and FR-20 through FR-22 (Regression & Hardening).
2. **Authoritative Business Rules:**
   - **BR-01 & BR-02:** Action belongs to exactly one Ticket; Ticket Owner coordinates while different IT Staff may perform actions.
   - **BR-03 & BR-04:** Performed By is auto-attributed from session identity (tampering ignored); Requesters are forbidden from writing actions (`403`).
   - **BR-05 & BR-06:** Follow-up note is mandatory iff Follow-Up Required is Yes (`400`); action date bounds enforced within 30 days past / 24 hours future.
   - **BR-08 & BR-09:** Eight-status lifecycle enforced server-side; unlisted transitions return `409 FORBIDDEN_TRANSITION`; Requesters cannot transition status (`403`).
   - **BR-10 & BR-11 (Resolution Gate):** Requester "Problem Appears Resolved" is advisory only; transition to `RESOLVED` requires $\ge 1$ Action Taken (`409 RESOLUTION_GATE`). Legacy resolved tickets are grandfathered.
   - **BR-12 & BR-13:** Optimistic concurrency check via `expectedUpdatedAt` (`409 STALE_UPDATE`); duplicate submission guard within 5 minutes.
   - **BR-14 to BR-17:** Dashboard metrics computed server-side in UTC, scoped to session Requester, empty metrics render 0 with working drill-downs.
   - **BR-18 & BR-19:** Additive PostgreSQL migration preserving Labs 1–3 data; idempotent seed.
3. **Acceptance Criteria & DoD:** 26 numbered criteria (AC-01..AC-26) mapped to automated tests; DoD defining product readiness.

### Evidence Screenshots — Spec DD Provenance

![Figure 2.1: Spec DD Git Commit History and Provenance](../../artifacts/lab-04/report-images/p2-01-spec-before-impl.png)
*Figure 2.1: Git commit history proving that docs/lab-04/specification.md existed and was merged under PR #78 prior to implementation PRs.*

---

## Answer Part 3: Test DD and Traceability

**Summary:**  
Part 3 demonstrates that TokTickIT achieved 100% test pass rates across all 10 required test categories: **unit, API/integration, UI component, UI style, responsive, authorization, workflow, migration/regression, performance-smoke, and end-to-end**. Testing was planned up-front in [`docs/lab-04/tests.md`](https://github.com/Achikan/TokTickIT/blob/main/docs/lab-04/tests.md), mapping every single Acceptance Criterion (AC-01..AC-26) to automated test files. On the final integration baseline, 330 server tests pass, 139 client tests pass, and 4 Playwright E2E suites pass with zero failures.

### Acceptance Criteria Traceability Matrix

| AC ID | Requirement Summary | Automated Test File | Type | Final Status |
|---|---|---|---|---|
| **AC-01** | Create valid Action Taken; session user recorded as performer; owner preserved | `server/tests/lab-04/actions-taken.api.test.ts` | API | **Pass** |
| **AC-02** | Requester dashboard retrieves only session-owned metrics and tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | API | **Pass** |
| **AC-03** | Client-supplied `performedById` is stripped and ignored | `server/tests/lab-04/actions-taken.api.test.ts` | API | **Pass** |
| **AC-04** | Follow-up note mandatory iff Follow-Up Required is Yes (`400`) | `server/tests/lab-04/actions-taken.api.test.ts` | API / Unit | **Pass** |
| **AC-05** | Requester direct API write attempt returns `403 Forbidden` | `server/tests/lab-04/actions-taken.api.test.ts` | Auth | **Pass** |
| **AC-06** | Foreign ticket actions endpoint returns non-disclosing `404` | `server/tests/lab-04/actions-taken.api.test.ts` | Auth | **Pass** |
| **AC-07** | Different active IT Staff records action; ticket owner unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | API / E2E | **Pass** |
| **AC-08** | Inactive account reference rejected with safe validation error | `server/tests/lab-04/actions-taken.api.test.ts` | API | **Pass** |
| **AC-09** | Update permitted fields; performer immutable; invalid returns `400` | `server/tests/lab-04/actions-taken.api.test.ts` | API / UI | **Pass** |
| **AC-10** | Duplicate create within 5-min window rejected with `409 DUPLICATE_ACTION` | `server/tests/lab-04/actions-taken.api.test.ts` | API / E2E | **Pass** |
| **AC-11** | Permitted transitions update status; illegal transitions return `409` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Workflow | **Pass** |
| **AC-12** | Requester status transition direct API attempt returns `403` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Auth | **Pass** |
| **AC-13** | Requester "Problem appears resolved" updates timestamp; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Workflow | **Pass** |
| **AC-14** | Stale status or action update returns `409 STALE_UPDATE` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Concurrency | **Pass** |
| **AC-15** | Resolution gate: resolving with 0 actions returns `409 RESOLUTION_GATE` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Workflow | **Pass** |
| **AC-16** | Ticket detail renders only permitted transition buttons; badge refreshes | `client/tests/lab-04/TicketWorkflow.test.tsx` | UI / E2E | **Pass** |
| **AC-17** | Conflict / gate error callout displayed; form data preserved | `client/tests/lab-04/TicketWorkflow.test.tsx` | UI | **Pass** |
| **AC-18** | Staff dashboard SD-01..SD-06 match direct DB query counts | `server/tests/lab-04/staff-dashboard.api.test.ts` | API / DB | **Pass** |
| **AC-19** | Requester hitting staff dashboard gets `403`; Admin receives user counts | `server/tests/lab-04/staff-dashboard.api.test.ts` | Auth | **Pass** |
| **AC-20** | Staff dashboard cards render loading, empty, forbidden, drill-down | `client/tests/lab-04/StaffDashboard.test.tsx` | UI / Responsive | **Pass** |
| **AC-21** | Requester dashboard renders session-scoped metrics and zero state | `client/tests/lab-04/RequesterDashboard.test.tsx` | UI / Responsive | **Pass** |
| **AC-22** | Migration preserves Labs 1–3 data; legacy tickets behave per BR-18 | `server/tests/lab-04/migration-regression.api.test.ts` | Migration | **Pass** |
| **AC-23** | Idempotent seed re-runnable without duplicates | `server/tests/lab-04/migration-regression.api.test.ts` | Seed | **Pass** |
| **AC-24** | Full Labs 1–3 regression suites pass without failures | `server/tests/lab-01..03/`, `client/tests/lab-01..03/` | Regression | **Pass** |
| **AC-25** | Responsive layout across viewports; accessibility checklist passes | `e2e/lab-04/dashboards.spec.ts`, `style.test.tsx` | Resp / A11y | **Pass** |
| **AC-26** | Multi-click throttling & double-submit protection everywhere | `client/tests/lab-04/StaffDashboard.test.tsx` | UI Throttle | **Pass** |

### Evidence Screenshots — Automated Test Runs

![Figure 3.1: Server Test Suite Output (25 Suites / 330 Tests Passed)](../../artifacts/lab-04/report-images/p3-01-server-test-output.png)
*Figure 3.1: Complete un-truncated server test execution output (PORT=0 npx vitest run) showing all 25 test files and 330 tests passing on PostgreSQL.*

![Figure 3.2: Client Test Suite Output (19 Files / 139 Tests Passed)](../../artifacts/lab-04/report-images/p3-02-client-test-output.png)
*Figure 3.2: Complete client test execution output (npx vitest run) showing all 19 test files and 139 tests passing with React Testing Library.*

---

## Answer Part 4: AI Use with Reflection

**Summary:**  
Part 4 documents the use of Google DeepMind's Antigravity Advanced Agentic Coding environment powered by Google Gemini (Gemini 2.5 Pro / Flash). Pair programming strictly followed the **Specification Agent $\rightarrow$ Coding Agent** pattern: specifications and constraints were drafted, audited, and frozen first, while implementation code was generated incrementally with immediate human steering and automated test verification.

### Key Prompts Catalog (10 Prompts Across Spec & Coding Phases)

1. **Spec Agent:** *"Transform SE Lab 4 handout (§3–§12) into the Sprint 4 engineering contract — numbered FR/BR, Actions Taken parent-child structure, status transition matrix, resolution gate, dashboard calculations, ACs, and DoD."*
   - *Steering:* Established `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` before implementation. Explicitly locked in BR-11 (Resolution Gate requiring $\ge 1$ Action Taken).
2. **Coding Agent:** *"Add ActionTaken model to Prisma, generate an additive migration preserving existing tickets, and create idempotent seed data covering 0, 1, and multiple actions per ticket."*
   - *Verification:* Inspected schema and migration SQL; verified zero regressions on existing tickets and ran seed repeatedly without duplicate key errors.
3. **Coding Agent:** *"Implement Actions Taken REST API per api-spec.md §1: create/update actions with automatic performer attribution, follow-up note validation, 5-minute duplicate guard, and strict authorization matrix."*
   - *Steering:* Inspected route handlers to guarantee client-supplied performer IDs are stripped and Requesters receive 403 on write attempts.
4. **Coding Agent:** *"Build Actions Taken section on Ticket Detail with responsive table and cards, follow-up note gate, edit mode, and read-only mode for Requesters."*
   - *Verification:* Verified UI across Staff and Requester sessions, ensuring conditional follow-up note field behavior and read-only performer tags.
5. **Coding Agent:** *"Enforce Ticket status transition matrix and resolution gate on the backend: legal transitions return 200, illegal return 409 FORBIDDEN_TRANSITION, and resolving with 0 actions returns 409 RESOLUTION_GATE."*
   - *Steering:* Enforced `expectedUpdatedAt` optimistic concurrency on status changes (BR-12) to protect against concurrent overwrites.
6. **Coding Agent:** *"Implement IT Staff Dashboard (/api/staff/dashboard) and Requester Dashboard (/api/requester/dashboard) with operational metrics and direct drill-downs."*
   - *Verification:* Verified server-side SQL aggregations and confirmed Requester dashboard is strictly scoped to the session identity without leaking foreign rows.
7. **Refinement:** *"Address peer review feedback on PR #86: replace button cards with accessible `<a>` tags per ui-spec.md §9, map status badges to badge-status-*, add drill-downs for Recently Updated and User Management, and add UI-SD-03 burst throttle."*
   - *Steering:* Fixed all review items raised by @il0lk3, added per-card 400ms burst lockout, and confirmed 136 client tests green.
8. **Hardening:** *"Re-run full server regression tests sequentially without truncation to capture all 25 test suites with the final summary block for server-vitest-all.txt (PR #89)."*
   - *Verification:* Captured un-truncated log of 330 tests (398 seconds), updated provenance numbers, and updated README.md for Lab 4.
9. **Visual Inspection:** *"Generate high-resolution visual evidence screenshots for IT Staff Dashboard, Requester Dashboard, Actions Taken, and Workflow across Desktop (1280px), Tablet (820px), and Mobile (390px) viewports."*
   - *Verification:* Built `scripts/screenshots-lab4.mjs` using Playwright Chromium with explicit viewport configurations, capturing full-page evidence into `artifacts/lab-04/screenshots/`.
10. **Evidence Re-targeting:** *"Address peer review feedback on PR #90: re-target Actions Taken and Workflow evidence captures to ticket TK-001003 (with 3 actions across multiple performers and IN_PROGRESS status) and Carol Chen requester session to capture non-empty tables, edit mode, active workflow transition buttons, and read-only actions."*
    - *Steering:* Re-targeted Playwright captures to `TK-001003`, added `06-actions-taken-edit-mode.png`, and captured requester read-only mode cleanly.

### My Reflection:
- **What was learned:** Spec-Driven Development is an essential guardrail when working with autonomous AI agents. Without numbered Acceptance Criteria and frozen Business Rules, AI agents tend to implement superficial "happy path" logic that bypasses strict security constraints (such as stripping client-supplied performer IDs or enforcing server-side transition matrices).
- **Where mistakes occurred:** Early in the sprint, agent-generated UI components cut corners by using generic CSS classes instead of Zen Green tokens, using buttons instead of semantic `<a>` links for metric cards, and premature terminal truncation in log evidence.
- **How it was addressed:** Collaborative Two-Way Peer Review with my partner (@il0lk3) provided immediate objective feedback, forcing deep root-cause fixes (e.g. implementing concurrency anchors and sequential DB resets) rather than surface-level patches.
- **What would be done differently:** In future sprints, I would create standalone Playwright E2E spec files alongside unit tests at the start of each feature slice rather than postponing E2E integration to the final hardening sprint.

![Figure 4.1: Rendered ai-use.md Record](../../artifacts/lab-04/report-images/p4-01-rendered-ai-use.png)
*Figure 4.1: Rendered docs/lab-04/ai-use.md documenting AI methodology, prompt history, steering, and reflections.*

---

## Answer Part 5: Working IT Staff Dashboard UI

**Summary:**  
Part 5 proves the operational completeness of the IT Staff Dashboard (`/staff/dashboard`). The dashboard presents server-side aggregated metrics (SD-01 unassigned, SD-02 owned-by-me, SD-03 by-status, SD-04 by-priority, SD-05 recently updated, SD-06 recent tickets list) calculated strictly from authoritative PostgreSQL data. Every card functions as an accessible semantic link (`<a>`) with defined drill-down query parameters. When accessed by an Administrator, an additional concise User Accounts card (AD-01) is displayed. Requesters are strictly forbidden (`403`).

### Evidence Screenshots — IT Staff Dashboard UI

![Figure 5.1: IT Staff Dashboard — Desktop View (1280px)](../../artifacts/lab-04/report-images/p5-01-staff-dashboard-desktop.png)
*Figure 5.1: IT Staff Dashboard (Desktop, 1280px) showing operational metric cards, by-status/priority breakdowns, recently updated list, and urgent tickets. Satisfies AC-18, AC-20, AC-25.*

![Figure 5.2: IT Staff Dashboard — Tablet View (820px)](../../artifacts/lab-04/report-images/p5-02-staff-dashboard-tablet.png)
*Figure 5.2: IT Staff Dashboard (Tablet, 820px) showing responsive 2-column card layout and stacked panels without horizontal scrollbar. Satisfies RESP-02.*

![Figure 5.3: IT Staff Dashboard — Mobile View (390px)](../../artifacts/lab-04/report-images/p5-03-staff-dashboard-mobile.png)
*Figure 5.3: IT Staff Dashboard (Mobile, 390px) showing single-column card stack and accessible touch targets without horizontal overflow. Satisfies RESP-03.*

![Figure 5.4: Administrator Extended Dashboard View](../../artifacts/lab-04/report-images/p5-04-staff-dashboard-admin-view.png)
*Figure 5.4: Administrator view of the IT Staff Dashboard displaying the additional concise User Accounts metric card (AD-01) linking to /admin/users. Satisfies AC-19.*

![Figure 5.5: Dashboard Metric Drill-Down to Filtered Staff Queue](../../artifacts/lab-04/report-images/p5-05-staff-dashboard-drilldown-queue.png)
*Figure 5.5: Staff Ticket Queue opened immediately upon clicking the Unassigned metric card with owner=unassigned prefiltered. Satisfies AC-18, AC-20.*

![Figure 5.6: Role Protection: Requester Forbidden (403)](../../artifacts/lab-04/report-images/p5-06-staff-dashboard-forbidden.png)
*Figure 5.6: Terminal/API output verifying that a Requester session attempting to hit /api/staff/dashboard receives a safe 403 Forbidden without data disclosure. Satisfies AC-19, BR-04.*

![Figure 5.7: Database Query Verification vs. Staff Dashboard Metrics](../../artifacts/lab-04/report-images/p5-07-staff-dashboard-db-comparison.png)
*Figure 5.7: Direct verification table comparing backend dashboard API returned metric counts against direct PostgreSQL database query results (SD-01..SD-05). All metrics match 100%.*

---

## Answer Part 6: Working Actions Taken UI

**Summary:**  
Part 6 demonstrates the Actions Taken work log on the Ticket Detail screen ([`ActionsTaken.tsx`](https://github.com/Achikan/TokTickIT/blob/main/client/src/ActionsTaken.tsx)). The interface allows IT Staff and Administrators to record and edit work performed line-by-line while preserving primary Ticket Ownership (BR-02). Performed By is automatically attributed from the authenticated session (FR-05) and is immutable. Follow-up notes are strictly validated both client-side and server-side (BR-05). Requesters viewing their owned ticket see the complete action history in read-only mode without write affordances (BR-04).

### Evidence Screenshots — Actions Taken UI

![Figure 6.1: Actions Taken Work Log — Desktop Table View](../../artifacts/lab-04/report-images/p6-01-actions-taken-list-desktop.png)
*Figure 6.1: Actions Taken 8-column table on ticket TK-001003 displaying 3 distinct actions performed across multiple staff members (Frank Gao, Eileen Ford, Dan Das). Satisfies AC-01, AC-07, BR-02.*

![Figure 6.2: Actions Taken Work Log — Tablet Card View](../../artifacts/lab-04/report-images/p6-02-actions-taken-list-tablet.png)
*Figure 6.2: Actions Taken responsive card layout on tablet viewport (820px) preserving all action metadata and badges. Satisfies RESP-02.*

![Figure 6.3: Actions Taken Work Log — Mobile Card View](../../artifacts/lab-04/report-images/p6-03-actions-taken-list-mobile.png)
*Figure 6.3: Actions Taken responsive mobile card view (390px) with clean vertical stacking and zero clipping. Satisfies RESP-03.*

![Figure 6.4: Record Action Form (Create Mode)](../../artifacts/lab-04/report-images/p6-04-actions-taken-create-form.png)
*Figure 6.4: Record Action modal/form showing prefilled Action Date/Time, automatic performer attribution note, description field, and follow-up checkboxes. Satisfies AC-01, BR-03.*

![Figure 6.5: Validation Error: Follow-up Note Required](../../artifacts/lab-04/report-images/p6-05-actions-taken-followup-validation.png)
*Figure 6.5: Inline near-field validation feedback when Follow-Up Required is checked but Follow-up Note is left blank. Satisfies AC-04, BR-05.*

![Figure 6.6: Validation Error: Action Description Required](../../artifacts/lab-04/report-images/p6-09-actions-taken-empty-description-validation.png)
*Figure 6.6: Inline near-field validation feedback when submitting an action with empty Description. Satisfies BR-06.*

![Figure 6.7: Edit Action Mode](../../artifacts/lab-04/report-images/p6-06-actions-taken-edit-mode.png)
*Figure 6.7: Edit Action panel showing prefilled action data, editable result/notes, and read-only performer attribution. Satisfies AC-09, BR-03.*

![Figure 6.8: Actions Taken Zero State (No Actions)](../../artifacts/lab-04/report-images/p6-08-actions-taken-zero-state.png)
*Figure 6.8: Actions Taken section on ticket TK-001008 displaying the clean zero-record state: "No actions recorded yet." Satisfies UI-TA-01.*

![Figure 6.9: Requester Read-Only View of Actions Taken](../../artifacts/lab-04/report-images/p6-07-actions-taken-requester-readonly.png)
*Figure 6.9: Requester session (Carol Chen) viewing ticket TK-001003. All 3 actions are visible read-only without Record Action or Edit controls. Satisfies AC-06, BR-04.*

![Figure 6.10: Direct API Security: Requester Write Forbidden (403)](../../artifacts/lab-04/report-images/p6-10-actions-taken-forbidden-api.png)
*Figure 6.10: Direct API request verifying that a Requester calling POST /api/staff/tickets/:id/actions receives 403 Forbidden without modifying database records. Satisfies AC-05, BR-04.*

---

## Answer Part 7: Working Ticket Workflow

**Summary:**  
Part 7 demonstrates the enforcement of the final 8-status Ticket transition matrix and resolution rules ([`server/src/staffTicketDetail.ts`](https://github.com/Achikan/TokTickIT/blob/main/server/src/staffTicketDetail.ts)). The UI renders only status transition buttons permitted for the ticket's current status and user's role. Transitioning to `RESOLVED` strictly enforces the resolution gate (at least one recorded Action Taken). Requester indications ("Problem Appears Resolved") are recorded as advisory notes only and never alter the official status badge.

### Status Transition Matrix Summary (§5.2):
- `NEW` $\rightarrow$ `OPEN`, `CANCELLED`
- `OPEN` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
- `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_REQUESTER`, `RESOLVED` (Gate: $\ge 1$ Action), `CANCELLED`
- `WAITING_FOR_REQUESTER` $\rightarrow$ `IN_PROGRESS`, `RESOLVED` (Gate: $\ge 1$ Action), `CANCELLED`
- `RESOLVED` $\rightarrow$ `CLOSED`, `REOPENED`
- `CLOSED` $\rightarrow$ `REOPENED`
- `REOPENED` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED` (Gate: $\ge 1$ Action), `CANCELLED`
- `CANCELLED` $\rightarrow$ Terminal state (no transitions permitted)

### Evidence Screenshots — Ticket Workflow & Resolution

![Figure 7.1: Permitted Status Transition Controls on IN_PROGRESS Ticket](../../artifacts/lab-04/report-images/p7-01-workflow-status-transitions.png)
*Figure 7.1: Ticket Detail for TK-001003 (status: IN_PROGRESS) offering only legal transitions: "Set Waiting for Requester", "Resolve", and "Cancel Ticket". Satisfies AC-11, AC-16, BR-08.*

![Figure 7.2: Requester Advisory Resolution Indication Banner](../../artifacts/lab-04/report-images/p7-02-workflow-requester-advisory.png)
*Figure 7.2: Requester advisory note confirmation: "Your note was recorded for IT Staff. The ticket status has not changed." Official status badge remains unchanged. Satisfies AC-13, BR-10.*

![Figure 7.3: Resolution Gate Enforcement (409 RESOLUTION_GATE)](../../artifacts/lab-04/report-images/p7-03-workflow-resolution-gate-rejection.png)
*Figure 7.3: Backend enforcement of BR-11: Attempting to resolve a ticket with zero recorded actions returns 409 Conflict with code RESOLUTION_GATE. Satisfies AC-15, BR-11.*

![Figure 7.4: Forbidden Transition Matrix Enforcement (409 FORBIDDEN_TRANSITION)](../../artifacts/lab-04/report-images/p7-04-workflow-forbidden-transition-api.png)
*Figure 7.4: Backend enforcement of BR-08: Attempting an illegal transition (e.g. from terminal CANCELLED to OPEN) returns 409 Conflict with code FORBIDDEN_TRANSITION. Satisfies AC-11, BR-08.*

---

## Answer Part 8: Requester Dashboard and Final Regression UI

**Summary:**  
Part 8 demonstrates the Requester Dashboard (`/requester/dashboard`) and verifies zero regression across all pre-existing capabilities from Labs 1, 2, and 3. The Requester Dashboard displays metrics (RD-01 open tickets, RD-02 waiting for me, RD-03 recently updated, RD-04 recently resolved) scoped strictly to the authenticated user's session without cross-user leakage. Fresh users (Ivy Ing) render clean zero-states. All core regressions—authentication, role routing, attachments, public comments, internal notes, and admin user management—remain fully operational and tested.

### Evidence Screenshots — Requester Dashboard & Ownership Protection

![Figure 8.1: Requester Dashboard — Desktop View (1280px)](../../artifacts/lab-04/report-images/p8-01-requester-dashboard-desktop.png)
*Figure 8.1: Requester Dashboard for Carol Chen on Desktop (1280px) displaying session-scoped metrics and recent ticket summaries. Satisfies AC-02, AC-21.*

![Figure 8.2: Requester Dashboard — Tablet View (820px)](../../artifacts/lab-04/report-images/p8-02-requester-dashboard-tablet.png)
*Figure 8.2: Requester Dashboard on Tablet viewport (820px) showing 2-column responsive layout without horizontal scrolling. Satisfies RESP-02.*

![Figure 8.3: Requester Dashboard — Mobile View (390px)](../../artifacts/lab-04/report-images/p8-03-requester-dashboard-mobile.png)
*Figure 8.3: Requester Dashboard on Mobile viewport (390px) showing stacked cards and full-width touch targets. Satisfies RESP-03.*

![Figure 8.4: Drill-Down from Dashboard to My Tickets](../../artifacts/lab-04/report-images/p8-04-requester-dashboard-drilldown-mytickets.png)
*Figure 8.4: Seamless navigation to My Tickets upon clicking the My Open Tickets card with appropriate filter applied. Satisfies AC-21.*

![Figure 8.5: Requester Zero-State Dashboard (Ivy Ing)](../../artifacts/lab-04/report-images/p8-05-requester-dashboard-zero-state.png)
*Figure 8.5: Clean zero-state display for fresh requester Ivy Ing: all metrics display 0 and empty list state is rendered clearly. Satisfies AC-21, BR-17.*

![Figure 8.6: Database Query Verification vs. Requester Dashboard Metrics](../../artifacts/lab-04/report-images/p8-06-requester-dashboard-db-comparison.png)
*Figure 8.6: Direct verification table comparing Carol Chen's dashboard metrics against direct PostgreSQL query counts (RD-01..RD-04). All values match 100%.*

![Figure 8.7: Requester Ticket Ownership Protection (404 Non-Disclosing)](../../artifacts/lab-04/report-images/p8-07-requester-foreign-ticket-404.png)
*Figure 8.7: API verification of AC-06 and BR-21: Alice Anderson attempting to access Carol Chen's ticket receives a non-disclosing 404 Not Found.*

### Comprehensive Full-Stack Regression Summary Table (Labs 1–3)

| Functional Area | Regression Verification Scope | Automated Test Suite | Status |
|---|---|---|---|
| **Authentication & Session** | Session cookie lifecycle, login/logout, password change enforcement | `server/tests/lab-03/auth.api.test.ts`, `Login.test.tsx` | **Passed** |
| **Role-Based Navigation** | Requester / IT Staff / Administrator destination filtering | `client/tests/lab-03/Login.test.tsx`, `AppShell.test.tsx` | **Passed** |
| **Ticket Creation (Lab 2)** | Near-field validation, category/system selection, priority | `server/tests/lab-02/tickets.test.ts`, `CreateTicket.test.tsx` | **Passed** |
| **My Tickets List (Lab 2)** | Requester ticket isolation, status badges, responsive cards | `client/tests/lab-02/MyTickets.test.tsx` | **Passed** |
| **Attachments (Lab 2)** | Upload, download, soft removal with reason, 410 tombstone | `server/tests/lab-02/attachments.api.test.ts`, `AttachmentSection.test.tsx` | **Passed** |
| **Public Comments (Lab 3)** | Public communication thread, timestamp, author attribution | `server/tests/lab-03/comments-notes.api.test.ts` | **Passed** |
| **Internal Notes (Lab 3)** | IT Staff-only private notes, strictly hidden from Requesters | `server/tests/lab-03/comments-notes.api.test.ts` | **Passed** |
| **Staff Queue (Lab 3)** | Search, multi-criteria filtering, sorting, pagination | `server/tests/lab-03/staff-queue.api.test.ts`, `StaffTicketQueue.test.tsx` | **Passed** |
| **Staff Ticket Detail (Lab 3)**| Assignment, IT priority update, ownership claim/reassign | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Passed** |
| **Admin User Mgmt (Lab 3)** | User CRUD, role management, last-admin safety protection | `server/tests/lab-03/admin-users.api.test.ts`, `UserManagement.test.tsx` | **Passed** |

---

## Answer Part 9: Zen Green UI, Responsive, Accessibility, Final Polish

**Summary:**  
Part 9 demonstrates that the final TokTickIT product adheres to the Zen Green design system across all screens and satisfies accessibility standards. Visual styles avoid relying solely on color (combining text labels, icons, and badges). All interactive elements support visible focus rings and keyboard navigation. Forms provide near-field validation with ARIA live regions. Viewports were comprehensively inspected at Desktop (1280px), Tablet (820px), and Mobile (390px) without content clipping, modal overflow, or horizontal scrolling.

### Complete Visual and Accessibility Checklist (§10 & §14)

- [x] **Zen Green Design Consistency:** Primary accents use `#2e7d32`, muted badges use `#e8f5e9`, and status badges follow standardized `.badge-status-*` tokens.
- [x] **Non-Color Status Cues:** Every status badge combines explicit text labels with distinct icons/styling (no information conveyed by color alone).
- [x] **Semantic Controls:** Metric cards are semantic `<a>` tags with accessible names; transition buttons are real `<button>` elements with keyboard focus.
- [x] **Near-Field Validation:** Validation messages appear immediately adjacent to invalid fields with `aria-describedby` linkage; entered form data is preserved after recoverable errors.
- [x] **Editable vs. Read-Only Distinction:** Performed By is visually and behaviorally styled as a distinct read-only metadata badge (`.readonly-field`), never a text input.
- [x] **Zero Horizontal Scroll:** Explicitly verified at 1280px, 1024px, 820px, and 390px viewports (`scrollWidth <= clientWidth + 1`).
- [x] **Clean Console & Assets:** Zero browser console errors, zero broken links, zero placeholder text, and obsolete Lab 1–3 UI remnants completely removed.

### Evidence Screenshots — UI Specification & Responsive Polish

![Figure 9.1: Rendered ui-spec.md Specification](../../artifacts/lab-04/report-images/p9-01-rendered-ui-spec.png)
*Figure 9.1: Rendered docs/lab-04/ui-spec.md showing Zen Green tokens, screen states, responsive rules, and visual checklist.*

---

### Conclusion & Final Handover
Sprint 4 completes the full product lifecycle for **TokTickIT**: Actions Taken work logs provide transparent line-by-line task tracking; the 8-status transition matrix and resolution gate enforce service-desk integrity; role-tailored dashboards provide operational visibility without cluttering detailed workflows; and comprehensive regression testing guarantees stability across all features built throughout Labs 1 to 4.

