# Lab 3 REST API Contract

> Base URL: `/api`. All request/response bodies are JSON unless noted. Authenticated sessions are delivered via an HttpOnly, SameSite=Strict cookie named `tok_session`. Client-supplied `requesterId` is never trusted (BR-06).

## 0. Authentication and Session Decisions

- **Password hashing**: bcrypt (cost factor ≥ 10). Hashes are never returned by any endpoint.
- **Session**: on successful login the backend creates a `Session` row (random opaque token + userId + `expiresAt`) and sets the `tok_session` cookie (HttpOnly, Secure in production, SameSite=Strict).
- **Expiry**: sessions expire after 12 hours of inactivity; expired sessions must re-login.
- **Logout**: `POST /api/auth/logout` deletes the session row and clears the cookie, so the token can no longer be used.
- **CSRF**: SameSite=Strict cookie plus a required custom header `X-CSRF-Protected: 1` on every mutating request (POST/PATCH/DELETE). The browser will attach it only from same-origin code.
- **Auth secrets** are never exposed to client code or committed to source control.

## Conventions

- Errors return: `{ "error": { "code": "...", "message": "...", "fields": {...} } }`.
- Status codes: `200` success/update, `201` created, `400` invalid input/validation (with `fields`), `401` unauthenticated, `403` authenticated-but-forbidden, `404` missing resource or non-disclosing foreign resource, `409` conflict (e.g. forbidden transition, duplicate email), `500 INTERNAL_ERROR` unexpected.
- Protected endpoints return the same generic `404 NOT_FOUND` for missing and foreign resources to avoid leaking existence (BR-21).
- `fields` maps field names to messages for validation failures.

## 1. Authentication

### 1.1 Login

`POST /api/auth/login`

Request:
```json
{ "email": "alice@example.com", "password": "..." }
```

Validation (400): email required/valid, password required.
Success `200` (sets `tok_session` cookie):
```json
{ "user": { "id": 1, "name": "Alice Smith", "email": "alice@example.com", "role": "REQUESTER", "requiresPasswordChange": true } }
```
- Inactive account or wrong credentials → `401` with a generic safe message (BR-01, BR-05); no account enumeration.
- `requiresPasswordChange: true` signals the client to force the Change Password screen (AC-02).

### 1.2 Logout

`POST /api/auth/logout` (authenticated)

- Deletes the active session and clears the cookie. Success `200 { "ok": true }`.
- Subsequent protected calls return `401`.

### 1.3 Current User

`GET /api/auth/me` (authenticated)

Success `200`:
```json
{ "user": { "id": 1, "name": "Alice Smith", "email": "alice@example.com", "role": "REQUESTER", "requiresPasswordChange": false } }
```
Errors: `401` no/invalid session.

### 1.4 Change Password (mandatory + optional reset)

`POST /api/auth/change-password` (authenticated)

Request:
```json
{ "currentPassword": "initial-or-current", "newPassword": "NewPass123!", "confirmPassword": "NewPass123!" }
```
Rules: min 8 chars with at least one lowercase letter, one uppercase letter, one digit and one special character; `newPassword === confirmPassword`; new password must differ from the current password.
Success `200`:
```json
{ "user": { "id": 1, "name": "Alice Smith", "email": "alice@example.com", "role": "REQUESTER", "requiresPasswordChange": false } }
```
- Sets `requiresPasswordChange = false`.
- Errors: `400` validation/strength/mismatch; `401` wrong current password. Users with `requiresPasswordChange: true` may call only this endpoint and the auth endpoints until the change succeeds (BR-03).

## 2. Reference Data (authenticated, any role)

### 2.1 Active Categories

`GET /api/categories` → `200` bare array `[ { "id": 1, "name": "Hardware" } ]`.

### 2.2 Active Related Systems

`GET /api/related-systems` → `200 { "items": [ { "id": 1, "name": "ERP", "type": "Application" } ] }`.

## 3. Requester (regression) — ownership from session identity

All endpoints below use the authenticated identity as the requester; `X-Requester-Id` and any body `requesterId` are ignored (BR-06, AC-03). Ownership protection identical to Lab 2.

- `POST /api/tickets` — create Ticket for the authenticated Requester. Request: `{ summary, description, categoryId, relatedSystemId, requestedPriority? }`. Validation: summary/description non-empty after trim (max 2,000 chars each), category/related-system must be active, requestedPriority valid enum defaulting to `MEDIUM`. Success `201` with the generated Ticket (official `TK-######` ticketNumber, `itPriority` copied = requested priority, `currentStatus: "NEW"`).
- `GET /api/tickets?search=&categoryId=&status=&requestedPriority=&page=&pageSize=&sort=` — the authenticated Requester's Tickets with search/filter/sort/pagination (same contract and BR-10 invalid-parameter handling as Lab 2). Success `200 { items, pagination, filtersApplied }`.
- `GET /api/tickets/:id` — one owned Ticket (Requester detail view). Foreign/missing → `404 NOT_FOUND`.
- `POST /api/tickets/:id/attachments` — multipart upload to an owned Ticket (page includes the upload section); validations and responses identical to Lab 2 (BR-07/BR-12 from Lab 2 spec still apply: max 5 active attachments). Foreign/missing → `404`.
- `GET /api/tickets/:id/attachments` — attachment metadata of an owned Ticket.
- `GET /api/attachments/:id/download` — download an active attachment of an owned Ticket.
- `DELETE /api/attachments/:id` — soft-remove (body `{ "removedReason": "..." }`, required non-empty) of an owned Ticket's attachment.

## 4. Requester Communication

### 4.1 Create Public Comment

`POST /api/tickets/:id/comments` (Requester on own Ticket; IT Staff/Admin on any Ticket)

Request:
```json
{ "content": "Thanks, I will try the suggested fix." }
```
Validation (400): content required, non-empty after trim, ≤ 2,000 chars (BR-12).
Success `201`:
```json
{ "comment": { "id": 5, "ticketId": 42, "content": "Thanks, I will try the suggested fix.", "author": { "id": 1, "name": "Alice Smith" }, "createdAt": "2026-09-17T10:00:00.000Z" } }
```
Errors: `404` missing/foreign ticket (non-disclosing), `403` non-authorized role.

### 4.2 List Public Comments

`GET /api/tickets/:id/comments` (Requester own ticket; IT Staff/Admin any ticket)

Success `200`:
```json
{ "items": [ { "id": 5, "ticketId": 42, "content": "...", "author": { "id": 1, "name": "Alice Smith" }, "createdAt": "..." } ] }
```

### 4.3 Indicate Problem Appears Resolved

`POST /api/tickets/:id/resolved-indication` (Requester, own ticket)

- Idempotent record of the Requester's indication; sets `requesterIndicatedResolvedAt` if not already set. Does not change status (BR-11).
Success `200`:
```json
{ "ticket": { "id": 42, "ticketNumber": "TK-000042", "requesterIndicatedResolvedAt": "2026-09-17T11:00:00.000Z", "currentStatus": "IN_PROGRESS" } }
```
Errors: `404` missing/foreign ticket, `403` non-Requester.

## 5. IT Staff Communication — Internal Notes

### 5.1 Create Internal Note

`POST /api/tickets/:id/notes` (IT Staff/Admin only)

Request:
```json
{ "content": "Awaiting the vendor patch; contacted requester." }
```
Validation (400): content required, non-empty after trim, ≤ 2,000 chars.
Success `201`:
```json
{ "note": { "id": 3, "ticketId": 42, "content": "Awaiting the vendor patch; contacted requester.", "author": { "id": 7, "name": "Dan Engineer" }, "createdAt": "..." } }
```
Errors: `403` Requester (no note data exposed — AC-04), `404` missing ticket.

### 5.2 List Internal Notes

`GET /api/tickets/:id/notes` (IT Staff/Admin only)

Success `200`:
```json
{ "items": [ { "id": 3, "ticketId": 42, "content": "...", "author": { "id": 7, "name": "Dan Engineer" }, "createdAt": "..." } ] }
```
Errors: `403` Requester, `404` missing ticket.

## 6. IT Staff Ticket Operations

### 6.1 Ticket Queue

`GET /api/staff/tickets?search=laptop&status=NEW&requestedPriority=MEDIUM&itPriority=HIGH&ownerId=7&categoryId=2&page=1&pageSize=10&sort=-updatedAt`

- **Searchable fields**: `summary`, `description`, `ticketNumber` (case-insensitive LIKE).
- **Filterable fields**: `status`, `requestedPriority`, `itPriority`, `ownerId` (with `ownerId=null`/`unassigned` supported), `categoryId`, `relatedSystemId`.
- **Sortable fields**: `createdAt`, `updatedAt`, `ticketNumber`, `status`, `requestedPriority`, `itPriority`, `summary` (prefix `-` for descending; default `-updatedAt`).
- **Pagination**: `page` (default 1), `pageSize` (default 10, max 50).
- **Invalid** filter/sort/page values → `400` with a specific message (never silently ignored).

Success `200`:
```json
{
  "items": [
    {
      "id": 42, "ticketNumber": "TK-000042", "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "requester": { "id": 1, "name": "Alice Smith" },
      "owner": { "id": 7, "name": "Dan Engineer" },
      "requestedPriority": "MEDIUM", "itPriority": "HIGH",
      "currentStatus": "NEW", "createdAt": "...", "updatedAt": "..."
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 1, "totalPages": 1 },
  "filtersApplied": { "status": "NEW" }
}
```
Errors: `401` unauthenticated, `403` Requester, `400` invalid query.

### 6.2 Single Ticket (Staff Detail)

`GET /api/staff/tickets/:id` (IT Staff/Admin)

- Full detail including requester, owner, priority values, status, attachments metadata, Public Comments, Internal Notes, and `requesterIndicatedResolvedAt`.
Errors: `401`, `403`, `404` missing ticket.

### 6.3 Claim / Assign / Reassign

`PATCH /api/staff/tickets/:id/owner` (IT Staff/Admin)

Request:
```json
{ "ownerId": 7 }
```
- Assigns/reattaches the primary owner; `ownerId` must be an active User with role IT Staff or Administrator (BR-07). Success `200` with the updated Ticket summary. Errors: `400` invalid owner target (role/inactive), `403` role, `404` missing ticket.

### 6.4 Update IT Priority

`PATCH /api/staff/tickets/:id/priority` (IT Staff/Admin)

Request:
```json
{ "itPriority": "URGENT" }
```
Success `200` with updated Ticket. Errors: `400` invalid enum, `403` Requester, `404`.

### 6.5 Status Transition

`PATCH /api/staff/tickets/:id/status` (IT Staff/Admin)

Request:
```json
{ "newStatus": "IN_PROGRESS" }
```
- Only transitions permitted by `specification.md` §5.2 are accepted. Disallowed transitions → `409` with a specific message (BR-09). Success `200` with the updated Ticket. Errors: `400` invalid enum, `403` role, `409` forbidden transition, `404`.

## 7. Administrator User Management

### 7.1 List Users

`GET /api/admin/users?search=ali&role=REQUESTER` (Admin only)

- **Search**: case-insensitive match on name or email. **Optional role filter**: `role`.
- No pagination (excluded scope); returns all matches in name order.
Success `200`:
```json
{
  "items": [
    { "id": 1, "name": "Alice Smith", "email": "alice@example.com", "role": "REQUESTER", "active": true, "requiresPasswordChange": true, "createdAt": "...", "updatedAt": "..." }
  ],
  "filtersApplied": { "role": "REQUESTER" }
}
```
Errors: `401`, `403` non-Admin, `400` invalid role.

### 7.2 Create User

`POST /api/admin/users` (Admin only)

Request:
```json
{ "name": "New User", "email": "new.user@example.com", "role": "IT_STAFF", "active": true, "initialPassword": "TempPass!23" }
```
Validation (400): name non-empty; email valid + unique (case-insensitive, BR-14); `role` one of `REQUESTER`/`IT_STAFF`/`ADMIN` (BR-16); `active` boolean; `initialPassword` meets the password policy (BR-17).
Success `201`: user object (never the password/hash). Errors: `409` duplicate email; `403` non-Admin; `400` validation.

### 7.3 Update User

`PATCH /api/admin/users/:id` (Admin only)

Request:
```json
{ "name": "New Name", "email": "new@example.com", "role": "REQUESTER", "active": false }
```
- Prevents **self-deactivation** (`active=false` on own account) → `409` (BR-18).
- Prevents deactivating or changing-role of the **last active Administrator** if it would leave no active Admin → `409` (BR-19).
- Prevents duplicate email → `409` (BR-14).
Success `200`: updated user object. Errors: `401`, `403`, `404`, `409`, `400`.

### 7.4 Set New Initial Password

`POST /api/admin/users/:id/initial-password` (Admin only)

Request:
```json
{ "newInitialPassword": "ResetPass!23" }
```
- Sets the password and `requiresPasswordChange = true` so the user must change it at next login (BR-17).
Success `200`: `{ "user": { "id": 1, "name": "Alice Smith", "requiresPasswordChange": true } }`. Errors: `400` weak password, `403`, `404`.

## 8. HTTP Status Summary

Status | Use
---|---
200 | Successful retrieval / update / logout / password change.
201 | Resource created (Ticket, Attachment, Comment, Note, User).
400 | Invalid input / validation / invalid query / unsupported file.
401 | Unauthenticated / expired or invalid session / wrong credentials.
403 | Authenticated but not permitted for the role.
404 | Missing resource, or foreign resource (non-disclosing).
409 | Conflict: forbidden status transition, duplicate email, self-deactivation, last-active-Administrator protection.
500 | Unexpected server error.