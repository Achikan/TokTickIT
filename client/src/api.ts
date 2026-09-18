const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Lab 3 — every request carries the session cookie, and mutating requests must
// include the CSRF marker header (api-spec.md §0). Centralising this keeps the
// individual API functions free of auth plumbing.
const CSRF_HEADER = "X-CSRF-Protected";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (MUTATING_METHODS.has(method)) headers.set(CSRF_HEADER, "1");
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
}

// Error surfaced by the API (api-spec.md §0): status + optional machine code and
// per-field validation messages.
export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code?: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function toApiError(res: Response, fallback: string): Promise<ApiError> {
  const body = await res.json().catch(() => ({}));
  const error = (body as { error?: { code?: string; message?: string; fields?: Record<string, string> } })
    .error;
  return new ApiError(error?.message ?? fallback, res.status, error?.code, error?.fields);
}

// Lab 3 — authenticated user (api-spec.md §1). `requiresPasswordChange` gates the
// mandatory change-password screen (AC-02).
export type Role = "REQUESTER" | "IT_STAFF" | "ADMIN";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  requiresPasswordChange: boolean;
}

// POST /api/auth/login (AC-01, AC-05, AC-06).
export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await toApiError(res, "Unable to sign in.");
  const body = (await res.json()) as { user: AuthUser };
  return body.user;
}

// POST /api/auth/logout (AC-08). A missing/expired session is already logged out.
export async function logout(): Promise<void> {
  const res = await apiFetch("/api/auth/logout", { method: "POST" });
  if (!res.ok && res.status !== 401) throw await toApiError(res, "Unable to sign out.");
}

// GET /api/auth/me (FR-03). Returns null when there is no valid session.
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await apiFetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw await toApiError(res, "Unable to load your account.");
  const body = (await res.json()) as { user: AuthUser };
  return body.user;
}

// POST /api/auth/change-password (AC-02, AC-07, BR-03).
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<AuthUser> {
  const res = await apiFetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  if (!res.ok) throw await toApiError(res, "Unable to change password.");
  const body = (await res.json()) as { user: AuthUser };
  return body.user;
}

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  type: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// Lab 3 — statuses expand from the Lab 2 set to the eight workflow statuses
// (specification.md §5.2). The readonly Requester detail must badge them all.
export type Status =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export interface Ticket {
  ticketNumber: string;
  id: number;
  summary: string;
  description: string;
  requesterId: number;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: Priority;
  attachments?: File[];
}

// Issue 9 — My Tickets list query and item shapes (api-spec.md §5).
export interface TicketQuery {
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  status?: Status;
  requestedPriority?: Priority;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface MyTicket {
  ticketNumber: string;
  id: number;
  summary: string;
  category: { id: number; name: string };
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: Status;
  updatedAt: string;
}

export interface MyTicketsResponse {
  items: MyTicket[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  filtersApplied: Record<string, unknown>;
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await apiFetch("/api/health");
  if (!healthRes.ok) throw new Error("TokTickIT API is unreachable");
  const categoriesRes = await apiFetch("/api/categories");
  if (!categoriesRes.ok) throw new Error("Unable to load categories");
  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

// Issue 8 — reference data for the Create Ticket form.
export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch("/api/categories");
  if (!res.ok) throw new Error("Unable to load categories");
  return (await res.json()) as Category[];
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await apiFetch("/api/related-systems");
  if (!res.ok) throw new Error("Unable to load related systems");
  const body: { items: RelatedSystem[] } = await res.json();
  return body.items;
}

// Issue 8 — create a validated Ticket. Identity comes from the authenticated
// session; the client no longer supplies any requesterId (BR-06, AC-03).
export async function createTicket(
  input: CreateTicketInput
): Promise<Ticket> {
  const res = await apiFetch("/api/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("Unable to create ticket") as Error & {
      fields?: Record<string, string>;
    };
    if (body?.error?.fields) err.fields = body.error.fields;
    throw err;
  }
  return body.ticket as Ticket;
}

export interface TicketDetail {
  ticketNumber: string;
  id: number;
  summary: string;
  description: string;
  requesterId: number;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string; type: string };
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: Status;
  createdAt: string;
  updatedAt: string;
  requesterIndicatedResolvedAt: string | null;
  attachments: AttachmentInfo[];
}

// Issue 9 — list the session requester's tickets (identity from the session).
export async function fetchMyTickets(
  query: TicketQuery = {}
): Promise<MyTicketsResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.relatedSystemId) params.set("relatedSystemId", String(query.relatedSystemId));
  if (query.status) params.set("status", query.status);
  if (query.requestedPriority) params.set("requestedPriority", query.requestedPriority);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();

  const res = await apiFetch(`/api/tickets${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Unable to load tickets");
  return (await res.json()) as MyTicketsResponse;
}

export interface AttachmentInfo {
  id: number;
  ticketId?: number;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  removedAt: string | null;
  removedReason: string | null;
}

// Issue 10 — retrieve one owned Ticket for the detail view (api-spec.md §3).
export async function fetchTicketDetail(ticketId: number): Promise<TicketDetail> {
  const res = await apiFetch(`/api/tickets/${ticketId}`);
  if (!res.ok) throw new Error("Unable to load ticket");
  const body = await res.json();
  return body.ticket as TicketDetail;
}

// ---------------------------------------------------------------------------
// Issue 11 — Attachment lifecycle (FR-15..FR-18).
// Upload, list metadata, download (active only), and soft-remove with reason.
// Ownership is enforced from the session; no requesterId is sent (BR-06).
// ---------------------------------------------------------------------------

// Upload a file to an owned Ticket (multipart, field `file`).
export async function uploadAttachment(
  ticketId: number,
  file: File
): Promise<AttachmentInfo> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(`/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("Unable to upload attachment") as Error & {
      fields?: Record<string, string>;
    };
    if (body?.error?.fields) err.fields = body.error.fields;
    throw err;
  }
  return body.attachment as AttachmentInfo;
}

// List metadata for an owned Ticket's attachments (removed are included).
export async function fetchTicketAttachments(ticketId: number): Promise<AttachmentInfo[]> {
  const res = await apiFetch(`/api/tickets/${ticketId}/attachments`);
  if (!res.ok) throw new Error("Unable to load attachments");
  const body: { items: AttachmentInfo[] } = await res.json();
  return body.items;
}

// Download an active attachment. Returns the file data + suggested filename.
export async function downloadAttachment(
  attachment: AttachmentInfo
): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const res = await apiFetch(`/api/attachments/${attachment.id}/download`);
  if (!res.ok) {
    const err = new Error("Unable to download attachment") as Error & {
      code?: string;
    };
    if (res.status === 410) err.code = "UNAVAILABLE";
    throw err;
  }
  return {
    blob: await res.blob(),
    filename: attachment.originalName,
    mimeType: attachment.mimeType,
  };
}

// Soft-remove an attachment with a reason (BR-08).
export async function removeAttachment(
  attachmentId: number,
  removedReason: string
): Promise<AttachmentInfo> {
  const res = await apiFetch(`/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ removedReason }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("Unable to remove attachment") as Error & {
      fields?: Record<string, string>;
    };
    if (body?.error?.fields) err.fields = body.error.fields;
    throw err;
  }
  return body.attachment as AttachmentInfo;
}

// ---------------------------------------------------------------------------
// Issue 20 — Requester communication (api-spec.md §4).
// Public Comments (all three roles) and the Requester-only "Problem Appears
// Resolved" indication. Identity comes from the session.
// ---------------------------------------------------------------------------

export interface TicketComment {
  id: number;
  ticketId: number;
  content: string;
  author: { id: number; name: string };
  createdAt: string;
}

// GET /api/tickets/:id/comments — newest first (FR-10, AC-17).
export async function fetchTicketComments(ticketId: number): Promise<TicketComment[]> {
  const res = await apiFetch(`/api/tickets/${ticketId}/comments`);
  if (!res.ok) throw new Error("Unable to load comments");
  const body: { items: TicketComment[] } = await res.json();
  return body.items;
}

// POST /api/tickets/:id/comments — append-only public comment (FR-10, BR-12).
export async function postTicketComment(ticketId: number, content: string): Promise<TicketComment> {
  const res = await apiFetch(`/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("Unable to post comment") as Error & {
      fields?: Record<string, string>;
    };
    if (body?.error?.fields) err.fields = body.error.fields;
    throw err;
  }
  return body.comment as TicketComment;
}

export interface ResolvedIndication {
  id: number;
  ticketNumber: string;
  currentStatus: Status;
  requesterIndicatedResolvedAt: string | null;
}

// ---------------------------------------------------------------------------
// Issue 21 — IT Staff Ticket Queue (api-spec.md §6.1).
// Search, suitable filters, sorting, pagination + metadata. Only IT Staff and
// Administrators may load the queue; identity comes from the session.
// ---------------------------------------------------------------------------

export interface StaffTicket {
  ticketNumber: string;
  id: number;
  summary: string;
  category: { id: number; name: string };
  requester: { id: number; name: string };
  owner: { id: number; name: string } | null;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: Status;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueueQuery {
  search?: string;
  status?: Status;
  requestedPriority?: Priority;
  itPriority?: Priority;
  ownerId?: string;
  categoryId?: number;
  relatedSystemId?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface StaffQueueResponse {
  items: StaffTicket[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  filtersApplied: Record<string, unknown>;
}

// GET /api/staff/tickets (FR-12, AC-13). `ownerId` accepts an id or the
// markers "unassigned"/"null" for tickets without a primary owner.
export async function fetchStaffQueue(query: StaffQueueQuery = {}): Promise<StaffQueueResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.requestedPriority) params.set("requestedPriority", query.requestedPriority);
  if (query.itPriority) params.set("itPriority", query.itPriority);
  if (query.ownerId) params.set("ownerId", query.ownerId);
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.relatedSystemId) params.set("relatedSystemId", String(query.relatedSystemId));
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();

  const res = await apiFetch(`/api/staff/tickets${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw await toApiError(res, "Unable to load the ticket queue.");
  return (await res.json()) as StaffQueueResponse;
}

// POST /api/tickets/:id/resolved-indication — idempotent; does not change the
// status (FR-11, BR-11).
export async function indicateProblemResolved(
  ticketId: number
): Promise<ResolvedIndication> {
  const res = await apiFetch(`/api/tickets/${ticketId}/resolved-indication`, {
    method: "POST",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("Unable to record your indication") as Error & {
      fields?: Record<string, string>;
    };
    if (body?.error?.fields) err.fields = body.error.fields;
    throw err;
  }
  return body.ticket as ResolvedIndication;
}