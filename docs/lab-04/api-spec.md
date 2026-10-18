# Lab 4 REST API Contract

> Base URL: `/api`. All request/response bodies are JSON unless noted. Authenticated sessions use the HttpOnly, SameSite=Strict cookie `tok_session`. This document **extends** `docs/lab-03/api-spec.md` (authentication, reference data, requester ticket/attachment, comments/notes, queue/detail/owner/priority, and admin user-management contracts remain in force unchanged). Client-supplied performer or requester identity is never trusted (specification BR-03/BR-16).

## 0. Conventions (inherited + Lab 4 additions)

- Error envelope (unchanged): `{ "error": { "code": "...", "message": "...", "fields": {...} } }`.
- Status codes: `200` success/update, `201` created, `400` validation (with `fields`), `401` unauthenticated, `403` forbidden for role, `404` missing **or foreign** resource (non-disclosing), `409` conflict, `500` safe generic.
- **Timestamps** are ISO-8601 UTC strings in every response (unchanged convention).
- **Concurrency (Lab 4)**: mutating requests that can lose a concurrent update require the client's last-read `updatedAt` of the affected row as `expectedUpdatedAt` (ISO string, required). A mismatch returns `409` with `error.code = "STALE_UPDATE"` and performs no write (specification BR-12, D-1). Affected endpoints: `PATCH /api/staff/tickets/:id/status`, `PATCH /api/staff/tickets/:id/actions/:actionId`. Issue 32 updates the Lab 3 client and any affected Lab 3 tests to send the field in the same change, keeping regression green.
- **Conflict error codes** (`error.code` inside `409`):

Code | Meaning
---|---
`FORBIDDEN_TRANSITION` | Status change not in the specification §5.2 matrix (or wrong role gate).
`RESOLUTION_GATE` | Attempt to set `RESOLVED` while the Ticket has zero Actions (BR-11).
`STALE_UPDATE` | `expectedUpdatedAt` does not match the stored value (BR-12).
`DUPLICATE_ACTION` | Identical action (actor + ticket + trimmed description) within 5 minutes (BR-13, D-7).
| (existing Lab 3 codes) | `DUPLICATE_EMAIL`, `SELF_DEACTIVATION`, `LAST_ADMIN` unchanged.

## 1. Actions Taken

### 1.1 Create Action Taken

`POST /api/staff/tickets/:id/actions` (IT Staff/Admin only)

Request:
```json
{
  "actionDateTime": "2026-10-18T09:30:00.000Z",
  "actionDescription": "Replaced the battery and ran diagnostics for 30 minutes.",
  "result": "Battery health now 94%; no thermal throttling observed.",
  "followUpRequired": true,
  "followUpNote": "Check with the requester in 3 days whether drain persists.",
  "attachmentNotes": "battery-report.png — screenshot of the final diagnostic tab"
}
```

- `actionDateTime` optional (defaults to server `now()`); if provided it must be a valid timestamp within `[Ticket.createdAt − 30 days, now + 24 hours]` (specification D-6) → `400` otherwise.
- `actionDescription` required, non-empty after trim, ≤ 2,000 chars (BR-06).
- `result`, `attachmentNotes` optional, ≤ 2,000 trimmed chars each.
- `followUpRequired` boolean, default `false`. If `true`, `followUpNote` is required, non-empty after trim, ≤ 2,000 chars (BR-05) → `400` with `fields.followUpNote`.
- **`performedById` is not accepted** from the client (BR-03); it is the session user, who must be an active IT Staff/Administrator — a deactivated account's session is already invalid (`401`).
- Creating an Action updates the Ticket's `updatedAt` (so "recently updated" metrics reflect work activity).

Success `201`:
```json
{
  "action": {
    "id": 12, "ticketId": 42,
    "actionDateTime": "2026-10-18T09:30:00.000Z",
    "actionDescription": "Replaced the battery and ran diagnostics for 30 minutes.",
    "result": "Battery health now 94%; no thermal throttling observed.",
    "performedBy": { "id": 7, "name": "Dan Engineer", "role": "IT_STAFF" },
    "followUpRequired": true,
    "followUpNote": "Check with the requester in 3 days whether drain persists.",
    "attachmentNotes": "battery-report.png — screenshot of the final diagnostic tab",
    "createdAt": "2026-10-18T09:31:02.000Z", "updatedAt": "2026-10-18T09:31:02.000Z"
  },
  "ticket": { "id": 42, "currentStatus": "IN_PROGRESS", "updatedAt": "2026-10-18T09:31:02.000Z", "actionsCount": 1 }
}
```
(the `ticket` summary lets the client refresh status/recency without a second fetch)

Errors: `400` validation (incl. date bounds, follow-up gate), `401`, `403` Requester (BR-04), `404` missing/foreign Ticket (non-disclosing), `409 DUPLICATE_ACTION`, `500`.

### 1.2 Update Action Taken

`PATCH /api/staff/tickets/:id/actions/:actionId` (IT Staff/Admin only)

Request (all fields optional; only provided fields change; `expectedUpdatedAt` required):
```json
{
  "result": "Confirmed fixed after retest.",
  "followUpRequired": false,
  "followUpNote": null,
  "expectedUpdatedAt": "2026-10-18T09:31:02.000Z"
}
```

- Same validation rules as create, evaluated on the **merged** result (e.g. clearing `followUpRequired` to `false` clears the note requirement; keeping `true` requires a non-empty note).
- `actionDescription` and `actionDateTime` are also editable; `performedBy` is **never** editable (BR-03, D-4: no delete — corrections by edit only).
- `expectedUpdatedAt` must match the stored action `updatedAt` → otherwise `409 STALE_UPDATE` (BR-12).

Success `200`: `{ "action": { ...updated row with performedBy... } }`.
Errors: `400`, `401`, `403`, `404` (missing/foreign action or ticket), `409 STALE_UPDATE`.

### 1.3 List Actions Taken

`GET /api/tickets/:id/actions`

- **Requester**: only for an owned Ticket (BR-04); foreign/missing → non-disclosing `404`.
- **IT Staff/Admin**: any accessible Ticket.
- No query parameters; ordering is fixed: `actionDateTime` descending, ties by `id` descending (BR-07).

Success `200`:
```json
{
  "items": [
    {
      "id": 12, "ticketId": 42,
      "actionDateTime": "2026-10-18T09:30:00.000Z",
      "actionDescription": "…", "result": "…",
      "performedBy": { "id": 7, "name": "Dan Engineer", "role": "IT_STAFF" },
      "followUpRequired": true, "followUpNote": "…", "attachmentNotes": "…",
      "createdAt": "…", "updatedAt": "…"
    }
  ]
}
```
Empty Ticket → `200 { "items": [] }` (zero-record behavior is part of the contract; the UI shows its empty state). Errors: `401`, `403` (role), `404`.

## 2. Ticket Workflow

### 2.1 Status Transition (extended)

`PATCH /api/staff/tickets/:id/status` (IT Staff/Admin only)

Request:
```json
{ "newStatus": "RESOLVED", "expectedUpdatedAt": "2026-10-18T09:31:02.000Z" }
```

- `newStatus` must be a valid enum value; the transition must be permitted by the specification §5.2 matrix for the current status.
- **Resolution gate** (BR-11): transitions to `RESOLVED` additionally require `actionsCount ≥ 1` on the Ticket; otherwise `409 RESOLUTION_GATE`.
- `expectedUpdatedAt` (required, §0) must match the Ticket's stored `updatedAt`; otherwise `409 STALE_UPDATE` with no write.
- Success `200` returns the updated Ticket summary so the client refreshes in place:
```json
{ "ticket": { "id": 42, "ticketNumber": "TK-000042", "currentStatus": "RESOLVED",
  "owner": { "id": 7, "name": "Dan Engineer" },
  "updatedAt": "2026-10-18T10:00:00.000Z", "actionsCount": 1,
  "requesterIndicatedResolvedAt": null } }
```
Errors: `400` invalid enum / missing `expectedUpdatedAt`, `401`, `403` role (incl. any Requester attempt), `404`, `409` with `FORBIDDEN_TRANSITION` | `RESOLUTION_GATE` | `STALE_UPDATE`, `500`. A Requester attempt is `403`, never `409` (specification §5.1).

### 2.2 Requester Advisory Indication (unchanged)

`POST /api/tickets/:id/resolved-indication` (Requester, own Ticket) — unchanged from lab-03 api-spec §4.3: idempotent, sets `requesterIndicatedResolvedAt`, **never changes `currentStatus`** (BR-10/FR-10). UI messaging clarified in ui-spec §6.

### 2.3 Staff Detail additions

`GET /api/staff/tickets/:id` (unchanged path) now additionally includes `actionsCount` and the Ticket's current `updatedAt` in its payload (the existing concurrency anchor). No other Lab 3 field is removed.

## 3. Dashboards

Both dashboards are single `GET`s returning metrics + capped lists + drill-down parameters — never full Ticket collections (specification D-8, sheet §6.2). All counts are computed by the backend from authoritative data (BR-14); "recent" = last 7 days in UTC against the database clock (BR-15/D-5). List items are capped at **5**.

Common item shape for Ticket references inside dashboards:
```json
{ "id": 42, "ticketNumber": "TK-000042", "summary": "Laptop battery drains quickly",
  "currentStatus": "IN_PROGRESS", "itPriority": "HIGH",
  "owner": { "id": 7, "name": "Dan Engineer" },
  "updatedAt": "2026-10-18T09:31:02.000Z" }
```
(`owner` is `null` for unassigned Tickets — clients render "Unassigned".)

### 3.1 IT Staff Dashboard

`GET /api/staff/dashboard` (IT Staff/Admin; `403` for Requester, `401` unauthenticated)

Success `200`:
```json
{
  "generatedAt": "2026-10-18T10:05:00.000Z",
  "metrics": {
    "unassignedCount": 3,
    "ownedByMeCount": 5,
    "byStatus": { "NEW": 2, "OPEN": 4, "IN_PROGRESS": 3, "WAITING_FOR_REQUESTER": 1,
      "RESOLVED": 6, "CLOSED": 10, "REOPENED": 1, "CANCELLED": 2 },
    "byPriority": { "LOW": 2, "MEDIUM": 5, "HIGH": 4, "URGENT": 2 }
  },
  "recentlyUpdated": { "items": [ /* ≤5 item objects, newest updatedAt first */ ] },
  "urgentHigh": { "items": [ /* ≤5 active-status items, URGENT before HIGH */ ] },
  "drilldown": {
    "unassigned": "/api/staff/tickets?ownerId=unassigned",
    "ownedByMe": "/api/staff/tickets?ownerId=me",
    "byStatus": "/api/staff/tickets?status={status}",
    "byPriority": "/api/staff/tickets?itPriority={priority}",
    "recentlyUpdated": "/api/staff/tickets?sort=-updatedAt"
  }
}
```

- `unassignedCount` (SD-01): active-status Tickets with `ownerId = null`.
- `ownedByMeCount` (SD-02): active-status Tickets owned by the session user.
- `byStatus` (SD-03): counts across **all** Tickets per status (all 8 keys always present).
- `byPriority` (SD-04): active-status Tickets grouped by `itPriority` (all 4 keys always present).
- `recentlyUpdated` (SD-05): all-status Tickets with `updatedAt ≥ now − 7d`, newest first, capped 5.
- `urgentHigh` (SD-06): active-status Tickets with `itPriority ∈ {URGENT, HIGH}`, URGENT first, capped 5.
- Active statuses = `NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED` (specification §5.3).
- **Empty behavior**: counts `0`, all enum keys present with `0`, empty `items` arrays — HTTP stays `200` (the UI renders zero-states; BR-17).
- **Administrator**: identical payload plus
```json
"userCounts": { "total": 12, "active": 11 }
```
(AD-01; concise only — the full list stays in User Management.)

### 3.2 Queue filter support for drill-downs

`GET /api/staff/tickets` (lab-03 api-spec §6.1) gains one alias so dashboard drill-downs are one click:
- `ownerId=me` → resolved server-side to the session user's id (same result as `ownerId=<their id>`).
- All other documented queue parameters (`status`, `itPriority`, `requestedPriority`, `categoryId`, `ownerId=unassigned|<id>`, `search`, `sort`, `page`, `pageSize`) already exist and remain the drill-down vocabulary. Invalid values still return `400` (never silently ignored).

### 3.3 Requester Dashboard

`GET /api/requester/dashboard` (Requester only; `403` for IT Staff/Administrators, `401` unauthenticated)

Success `200` (scope is derived solely from the session identity — no parameter can widen it, BR-16):
```json
{
  "generatedAt": "2026-10-18T10:05:00.000Z",
  "metrics": {
    "openCount": 2,
    "waitingForRequesterCount": 1
  },
  "recentlyUpdated": { "items": [ /* ≤5 owned items, newest first */ ] },
  "recentlyResolved": { "items": [ /* ≤5 owned RESOLVED/CLOSED items updated within 7d */ ] },
  "drilldown": {
    "open": "/api/tickets?status=OPEN",
    "waitingForRequester": "/api/tickets?status=WAITING_FOR_REQUESTER",
    "recentlyUpdated": "/api/tickets?sort=-updatedAt",
    "recentlyResolved": "/api/tickets?status=RESOLVED"
  }
}
```

- `openCount` (RD-01): owned Tickets with status ∈ active statuses.
- `waitingForRequesterCount` (RD-02): owned Tickets with status = `WAITING_FOR_REQUESTER`.
- `recentlyUpdated` (RD-03): owned, `updatedAt ≥ now − 7d`, newest first, capped 5.
- `recentlyResolved` (RD-04): owned, status ∈ {`RESOLVED`,`CLOSED`}, `updatedAt ≥ now − 7d`, capped 5.
- Empty behavior: zeros + empty arrays, HTTP `200` (BR-17).
- Cross-user access is impossible by construction; a crafted request cannot reference another user's Tickets (no id parameters exist on this endpoint).

## 4. Regression Surface (Labs 1–3)

Every endpoint in `docs/lab-03/api-spec.md` §1–§7 continues to work with unchanged request/response shapes, **except**:
- `PATCH /api/staff/tickets/:id/status` now requires `expectedUpdatedAt` and enforces the resolution gate (§2.1) — an intentional, documented upgrade (Issue 32 updates the Lab 3 client/tests accordingly).
- `GET /api/staff/tickets` gains the `ownerId=me` alias (§3.2) — additive only.
- `GET /api/staff/tickets/:id` adds `actionsCount` (§2.3) — additive only.

Authorization, ownership, non-disclosing `404`s, and validation behavior for the legacy surface are unchanged (specification BR-20) and covered by the Lab 1–3 regression suites.

## 5. HTTP Status Summary (Lab 4 additions)

Status | Use
---|---
200 | Retrieval/update success (action update, status transition, dashboards, queue).
201 | Created (Action Taken; existing creations unchanged).
400 | Validation: follow-up gate, description/length, action date out of bounds, invalid enum, missing/invalid `expectedUpdatedAt`, invalid queue alias value.
401 | Unauthenticated/expired session (incl. deactivated mid-session account).
403 | Role: Requester write on actions, Requester status transition, non-staff dashboard, non-requester requester-dashboard.
404 | Missing or foreign Ticket/Action (non-disclosing).
409 | `FORBIDDEN_TRANSITION`, `RESOLUTION_GATE`, `STALE_UPDATE`, `DUPLICATE_ACTION` (+ existing Lab 3 codes).
500 | Unexpected server error (safe generic message).

## 6. Validation Quick Reference (Actions Taken)

Rule | Field | Enforcement
---|---|---
Required, trimmed, 1–2,000 chars | `actionDescription` | `400 fields.actionDescription`
Optional, trimmed, ≤ 2,000 chars | `result`, `attachmentNotes` | `400 fields.*` when exceeded
Required iff `followUpRequired = true`, trimmed, 1–2,000 | `followUpNote` | `400 fields.followUpNote` (BR-05)
Valid datetime in `[ticket.createdAt − 30d, now + 24h]` | `actionDateTime` | `400 fields.actionDateTime` (D-6)
Server-set, never client-supplied | `performedById` | ignored if sent; session user stored (BR-03)
Required, must equal stored `updatedAt` | `expectedUpdatedAt` (action update, status change) | `400` missing / `409 STALE_UPDATE` (BR-12)
Not accepted at all | delete/hard-remove of actions | route does not exist (D-4)
