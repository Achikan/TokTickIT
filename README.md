# TokTickIT

IT service desk application built across Labs 1–4 of CPE 334: Introduction to Software Engineering in the Age of AI Agents.

Full-stack vertical slice: React + TypeScript + Vite + Bootstrap (client) → Express + TypeScript (server) → Prisma ORM → PostgreSQL.

## Repository structure

```
toktickit/
 ├── client/                  # React + Vite + Bootstrap frontend
 ├── server/                  # Node.js + Express + TypeScript backend
 │   ├── prisma/              # Prisma schema, migrations, seed
 │   ├── src/                 # Express app and routes
 │   └── tests/lab-01, lab-02 # Supertest API tests (Lab 2: create/my-tickets/ticket-detail/attachments)
 ├── e2e/lab-02/              # Playwright E2E + responsive specs
 ├── scripts/                 # Playwright screenshot generators (screenshots*.mjs)
 ├── docs/lab-01/             # ai_use.md, reviewer.md, tests.md
 ├── docs/lab-02/             # specification.md, api-spec.md, ui-spec.md, tests.md,
 │                            #   reviewer.md, ai-use.md, visual-inspection.md
 ├── artifacts/lab-02/screenshots/  # evidence PNGs (create-ticket, my-tickets, ticket-detail,
 │                            #   create-ticket-states, part-1..8 evidence, attachments, ...)
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

Open the Vite URL (default http://localhost:5173). Select a Development Requester,
then use the app (Lab 2):

- **Create Ticket** — pick a category / related system, enter subject + description,
  and upload attachments; validation errors appear next to the field; a `TK-######`
  ticket number is generated.
- **My Tickets** — search, filter, sort, and paginate the requester's own tickets.
- **Ticket Detail** — view an ownership-scoped ticket with its attachment list,
  upload/download, and soft-remove.

A **Health Check** of the API is available at http://localhost:3000/api/health.

### Tests

```bash
cd server && npm test       # Supertest API tests (Vitest)
cd client && npm test       # UI tests (Vitest + Testing Library)
npm run test:e2e            # Playwright E2E + responsive (root; starts the client on :5173).
                            # Start the API first on :3000 with `cd server && npm run dev`.
npm run screenshots         # regenerate desktop/tablet/mobile evidence PNGs into artifacts/
```

Lab 2 test results: server 52/52, client 51/51, E2E + responsive 11/11 (see
`docs/lab-02/tests.md`).
```
