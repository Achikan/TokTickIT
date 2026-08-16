# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | ✅ PASS |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | ✅ PASS |
| 3 | Vitest | Heading renders | ✅ PASS |
| 4 | Vitest | Success state shows Online + category list | ✅ PASS |
| 5 | Vitest | Error state shows Offline + message | ✅ PASS |
| 6 | Vitest | Seed inserts the four categories | ✅ PASS |
| 7 | Vitest | Seed is idempotent (no duplicates on re-run) | ✅ PASS |

## Test files

- `server/tests/lab-01/health.test.ts` — Supertest: GET /api/health
- `server/tests/lab-01/categories.test.ts` — Supertest: GET /api/categories
- `server/tests/lab-01/seed.test.ts` — Vitest: category seed (2 tests)
- `client/tests/lab-01/App.test.tsx` — Vitest + Testing Library: UI (3 tests)

## Result: all 7 tests pass

Server: `cd server && npm test`

```
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/seed.test.ts (2 tests)
 ✓ tests/lab-01/categories.test.ts (1 test)
 Test Files  3 passed (3)
      Tests  4 passed (4)
```

Client: `cd client && npm test`

```
 ✓ tests/lab-01/App.test.tsx (3 tests)
 Test Files  1 passed (1)
      Tests  3 passed (3)
```