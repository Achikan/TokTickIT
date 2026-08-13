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
 │   └── tests/lab-01/        # Supertest API tests
 ├── docs/lab-01/             # ai_use.md, reviewer.md, tests.md
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
npx prisma db seed          # insert the four default categories
npm run dev                 # API on http://localhost:3000
```

### 2. Frontend (client/)

```bash
cd client
cp .env.example .env        # VITE_API_URL must point at the API
npm install
npm run dev                 # Vite dev server
```

Open the Vite URL (default http://localhost:5173), click **Check System** and you
should see the system status and the four supported request categories loaded
from PostgreSQL.

### Tests

```bash
cd server && npm test       # Supertest API tests (Vitest)
cd client && npm test       # UI tests (Vitest + Testing Library)
```
