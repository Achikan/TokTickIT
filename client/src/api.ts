const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  type: string;
}

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type Status = "NEW" | "IN_PROGRESS" | "RESOLVED";

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
  requesterId: number;
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
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) throw new Error("TokTickIT API is unreachable");
  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) throw new Error("Unable to load categories");
  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

// Issue 7 — Development Requester context (testing-only "login").
export async function fetchDevelopmentRequesters(): Promise<DevelopmentRequester[]> {
  const res = await fetch(`${API_URL}/api/development-requesters`);
  if (!res.ok) throw new Error("Unable to load development requesters");
  const body: { items: DevelopmentRequester[] } = await res.json();
  return body.items;
}

// Issue 8 — reference data for the Create Ticket form.
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error("Unable to load categories");
  return (await res.json()) as Category[];
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) throw new Error("Unable to load related systems");
  const body: { items: RelatedSystem[] } = await res.json();
  return body.items;
}

// Issue 8 — create a validated Ticket.
export async function createTicket(
  input: CreateTicketInput
): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requester-Id": String(input.requesterId),
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

export interface AttachmentInfo {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  removedAt: string | null;
  removedReason: string | null;
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
  attachments: AttachmentInfo[];
}

// Issue 9 — list the selected requester's tickets (requester-scoped identity header).
export async function fetchMyTickets(
  requesterId: number,
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

  const res = await fetch(`${API_URL}/api/tickets${qs ? `?${qs}` : ""}`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });
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

// Issue 10 — retrieve one owned Ticket for the detail view (api-spec.md §6).
export async function fetchTicketDetail(
  requesterId: number,
  ticketId: number
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });
  if (!res.ok) throw new Error("Unable to load ticket");
  const body = await res.json();
  return body.ticket as TicketDetail;
}

// ---------------------------------------------------------------------------
// Issue 11 — Attachment lifecycle (FR-15..FR-18).
// Upload, list metadata, download (active only), and soft-remove with reason.
// ---------------------------------------------------------------------------

// Upload a file to an owned Ticket (multipart, field `file`).
export async function uploadAttachment(
  requesterId: number,
  ticketId: number,
  file: File
): Promise<AttachmentInfo> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: { "X-Requester-Id": String(requesterId) },
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
export async function fetchTicketAttachments(
  requesterId: number,
  ticketId: number
): Promise<AttachmentInfo[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });
  if (!res.ok) throw new Error("Unable to load attachments");
  const body: { items: AttachmentInfo[] } = await res.json();
  return body.items;
}

// Download an active attachment. Returns the file data + suggested filename.
export async function downloadAttachment(
  requesterId: number,
  attachment: AttachmentInfo
): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const res = await fetch(`${API_URL}/api/attachments/${attachment.id}/download`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });
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
  requesterId: number,
  attachmentId: number,
  removedReason: string
): Promise<AttachmentInfo> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Requester-Id": String(requesterId),
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