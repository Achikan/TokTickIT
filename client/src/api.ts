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

export type Status = "SUBMITTED" | "IN_PROGRESS" | "RESOLVED";

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