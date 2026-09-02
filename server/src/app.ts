import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// GET /api/categories -> read categories from PostgreSQL via Prisma,
//   returning each { id, name } in predictable (id) order.
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({ orderBy: { id: "asc" } });
    res.status(200).json(categories.map(({ id, name }) => ({ id, name })));
  } catch {
    res.status(500).json({ error: "Unable to load categories" });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Development Requester context (testing-only "login")
// GET /api/development-requesters -> only ACTIVE requesters, in id order.
// The inactive requester must never appear in the selection dropdown.
// ---------------------------------------------------------------------------
app.get("/api/development-requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json({
      items: requesters.map(({ id, name, email }) => ({ id, name, email })),
    });
  } catch {
    res.status(500).json({ error: "Unable to load development requesters" });
  }
});

export default app;
