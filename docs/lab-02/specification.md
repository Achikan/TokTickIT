# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a working, requester-focused Ticket management increment for the TokTickIT IT Service Desk. In this sprint a User (the "Development Requester") can select their identity for testing purposes, create a help-desk Ticket, browse and filter their own Tickets, open a read-only Ticket detail view, and manage Ticket Attachments — all protected by requester ownership rules and presented in a consistent, responsive "Zen Green" interface. Authentication, IT Staff work, comments, notes, and status workflows are out of scope until later labs.

## 2. Stakeholder Request

The IT Service Desk needs a self-service portal. Before IT Staff workflows exist, the requester side must stand alone: a requester must be able to record an incident/request as a Ticket, attach supporting files, then later find, review, and manage the attachments of that Ticket. Each requester must only ever see and act on their own Tickets. The screens and API must be specified and tested first (Spec-Driven Development / Test-Driven Development) before implementation.

## 3. Scope

### Included
- Development Requester selection ("testing login") mechanism, including the development Requester identity context and Change Requester action.
- Create Ticket screen and API (validated Ticket creation with system-generated Ticket Number).
- Requester-owned My Tickets list with search, filtering, sorting, and pagination.
- Requester Ticket Detail (view mode) screen and API, read-only, ownership-protected.
- Attachment lifecycle: upload, metadata retrieval, download (active only), and soft-remove (with reason).
- Ownership protection at the API and UI/context level.
- Zen Green reusable presentation system and responsive behavior (desktop/tablet/mobile).
- Data model, seed data, migrations, and all required automated tests.
- Specification, test, API, and UI documents under `docs/lab-02/`.

### Excluded
- Authentication, login, passwords, sessions, roles, or role-based access (Lab 3).
- IT Staff workflow (triage, assignment, actions taken, closing) — IT Staff is not a concept in Lab 2.
- Public Comments, Internal Notes, Actions Taken, or any status/workflow state changes by the requester.
- Hard deletion of attachment records (removal is soft only).
- Email notifications, ticketing system integrations, SLA scheduling.

## 4. Functional Requirements

- **FR-01** The application shall provide a Development Requester Selection screen to choose who the current requester is.
- **FR-02** The Development Requester Selection screen shall load only active Development Requesters from PostgreSQL via the API.
- **FR-03** After selection, the application shell shall display the selected requester's name and provide a Change Requester action.
- **FR-04** Switching the selected requester shall reload requester-specific data for the new requester.
- **FR-05** The application shall provide a Create Ticket screen that captures a validated Ticket for the selected requester.
- **FR-06** Ticket creation shall produce a system-generated official Ticket Number distinct from the numeric database id.
- **FR-07** Create Ticket shall load reference data (Category, Related System, Requested Priority) from the backend/database.
- **FR-08** Ticket summary and description fields shall be required and validated with near-field messages.
- **FR-09** On successful creation, the screen shall display the official Ticket Number and saved values.
- **FR-10** On API failure during submission, the form shall show a safe error state and preserve the entered values.
- **FR-11** The application shall provide a My Tickets screen listing only Tickets owned by the selected requester.
- **FR-12** The My Tickets list shall support search, filtering, sorting, and pagination.
- **FR-13** The application shall provide a Requester Ticket Detail (view mode) screen showing the current Ticket read-only.
- **FR-14** Only the owner requester of a Ticket may retrieve, view, or download its data; other requesters are rejected.
- **FR-15** The system shall allow uploading an Attachment to an owned Ticket.
- **FR-16** The system shall allow retrieving Attachment metadata.
- **FR-17** The system shall allow downloading an active Attachment; a soft-removed Attachment cannot be downloaded.
- **FR-18** The system shall allow soft-removing an Attachment, capturing a removal reason while retaining its metadata.
- **FR-19** All requester-facing failure, empty, loading, and no-results states shall be handled clearly in the UI.

## 5. Business Rules

- **BR-01** A Ticket must belong to exactly one Development Requester (the creator/owner).
- **BR-02** Only active Development Requesters may be selected or appear in the selection dropdown; inactive requesters must never appear.
- **BR-03** The official Ticket Number shall be unique, system-generated, and immutable after creation.
- **BR-04** A requester may only see, open, download attachments of, or soft-remove attachments of Tickets they own.
- **BR-05** Summaries are required and must be non-empty after trimming; Description is required (non-empty after trimming).
- **BR-06** Requested Priority defaults to a defined value when not supplied (e.g. `MEDIUM`).
- **BR-07** Attachment uploads must reject unsupported file types and oversized files with a safe, field-related error; no row is created for rejected uploads.
- **BR-08** Soft removal of an Attachment is the only removal operation; the row/metadata is retained and marked removed with a reason and timestamp.
- **BR-09** A removed Attachment's metadata remains visible, but its file downloads are blocked.
- **BR-10** Search, filter, and page parameters that are invalid must be rejected safely (specific error), not silently ignored.
- **BR-11** A requester with no selected context may not access My Tickets or Ticket Detail; the requester selection screen is shown instead.

## 6. UI Specification Summary

Reusable "Zen Green" presentation system applied to the application shell and all screens (see `ui-spec.md` for the full contract):

- **Application shell**: TokTickIT identity, My Tickets navigation, Create Ticket navigation, selected requester identity display, clear active-page indication, responsive mobile navigation.
- **Development Requester Selection screen**: TokTickIT title, explanatory note that this selector is Lab 2 testing only, active-requester dropdown, Continue button, loading/empty/failure states, keyboard-accessible controls.
- **Create Ticket screen**: system-generated read-only values visually distinct; classification fields grouped; Summary and Description given sufficient width; Attachments below main fields; primary (Submit) and secondary actions at the bottom; busy Submit state; success shows official Ticket Number.
- **My Tickets screen**: search, filters, sorting, pagination, Create Ticket action; desktop table and mobile card/responsive-table representation; loading/empty/no-results/failure states; badges for Requested Priority, IT Priority, Current Status.
- **Requester Ticket Detail (view mode)**: current Ticket fields read-only, clearly distinct from Attachment actions; attachment present/uploading/invalid/removed/unavailable states.
- Badges, validation placement, and component rules (labels above controls, red asterisk, consistent input height, busy/disabled controls, visible focus, near-field messages) per `ui-spec.md`.

## 7. Data Changes

- **DevelopmentRequester** (temporary Lab 2 "login" identity): `id`, `name`, `email`, `active`, timestamps.
- **Category**: `id`, `name` (unique), `active`, timestamps. (Existing model extended with `active` and more seed rows.)
- **RelatedSystem**: `id`, `name`, `type`, `active`, timestamps.
- **Ticket**: `id`, `ticketNumber` (unique, official), `summary`, `description`, `requesterId` (FK), `categoryId` (FK), `relatedSystemId` (FK), `requestedPriority` (enum), `itPriority` (enum, defaulted), `currentStatus` (enum), `locked`/read-only system fields, `createdAt`, `updatedAt`.
- **Attachment**: `id`, `ticketId` (FK), `originalName`, `storedName`, `mimeType`, `size`, `removedAt` (nullable), `removedReason` (nullable), `uploadedAt`.
- Enums: `Priority` (`LOW`/`MEDIUM`/`HIGH`/`URGENT`), `Status` (requester-visible current status: `NEW`/`IN_PROGRESS`/`RESOLVED` — a new Ticket begins with `NEW`; status workflow is not editable by requester).
- Indexes: unique on `Ticket.ticketNumber`, index on `Ticket.requesterId`, index on `Attachment.ticketId`.
- Seed data (idempotent): 8+ active Categories, 6+ active RelatedSystems, 4+ active + 1 inactive DevelopmentRequesters.
- Removal is soft at the attachment level only; Ticket rows are never deleted in Lab 2.

## 8. API Contract

See `api-spec.md` for the full formal contract. Capabilities:
- Retrieve active Categories.
- Retrieve active Related Systems.
- Retrieve active Development Requesters.
- Create a Ticket.
- Retrieve the selected requester's Tickets (paginated, searchable, filterable, sortable).
- Retrieve one owned Ticket.
- Upload an Attachment.
- Retrieve Attachment metadata.
- Download an active Attachment.
- Soft-remove an Attachment.

All requester-scoped endpoints enforce ownership: a requester may only reach (and thereby see) their own Tickets and Attachments.

## 9. Acceptance Criteria

- **AC-01** Given valid Ticket data, when the requester submits the form, then one Ticket is saved and the official Ticket Number is displayed.
- **AC-02** Given no Development Requester is selected, when the user attempts to open My Tickets, then the Requester Selection screen is shown.
- **AC-03** Given Requester B is selected, when a Ticket belonging to Requester A is requested, then the Ticket data is not returned.
- **AC-04** Given a form with an empty Summary and empty Description, when the requester submits, then field-level validation messages appear and no API call is made.
- **AC-05** Given a successful Ticket creation, when the requester navigates to My Tickets, then the created Ticket is present in that requester's list.
- **AC-06** Given Requester A's list is shown, when the requester switches to Requester B, then Requester A's Tickets disappear.
- **AC-07** Given a My Tickets list, when a search/filter/sort/pagination parameter is applied, then the list updates accordingly and the metadata reflects the result.
- **AC-08** Given an active Attachment on an owned Ticket, when the requester downloads it, then the file is returned.
- **AC-09** Given an Attachment that is soft-removed with a reason, when its download is attempted, then download is blocked while metadata remains visible.
- **AC-10** Given a requester who is not the owner, when they request the Ticket or an Attachment of another requester, then access is rejected with a non-disclosing error.
- **AC-11** Given an unsupported file type or oversized file, when the requester uploads it, then a safe field-level error is shown and no Attachment is created.
- **AC-12** Given a backend failure during submission, when the requester submits the form, then a safe error state is shown and the entered form values are preserved.
- **AC-13** Given a requester navigates the app on desktop, tablet, and mobile viewports, then the layout is responsive with no clipping, overlap, hidden buttons, or horizontal page scrolling.
- **AC-14** Given a requester opens My Tickets, when their Ticket list is empty, then an "empty" state is shown; and when search or filters are applied with no matches, then a distinct "no-results" state is shown.
- **AC-15** Given a requester opens an owned Ticket's attachments, when an Attachment is uploading, invalid, active, soft-removed, or unavailable, then each state is presented distinctly and behaves correctly.

## 10. Definition of Done

- All approved scope from Section 3 is implemented.
- All Acceptance Criteria are satisfied.
- All planned automated tests pass from documented commands on the final `main` branch; each AC maps to test evidence.
- No required test is skipped, disabled, or commented out.
- Implemented screens and APIs conform to the approved engineering contract (`specification.md`, `api-spec.md`, `ui-spec.md`).
- Success, failure, and boundary cases are handled correctly (validation, ownership, loading/empty states, responsive behavior).
- README setup and test instructions are current.
- Development Requester workflow, Ticket creation, My Tickets, Ticket Detail, Attachments, ownership, responsive UI, and error handling are demonstrable.

## 11. Assumptions and Decisions

- A Development Requester is identified by a numeric id; identity is passed with each request (header/body) as the "selected requester" until Lab 3 introduces real sessions.
- Official Ticket Number format is chosen by the student and documented in `api-spec.md` (proposed: `TK-<zero-padded sequential>` generated from a dedicated counter to survive deletes).
- Attachment files are stored on the local filesystem under a configured upload directory; the database stores metadata and a stored filename.
- `itPriority` and `currentStatus` are system-managed (defaulted) and read-only for the requester in Lab 2; no status transitions are exposed.
- Cross-requester access that would disclose existence returns the same safe error as a missing resource (e.g. 404 or 403 without leaking data).
- Seed categories/related systems/requesters are upserted by unique keys so re-running the seed is harmless.

## 12. Final Status (Issue 15)

The Lab 2 specification is implemented and verified end to end: every user story,
acceptance criterion, and non-functional requirement referenced across
`api-spec.md` / `ui-spec.md` is covered by passing automated tests and visual
inspection (see `tests.md` and `visual-inspection.md`). No Lab 2 requirement is
left unimplemented. A new Ticket begins with Current Status `NEW`, matching the
labs-sheet §4.3 wording; status workflow remains a later-lab concern and is read-only
for the requester.
