# TokTickIT

IT service desk application built across Labs 1–4 of CPE 334: Introduction to Software Engineering in the Age of AI Agents.

Full-stack vertical slice: React + TypeScript + Vite + Bootstrap (client) → Express + TypeScript (server) → Prisma ORM → PostgreSQL. Lab 3 replaces Development Requesters with a session-authenticated `User` model (roles: `REQUESTER`, `IT_STAFF`, `ADMIN`) and adds the IT Staff ticket queue, ticket detail, and Administrator user management.

## Repository structure

```
toktickit/
 ├── client/                  # React + Vite + Bootstrap frontend
 ├── server/                  # Node.js + Express + TypeScript backend
 │   ├── prisma/              # Prisma schema, migrations, seed
 │   ├── src/                 # Express app and routes
 │   └── tests/lab-01..03     # Supertest API tests (Lab 3: auth, staff queue, ticket detail, users admin)
 ├── e2e/lab-02, lab-03/      # Playwright E2E + responsive + accessibility specs
 ├── scripts/                 # Playwright screenshot generators (screenshots*.mjs, screenshots-lab3.mjs)
 ├── docs/lab-01/             # ai_use.md, reviewer.md, tests.md
 ├── docs/lab-02/             # specification.md, api-spec.md, ui-spec.md, tests.md,
 │                            #   reviewer.md, ai-use.md, visual-inspection.md
 ├── docs/lab-03/             # specification.md, api-spec.md, ui-spec.md, tests.md,
 │                            #   reviewer.md, ai-use.md, visual-inspection.md
 ├── artifacts/lab-02/screenshots/  # evidence PNGs (create-ticket, my-tickets, ticket-detail,
 │                            #   create-ticket-states, part-1..8 evidence, attachments, ...)
 ├── artifacts/lab-03/screenshots/  # evidence PNGs (authentication, staff-queue,
 │                            #   staff-ticket-detail, user-management × desktop/tablet/mobile)
 ├── playwright.config.ts     # E2E projects: desktop/tablet/mobile
 ├── package.json             # root scripts: test:e2e, screenshots, screenshots:lab3
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

Open the Vite URL (default http://localhost:5173). Select a Development Requester,
then use the app (Lab 2):

- **Create Ticket** — pick a category / related system, enter subject + description,
  and upload attachments; validation errors appear next to the field; a `TK-######`
  ticket number is generated.
- **My Tickets** — search, filter, sort, and paginate the requester's own tickets.
- **Ticket Detail** — view an ownership-scoped ticket with its attachment list,
  upload/download, and soft-remove.

A **Health Check** of the API is available at http://localhost:3000/api/health.

Lab 3 replaces the Development Requester flow with **session authentication** — sign in to
`http://localhost:5173` with a seeded account:

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

### Tests

```bash
cd server && npm test       # Supertest API tests (Vitest)
cd client && npm test       # UI tests (Vitest + Testing Library)
npm run test:e2e            # Playwright E2E + responsive (root; starts the client on :5173).
                            # Start the API first on :3000 with `cd server && npm run dev`.
npm run screenshots         # regenerate desktop/tablet/mobile evidence PNGs into artifacts/
npm run screenshots:lab3     # regenerate the Lab 3 evidence PNGs into artifacts/lab-03/screenshots/
```

Lab 3 test results: server 176 passed | 2 todo, client 93/93, E2E + responsive + accessibility
25/25 (see `docs/lab-03/tests.md`).
```
