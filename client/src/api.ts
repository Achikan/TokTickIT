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
    headers: { "Content-Type": "application/json" },
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