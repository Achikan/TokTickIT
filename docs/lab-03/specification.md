# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal

Replace the temporary Development Requester selector with real, secure users: password-based authentication with a mandatory first-login password change, server-side role-based authorization for Requester, IT Staff, and Administrator, a professional IT Staff Ticket Queue and Ticket Detail workflow (ownership, IT Priority, status transitions, Public Comments, Internal Notes), and a minimalist Administrator User Management screen — presented in the existing Zen Green design language and without breaking any completed Lab 2 Requester function.

## 2. Stakeholder Request

The system has outgrown the throwaway requester selector and needs real users. Stakeholders require secure login plus an initial-password change before the application is usable. Requesters keep every Lab 2 ticket function, but identity must now come from the authenticated account; they may communicate publicly on their Tickets and indicate that a problem appears resolved. IT Staff need a Ticket Queue to find work, open Ticket Detail, claim or reassign Tickets, set IT Priority, talk with Requesters through Public Comments, record private Internal Notes, and move Tickets through a permitted workflow. Administrators need a simple User Management screen only. Every API and screen must be protected by role and ownership at the backend — hiding a button is not authorization.

## 3. Scope

### Included
- Authentication: login, logout, current-user retrieval, and mandatory first-login password change.
- Server-side role-based authorization and ownership checks for every protected operation (Requester, IT Staff, Administrator).
- Migration from the Lab 2 Development Requester identity to the authenticated User model; removal of the selector and its client-side state.
- Continued Requester Ticket and Attachment ownership protection for all Lab 2 functions.
- Requester Ticket Detail additions: Public Comments and the "Problem Appears Resolved" indication.
- IT Staff Ticket Queue: search, filters, sorting, pagination, ownership/status display, responsive table.
- IT Staff Ticket Detail: claim/assign/reassign, IT Priority, permitted status transitions, Public Comments, Internal Notes, attachment continuity.
- Minimalist Administrator User Management: user list, name/email search, optional role filter, create, edit, activation/deactivation, set new initial password.
- Zen Green UI extensions, responsive behavior (desktop/tablet/mobile), accessibility, and all required automated tests and documentation under `docs/lab-03/`.

### Excluded (Lab 3 sheet §4.2)
- Email invitations, password-reset email, multi-factor authentication, social login, single sign-on.
- Self-registration and Requester-created accounts.
- Actions Taken by IT Staff.
- Formal SLA calculation, escalation rules, notification services.
- Dashboards and KPI analytics beyond simple queue counts.
- Multi-tenant organizations, departments, and customer administration.
- Production-grade deployment or cloud infrastructure changes.
- Multiple roles assigned to one user.
- User deletion, bulk user operations, user import/export, account-history screens.
- Department, organization, profile-photo, and extended user-profile management.
- Email delivery of initial passwords or reset links.
- Account unlocking, administrator approval workflows, advanced identity-management functions.
- Advanced user-list features: mandatory pagination, multi-column sorting, multiple simultaneous filters.

## 4. Functional Requirements

### Authentication
- **FR-01** The application shall provide login by email and password with safe, non-disclosing errors.
- **FR-02** The application shall provide logout that invalidates the active session.
- **FR-03** The application shall provide current authenticated user retrieval (identity and role).
- **FR-04** A user marked as requiring a password change shall be blocked from the normal application until a valid new password is saved.
- **FR-05** Passwords shall be hashed and never stored or returned in plaintext.

### Authorization
- **FR-06** Every protected endpoint shall enforce server-side role and ownership rules; a hidden or disabled frontend control is not a security control.
- **FR-07** The authenticated user identity — not a `requesterId` supplied by the client — shall determine ownership of Requester operations.

### Migration and Requester Regression
- **FR-08** The Development Requester selector and its client-side state shall be removed.
- **FR-09** All Lab 2 Requester functions (Create Ticket, My Tickets, Ticket Detail, Attachments) shall continue to work using the authenticated Requester identity.
- **FR-10** A Requester shall be able to post Public Comments on an owned Ticket.
- **FR-11** A Requester shall be able to indicate that the reported problem appears resolved (without formally setting Resolved/Closed).

### IT Staff
- **FR-12** The IT Staff Ticket Queue shall support search, filters, sorting, and pagination.
- **FR-13** IT Staff shall be able to retrieve one Ticket for operations.
- **FR-14** IT Staff shall be able to claim, assign, or reassign Ticket ownership.
- **FR-15** IT Staff shall be able to update IT Priority.
- **FR-16** IT Staff shall be able to perform permitted status transitions per the approved matrix.
- **FR-17** The system shall support creating and retrieving Public Comments.
- **FR-18** The system shall support creating and retrieving Internal Notes for permitted roles only.

### Administrator
- **FR-19** The Administrator User Management screen shall list users with search by name or email and an optional role filter.
- **FR-20** An Administrator shall create a user with one permitted role, activation state, and an initial password.
- **FR-21** An Administrator shall update a user's name, email address, role, and activation state.
- **FR-22** An Administrator shall set a new initial password that must be changed at the user's next login.

### Error Handling
- **FR-23** Protected endpoints shall distinguish unauthenticated access, authenticated-but-forbidden access, invalid input, missing resources, conflicts, and unexpected server errors — without leaking whether another user's protected Ticket, Attachment, or Internal Note exists.

## 5. Business Rules

- **BR-01** Only an active user with valid credentials may authenticate; failed login attempts return safe generic errors with no account detail.
- **BR-02** Passwords are hashed (e.g. bcrypt) and are never stored, logged, or returned in plaintext.
- **BR-03** A user marked as requiring a password change cannot enter the normal application until a valid new password is saved.
- **BR-04** Logout invalidates the active session; subsequent authenticated access is rejected.
- **BR-05** An inactive user cannot log in or perform operations; the response is safe and non-disclosing.
- **BR-06** The authenticated user identity — never a client-supplied `requesterId` — determines Requester ownership of Tickets and Attachments.
- **BR-07** Each Ticket has exactly one Requester owner and at most one primary Ticket Owner, who must be an active IT Staff or Administrator user; a Ticket may initially be unassigned.
- **BR-08** IT Priority initially copies Requested Priority and may be changed only by IT Staff or Administrator.
- **BR-09** Status changes are permitted only according to the approved transition matrix; permitted roles, required confirmations, and validation are enforced server-side.
- **BR-10** Public Comments are visible to the Requester, IT Staff, and Administrator; Internal Notes are visible only to IT Staff and Administrator.
- **BR-11** A Requester may indicate that the problem appears resolved but may not formally set the Ticket to Resolved or Closed.
- **BR-12** Comments and Notes are append-only: editing and deletion are excluded; content must be non-empty after trimming and no longer than 2,000 characters; the backend records author and creation time.
- **BR-13** Every User has exactly one role: Requester, IT Staff, or Administrator.
- **BR-14** Email addresses are unique (case-insensitive, normalized); duplicate emails are rejected on create and update.
- **BR-15** Users authenticate with their email and password; there is no self-registration in Lab 3.
- **BR-16** An Administrator creates users with one permitted role; invalid role values are rejected.
- **BR-17** Newly created and reset accounts receive an initial password that must be changed at the next login.
- **BR-18** An Administrator may not deactivate their own account.
- **BR-19** The system must always retain at least one active Administrator; deactivating the last active Administrator is rejected.
- **BR-20** Administrators deactivate rather than delete users.
- **BR-21** Cross-user access to a Ticket, Attachment, or Internal Note returns the same non-disclosing error as a missing resource.

### 5.1 Authorization Matrix

Operation | Requester | IT Staff | Administrator | Anonymous
---|---|---|---|---
Login, Logout, Change Password | ✅ (self) | ✅ (self) | ✅ (self) | Login only
Read reference data (Categories, Related Systems) | ✅ | ✅ | ✅ | ❌
Create Ticket | ✅ | ❌ | ❌ | ❌
My Tickets / Requester Ticket Detail / Attachments | ✅ own only | ❌ | ❌ | ❌
Requester "Problem Appears Resolved" | ✅ own ticket | ❌ | ❌ | ❌
Public Comments (create/read) | ✅ own ticket | ✅ | ✅ | ❌
Internal Notes (create/read) | ❌ | ✅ | ✅ | ❌
IT Staff Ticket Queue | ❌ | ✅ | ✅ | ❌
IT Staff Ticket Detail (single Ticket) | ❌ | ✅ | ✅ | ❌
Claim / assign / reassign ownership | ❌ | ✅ | ✅ | ❌
Set IT Priority | ❌ | ✅ | ✅ | ❌
Status transitions | ❌ | per §5.2 matrix | per §5.2 matrix | ❌
User Management (list/create/edit/initial password) | ❌ | ❌ | ✅ | ❌

### 5.2 Status Transition Matrix

Required statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.

From \ To | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER | RESOLVED | CLOSED | REOPENED | CANCELLED
---|---|---|---|---|---|---|---
NEW | Staff/Admin | Staff/Admin | — | — | — | — | Staff/Admin
OPEN | — | Staff/Admin | Staff/Admin | — | — | — | Staff/Admin
IN_PROGRESS | — | — | Staff/Admin | Staff/Admin | — | — | Staff/Admin
WAITING_FOR_REQUESTER | — | Staff/Admin | — | Staff/Admin | — | — | Staff/Admin
RESOLVED | — | — | — | — | Staff/Admin | Staff/Admin (Reopen) | —
CLOSED | — | — | — | — | — | Staff/Admin (Reopen) | —
REOPENED | — | Staff/Admin | Staff/Admin | Staff/Admin | — | — | Staff/Admin

Notes:
- Only IT Staff or Administrator may perform any transition. Requesters may only use the separate "Problem Appears Resolved" indication (BR-11).
- Transitions not listed are rejected with a safe `400` conflict error.
- Lab 3 does not include Actions Taken, so the later rule blocking resolution while Actions Taken remain incomplete is deferred to Lab 4 (sheet §4.5).

## 6. UI Specification Summary

The application is presented in the existing Zen Green design language (`ui-spec.md`). Summaries of each screen and its modes:

- **Login**: email + password form, busy state, safe failure feedback, clear inactive-account response.
- **Mandatory Change Password**: initial-password gate forcing a new password (rules + confirmation) before the app opens.
- **Application shell**: authenticated user name and role badge, role-specific navigation without unauthorized destinations, Logout, permitted profile/password action, responsive mobile menu.
- **Requester screens (regression)**: Create Ticket, My Tickets, Ticket Detail continue to work; Ticket Detail adds Public Comments and the "Problem Appears Resolved" action; the Development Requester selector and Change Requester action are removed.
- **IT Staff Ticket Queue**: search, filters, sorting, pagination, ownership and status information, open-detail action, loading/empty/no-results/forbidden/failure feedback; desktop table with a justified column set and smaller-screen representation.
- **IT Staff Ticket Detail**: grouped Ticket information with only permitted operational fields editable; ownership, IT Priority, permitted status changes, Public Comments and Internal Notes (visually distinct so private notes are not posted publicly), existing Attachments, role-specific actions.
- **Administrator User Management**: user list (Name, Email, Role, Status, Edit), name/email search, optional role filter, create/edit form, set-new-initial-password action, validation/success/forbidden/safe-failure feedback.
- Badges for Ticket status, Requested Priority, IT Priority, and role are consistent across screens (see `ui-spec.md`).

## 7. Data Changes

### Models and Relationships
- **User** (replaces `DevelopmentRequester`): `id`, `name`, `email` (unique, case-insensitive normalized), `passwordHash`, `role` (enum `REQUESTER`/`IT_STAFF`/`ADMIN`), `active` (default true), `requiresPasswordChange` (default true for seeded/created accounts), `createdAt`, `updatedAt`.
- **Ticket** (evolves): `requester` becomes a relation to `User`; adds `owner` relation to `User` (`ownerId` nullable, eligible roles IT Staff/Administrator); adds `requesterIndicatedResolvedAt` (nullable timestamp) for the "Problem Appears Resolved" indication; `currentStatus` enum expands to `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
- **PublicComment**: `id`, `ticketId` (FK), `authorId` (FK to User), `content` (1..2000 chars), `createdAt`.
- **InternalNote**: `id`, `ticketId` (FK), `authorId` (FK to User), `content` (1..2000 chars), `createdAt`.
- **Session** (auth): `id`/token, `userId` (FK), `expiresAt`, `createdAt`; supports logout invalidation and expiry.
- **Category**, **RelatedSystem**, **Priority**, **Attachment** remain as in Lab 2; no existing Ticket/Attachment data is discarded.

### Enum Change
- Lab 2 already normalized the original default `SUBMITTED` to `NEW` (migration `20260905141000_ticket_status_new`, merged in PR #34), so the current database only holds `NEW`, `IN_PROGRESS`, or `RESOLVED`.
- `Status` now expands from those three values to the eight required statuses; existing rows are mapped (`NEW` → `NEW`, `IN_PROGRESS` → `IN_PROGRESS`, `RESOLVED` → `RESOLVED`). The migration defensively maps any residual `SUBMITTED` value to `NEW` before expanding the enum, so no existing row can land in an invalid state.

### Migration Strategy
- Migrate every `DevelopmentRequester` row into a `User` with `role = REQUESTER`, `requiresPasswordChange = true`, and an initial password generated locally (documented, local-only — never committed).
- Re-point `Ticket.requesterId` to the new `User.id`; Ticket numbers, Tickets, and Attachments are unchanged so ownership remains correct.
- Drop `DevelopmentRequester`; remove the development-requester endpoints and client selector state.
- Migration is verified by regression tests proving existing Tickets/Attachments remain valid.

### Seed Data (idempotent)
- At least 4 active Requester and 1 inactive Requester accounts.
- At least 3 active IT Staff and 1 inactive IT Staff accounts.
- At least 1 active Administrator account.
- Realistic Tickets distributed across Requesters, statuses, priorities, and assigned/unassigned ownership.
- Example Public Comments and Internal Notes that expose no sensitive information.
- Seeded credentials are for local development only and are documented in the README (never real personal secrets in the repository).

## 8. API Contract

See `api-spec.md` for the full formal contract. Capabilities:
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`.
- All Lab 2 Requester Ticket and Attachment APIs, authenticated, with ownership from the session identity.
- `GET /api/staff/tickets` (Queue) with search/filter/sort/pagination; `GET /api/staff/tickets/:id`.
- `PATCH /api/staff/tickets/:id/owner`, `/priority`, `/status`.
- `POST|GET /api/tickets/:id/comments` (Public Comments); `POST|GET /api/tickets/:id/notes` (Internal Notes, permitted roles only).
- `POST /api/tickets/:id/resolved-indication` (Requester "Problem Appears Resolved").
- `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/initial-password`.

Auth mechanism: password hashing + server-side opaque session token in an HttpOnly, SameSite=Strict cookie; sessions expire and are invalidated on logout (details and justification in `api-spec.md` §0). Every protected endpoint distinguishes unauthenticated (401), forbidden (403), invalid input (400), conflict (409), missing (404), and internal (500) without leaking the existence of other users' resources.

## 9. Acceptance Criteria

- **AC-01** Given an active user with valid credentials, when the user logs in, then the backend establishes authenticated access and returns the permitted user identity and role.
- **AC-02** Given a user who must change the initial password, when login succeeds, then normal application screens remain unavailable until a valid new password is saved.
- **AC-03** Given an authenticated Requester, when the client supplies another `requesterId`, then the backend still applies the authenticated identity and does not return another Requester's data.
- **AC-04** Given a Requester account, when an Internal Note endpoint is requested, then the operation is rejected without exposing note content.
- **AC-05** Given invalid credentials, when a user attempts login, then a safe generic error is returned with no account enumeration.
- **AC-06** Given an inactive account, when its user attempts login, then a clear response is returned without exposing the account's details.
- **AC-07** Given a user with an initial password, when a weak or non-matching new password is submitted, then validation errors are shown and the app remains gated.
- **AC-08** Given an authenticated user, when they log out, then sessions are invalidated and subsequent direct navigation or API calls are blocked.
- **AC-09** Given an unauthenticated request to any protected endpoint, then `401` is returned.
- **AC-10** Given an authenticated user lacking a role, when they request a role-protected operation, then `403` is returned without data.
- **AC-11** Given the application shell, then role navigation presents only permitted destinations; unauthorized direct paths are still rejected by the server.
- **AC-12** Given an authenticated Requester, when they use Lab 2 functions, then Create Ticket, My Tickets, Ticket Detail, and Attachments behave as in Lab 2 using the session identity.
- **AC-13** Given the IT Staff Ticket Queue, when search, filters, sorting, or pagination are applied, then correct items and metadata are returned and invalid parameters are rejected safely.
- **AC-14** Given an IT Staff or Administrator, when they claim, assign, or reassign a Ticket, then the owner updates and only eligible roles may do so.
- **AC-15** Given IT Priority, when IT Staff or Administrator changes it, then it updates; a Requester change is rejected.
- **AC-16** Given a Ticket, when a permitted status transition is applied, then it succeeds; a forbidden transition is rejected with a safe error.
- **AC-17** Given a Public Comment, then Requester, IT Staff, and Administrator see it; an Internal Note is hidden from the Requester.
- **AC-18** Given an Administrator user list, when search or an optional role filter is applied, then the correct users are shown.
- **AC-19** Given an Administrator creating a user, then a user with one role and initial password is created; duplicate email and invalid role are rejected.
- **AC-20** Given an existing user, when an Administrator edits name/email/role/activation or sets a new initial password, then changes apply and the next login requires the password change.
- **AC-21** Given an Administrator, when they attempt to deactivate their own account or the last active Administrator, then the action is rejected.
- **AC-22** Given a non-Administrator, when User Management is requested, then access is denied.
- **AC-23** Given the application on desktop, tablet, and mobile, then every screen is responsive with no clipping, overlap, hidden buttons, or horizontal page scrolling.
- **AC-24** Given the screens, then loading, empty, no-results, forbidden, and safe-failure feedback is meaningful on each major screen.

## 10. Definition of Done

- All approved scope from Section 3 is implemented and AC-01..AC-24 are satisfied.
- Every Acceptance Criterion maps to at least one passing automated test from documented commands on the final `lab3-staging`/`main`; no required test is skipped, disabled, or commented out.
- Server-side role/ownership authorization is proven by direct-API authorization tests (not only hidden UI controls).
- The migration is tested: existing Lab 2 Tickets and Attachments remain valid and correctly owned after evolving to the User model; the Development Requester selector is gone.
- Screens and APIs conform to the approved engineering contract (`specification.md`, `api-spec.md`, `ui-spec.md`).
- Zen Green design, responsive behavior, and accessibility remain consistent with `ui-spec.md`.
- `docs/lab-03/{reviewer.md,ai-use.md}`, artifact screenshots, and updated README/.gitignore are in place.
- All GitHub Issues are in Done on the Kanban; Lab 3 feature branches are merged into `lab3-staging` and then `main`.

## 11. Assumptions and Decisions

- **Authentication approach**: bcrypt password hashing + a server-side opaque session token stored in a `Session` table, delivered in an HttpOnly, SameSite=Strict cookie. Sessions expire after 12 hours of inactivity and are deleted on logout. Chosen over stateless JWTs so logout invalidation is real and enforced server-side, matching the course stack and Lab 2's simple Express/Prisma architecture.
- **CSRF**: mitigated with SameSite=Strict cookies plus a required custom header on mutating requests (documented in `api-spec.md`).
- **Password policy**: minimum 8 characters with at least one lowercase letter, one uppercase letter, one digit and one special character (documented in `ui-spec.md`); initial passwords are user-specific and local-only.
- **Migration identity**: Development Requester rows become Users with `role = REQUESTER` and `requiresPasswordChange = true`; initial passwords are generated for local use only and documented in the README.
- **"Problem Appears Resolved"** is stored as `requesterIndicatedResolvedAt` on the Ticket; it informs IT Staff but does not itself change status (BR-11).
- **Primary owner eligibility**: only active IT Staff or Administrator users can own a Ticket; ownership is not required for a Ticket to exist.
- **Queue default ordering** is newest `updatedAt` first; the final searchable/filterable/sortable fields are defined in `api-spec.md` §7.
- **Emails** are normalized to lowercase before uniqueness checks and storage.
- **Comment/Note length** is capped at 2,000 trimmed characters with empty/whitespace-only content rejected (BR-12).
- **User list** intentionally has no pagination, multi-column sorting, or simultaneous filters (excluded by §4.2); search and a single optional role filter are the supported refinements.
- Cross-role access that would disclose existence returns the same non-disclosing error as a missing resource (BR-21).