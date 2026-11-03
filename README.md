# TokTickIT

IT service desk application built across Labs 1–4 of CPE 334: Introduction to Software Engineering in the Age of AI Agents.

Full-stack vertical slice: React + TypeScript + Vite + Bootstrap (client) → Express + TypeScript (server) → Prisma ORM → PostgreSQL. Lab 3 added session authentication (`REQUESTER`, `IT_STAFF`, `ADMIN`), staff queue, and user management. Lab 4 completes the service-desk workflow with Actions Taken, ticket resolution gates, status transition matrix, and role-tailored dashboards for Requesters and IT Staff.

## Repository structure

```
toktickit/
 ├── client/                  # React + Vite + Bootstrap frontend
 ├── server/                  # Node.js + Express + TypeScript backend
 │   ├── prisma/              # Prisma schema, migrations, seed
 │   ├── src/                 # Express app and routes
 │   └── tests/lab-01..04     # Supertest API tests (Lab 4: actions-taken, workflow, dashboards)
 ├── e2e/lab-02, lab-03/      # Playwright E2E + responsive + accessibility specs
 ├── scripts/                 # Playwright screenshot generators (screenshots*.mjs)
 ├── docs/lab-01/             # ai_use.md, reviewer.md, tests.md
 ├── docs/lab-02/             # specification.md, api-spec.md, ui-spec.md, tests.md, reviewer.md, ai-use.md
 ├── docs/lab-03/             # specification.md, api-spec.md, ui-spec.md, tests.md, reviewer.md, ai-use.md
 ├── docs/lab-04/             # specification.md, api-spec.md, ui-spec.md, tests.md
 ├── artifacts/lab-02/screenshots/  # evidence PNGs (create-ticket, my-tickets, ticket-detail)
 ├── artifacts/lab-03/screenshots/  # evidence PNGs (authentication, staff-queue, staff-ticket-detail, user-mgmt)
 ├── artifacts/lab-04/test-output/  # test evidence (server-tsc, server-vitest-all, client-tsc, client-vitest-all)
 ├── playwright.config.ts     # E2E projects: desktop/tablet/mobile
 ├── package.json             # root scripts: test:e2e, screenshots
 ├── .gitignore
 └── README.md
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL (this project was developed against Postgres.app on port `5435`)

## Setup

### 1. Backend (server/)

```bash
cd server
cp .env.example .env        # then edit DATABASE_URL / PORT for your machine
npm install
npx prisma migrate dev      # create the database schema
npx prisma db seed          # insert categories, related systems, and requesters
npm run dev                 # API on http://localhost:3000
```

### 2. Frontend (client/)

```bash
cd client
cp .env.example .env        # VITE_API_URL must point at the API
npm install
npm run dev                 # Vite dev server
```

Open the Vite URL (default http://localhost:5173), sign in with a seeded account,
then use the app (Lab 2 requester flows):

- **Create Ticket** — pick a category / related system, enter subject + description,
  and upload attachments; validation errors appear next to the field; a `TK-######`
  ticket number is generated.
- **My Tickets** — search, filter, sort, and paginate the requester's own tickets.
- **Ticket Detail** — view an ownership-scoped ticket with its attachment list,
  upload/download, and soft-remove.

A **Health Check** of the API is available at http://localhost:3000/api/health.

Lab 3 replaces the Development Requester flow with **session authentication** — sign in to
`http://localhost:5173` with a seeded account:

> The credentials below are local development / seed data only (`npx prisma db seed`, see `prisma/seed.ts`) and are never used in production.

| Role | Email | Password |
|---|---|---|
| Administrator | `henri.ito@example.com` | `DevPass!23` |
| IT Staff | `dan.das@example.com` | `DevPass!23` |
| Requester | seeded requesters (e.g. `alice.adams@example.com` …) | initial `LostPass!23`, changed on first login |

Then use the app (Lab 3):

- **Login / Mandatory Change Password** — session cookie auth with Argon2id-hashed
  passwords; first login forces a password change per the password policy.
- **IT Staff Ticket Queue** — searchable/filterable/sortable paginated queue; open a ticket
  to claim it, set IT Priority / Status (permitted transitions only), post Public Comments
  and Internal Notes, and manage attachments.
- **Administrator User Management** — list/search/filter users, create users, edit,
  set-initial-password, activate/deactivate (with BR safety rules, e.g. no self-deactivation
  and at least one active Administrator).

Then use the app (Lab 4):

- **IT Staff Dashboard** — operational metrics (unassigned, assigned to me, status/priority
  breakdowns, recently updated tickets) with one-click drill-downs to the Ticket Queue.
  Administrator views include user account metrics.
- **Requester Dashboard** — personal ticket metrics (open, waiting for requester, recently
  resolved, closed) with drill-down links to filtered My Tickets.
- **Actions Taken on Ticket Detail** — staff records work history lines with action date,
  description, result, auto-assigned performer, and conditional follow-up note; requesters
  have read-only visibility.
- **Ticket Workflow & Resolution Gate** — status transitions strictly follow the
  transition matrix with optimistic concurrency checks (`expectedUpdatedAt`); resolving
  a ticket requires at least one recorded Action Taken.

### Tests & Evidence Generation

```bash
cd server && npm test       # Supertest API tests (Vitest)
cd client && npm test       # UI tests (Vitest + Testing Library)
npm run test:e2e:lab4       # Playwright E2E tests for Lab 4 (Actions Taken, Workflow, Dashboards)
npm run screenshots:lab4    # Capture responsive evidence screenshots for Lab 4
npm run evidence:lab4       # Generate authoritative DB vs API verification tables & 409/403/404 API error evidence
npm run pdf:lab4            # Build the Lab 4 PDF submission report
```

Lab 4 test results:
- **Server:** 25 files / 330 tests passed (100% green, see `artifacts/lab-04/test-output/server-vitest-all.txt`).
- **Client:** 19 files / 139 tests passed (100% green, see `artifacts/lab-04/test-output/client-vitest-all.txt`).
- **E2E:** 4 specs passed (100% green, covering actions taken, resolution gate, and staff/requester dashboards).
- Both `server` and `client` typecheck clean (`tsc --noEmit`, exit code 0).
