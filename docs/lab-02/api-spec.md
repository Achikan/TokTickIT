# Lab 2 REST API Contract

> Base URL: `/api`. All request/response bodies are JSON. Requester identity is supplied by the client (header `X-Requester-Id`) until real authentication exists (Lab 3). All requester-scoped endpoints verify ownership.

## Conventions

- Errors return a JSON body `{ "error": { "code": "...", "message": "...", "fields": {...} } }`.
- Unknown/non-disclosing failures return the same generic `NOT_FOUND` for missing or foreign resources to avoid leaking existence.
- Unexpected server errors return `500 { "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong" } }`.
- `fields` maps field names to messages for validation failures (400).

## 1. Retrieve Active Categories

`GET /api/categories`

Query: none.

Success `200`:
```json
{ "items": [ { "id": 1, "name": "Hardware" } ] }
```
Error: `500 INTERNAL_ERROR` on failure. Only active categories are returned.

## 2. Retrieve Active Related Systems

`GET /api/related-systems`

Success `200`:
```json
{ "items": [ { "id": 1, "name": "ERP", "type": "Application" } ] }
```

## 3. Retrieve Active Development Requesters

`GET /api/development-requesters`

- Returns only active requesters (BR-02); inactive are excluded.

Success `200`:
```json
{ "items": [ { "id": 1, "name": "Alice", "email": "alice@example.com" } ] }
```

## 4. Create a Ticket

`POST /api/tickets`

Headers: `X-Requester-Id` (the selected Development Requester id).

Request body:
```json
{
  "requesterId": 1,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drops from 100% to 20% in an hour.",
  "categoryId": 2,
  "relatedSystemId": 3,
  "requestedPriority": "MEDIUM"
}
```

Validation (400 with `fields`):
- `summary` required, non-empty after trimming.
- `description` required, non-empty after trimming.
- `categoryId` must reference an existing active Category.
- `relatedSystemId` must reference an existing active Related System.
- `requestedPriority` must be a valid enum; defaults to `MEDIUM` when omitted (BR-06).

Success `201` (values generated/stored by the backend):
```json
{
  "ticket": {
    "ticketNumber": "TK-000042",
    "id": 42,
    "summary": "Laptop battery drains quickly",
    "description": "Battery drops from 100% to 20% in an hour.",
    "requesterId": 1,
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "ERP" },
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "currentStatus": "SUBMITTED",
    "createdAt": "2026-09-01T00:00:00.000Z",
    "updatedAt": "2026-09-01T00:00:00.000Z"
  }
}
```

Errors: `400` validation, `404`/`403` if requester context invalid, `500` internal.

## 5. Retrieve the Selected Requester's Tickets (list)

`GET /api/tickets?search=laptop&categoryId=2&status=SUBMITTED&requestedPriority=MEDIUM&page=1&pageSize=10&sort=-createdAt`

- Returns only Tickets owned by `X-Requester-Id` (BR-04).
- Query params: `search` (matches summary/description), `categoryId`, `relatedSystemId`, `status`, `requestedPriority` (filters), `sort` (e.g. `-createdAt`, `summary`, `+ticketNumber`), `page` (default 1), `pageSize` (default 10, max 50).
- Invalid page/size/sort/filter values → `400` (BR-10); no silent ignore.

Success `200`:
```json
{
  "items": [
    {
      "ticketNumber": "TK-000042",
      "id": 42,
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "SUBMITTED",
      "updatedAt": "2026-09-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  },
  "filtersApplied": {}
}
```

## 6. Retrieve One Owned Ticket

`GET /api/tickets/:id`

- Ownership enforced (BR-04); a foreign ticket is rejected without disclosing existence.

Success `200`: full Ticket detail:
```json
{
  "ticket": {
    "ticketNumber": "TK-000042",
    "id": 42,
    "summary": "Laptop battery drains quickly",
    "description": "Battery drops from 100% to 20% in an hour.",
    "requesterId": 1,
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "ERP" },
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "currentStatus": "SUBMITTED",
    "createdAt": "2026-09-01T00:00:00.000Z",
    "updatedAt": "2026-09-01T00:00:00.000Z",
    "attachments": []
  }
}
```
Errors: `404 NOT_FOUND` (missing or foreign), `500` internal.

## 7. Upload an Attachment

`POST /api/tickets/:id/attachments`

- Multipart/form-data, field `file`.
- Ownership enforced (BR-04). Validates type and size (BR-07); rejected uploads create no row.

Success `201`:
```json
{
  "attachment": {
    "id": 9,
    "ticketId": 42,
    "originalName": "diagram.png",
    "mimeType": "image/png",
    "size": 2048,
    "removedAt": null,
    "removedReason": null,
    "uploadedAt": "2026-09-01T00:00:00.000Z"
  }
}
```
Errors: `400` unsupported type / oversized / missing file (with `fields.file` message), `404 NOT_FOUND` (missing/foreign ticket), `500` internal.

## 8. Retrieve Attachment Metadata

`GET /api/tickets/:id/attachments` (list metadata for the owned ticket)

- Ownership enforced. Removed attachments are included with `removedAt`/`removedReason` set (BR-09).

Success `200`:
```json
{ "items": [ { "id": 9, "ticketId": 42, "originalName": "diagram.png", "mimeType": "image/png", "size": 2048, "removedAt": null, "removedReason": null, "uploadedAt": "2026-09-01T00:00:00.000Z" } ] }
```

## 9. Download an Active Attachment

`GET /api/attachments/:id/download`

- Ownership enforced (BR-04). Only active attachments can be downloaded (BR-09).

Success `200`: file stream with `Content-Type` and filename.
Errors: `404 NOT_FOUND` (missing, foreign, or removed attachment), `500` internal.

## 10. Soft-Remove an Attachment

`DELETE /api/attachments/:id`

- Ownership enforced. Removal is soft only (BR-08); metadata retained with `removedAt` and `removedReason`.
- Request body: `{ "removedReason": "Uploaded the wrong file" }` (required, non-empty).

Success `200`:
```json
{
  "attachment": {
    "id": 9,
    "ticketId": 42,
    "originalName": "diagram.png",
    "mimeType": "image/png",
    "size": 2048,
    "removedAt": "2026-09-01T01:00:00.000Z",
    "removedReason": "Uploaded the wrong file",
    "uploadedAt": "2026-09-01T00:00:00.000Z"
  }
}
```
Errors: `400` missing reason, `404 NOT_FOUND` (missing/foreign/already removed), `500` internal.

## HTTP Status Summary

Status | Use
---|---
200 | Successful retrieval / soft-removal.
201 | Resource created (Ticket, Attachment).
400 | Invalid input / validation / unsupported file / oversized / invalid query.
404 | Missing resource, or foreign resource (non-disclosing).
403 | Optional when explicit ownership failure or missing requester context.
500 | Unexpected server error.
