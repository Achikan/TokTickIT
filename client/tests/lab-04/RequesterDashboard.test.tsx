import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequesterDashboard from "../../src/RequesterDashboard.js";
import type { AuthUser } from "../../src/api.js";

const ALICE: AuthUser = { id: 1, name: "Alice Anderson", email: "alice.anderson@example.com", role: "REQUESTER", requiresPasswordChange: false };
const STAFF: AuthUser = { id: 6, name: "Dan", email: "dan@test.com", role: "IT_STAFF", requiresPasswordChange: false };

const DASH = {
  generatedAt: "2026-09-01T12:00:00.000Z",
  metrics: { openCount: 2, waitingForRequesterCount: 1 },
  recentlyUpdated: { items: [{ id: 101, ticketNumber: "TK-001001", summary: "Battery", currentStatus: "OPEN", itPriority: "MEDIUM", requestedPriority: "MEDIUM", owner: { id: 6, name: "Dan" }, updatedAt: "2026-09-01T11:00:00.000Z" }] },
  recentlyResolved: { items: [{ id: 102, ticketNumber: "TK-001002", summary: "Fixed", currentStatus: "RESOLVED", itPriority: "LOW", requestedPriority: "LOW", owner: null, updatedAt: "2026-09-01T10:00:00.000Z" }] },
  drilldown: { open: "/api/tickets?status=OPEN", waitingForRequester: "/api/tickets?status=WAITING_FOR_REQUESTER", recentlyUpdated: "/api/tickets?sort=-updatedAt", recentlyResolved: "/api/tickets?status=RESOLVED" },
};

afterEach(() => vi.restoreAllMocks());

describe("UI-RD-01/02: requester dashboard", () => {
  it("renders metrics, lists and drill-downs", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(DASH), { status: 200 }));
    const onViewTickets = vi.fn();
    const onViewTicket = vi.fn();
    render(<RequesterDashboard user={ALICE} onViewTickets={onViewTickets} onViewTicket={onViewTicket} />);

    await waitFor(() => expect(screen.getByText("My Dashboard")).toBeInTheDocument());
    expect(screen.getByText("My Open Tickets")).toBeInTheDocument();
    expect(screen.getByText("Waiting for Me")).toBeInTheDocument();
    expect(screen.getByText("TK-001001")).toBeInTheDocument();
    expect(screen.getByText("TK-001002")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: /My Open Tickets/i }));
    expect(onViewTickets).toHaveBeenCalled();

    await userEvent.setup().click(screen.getByRole("button", { name: "TK-001001" }));
    expect(onViewTicket).toHaveBeenCalled();
  });

  it("shows zero states and no search/filter/pagination", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...DASH, metrics: { openCount: 0, waitingForRequesterCount: 0 }, recentlyUpdated: { items: [] }, recentlyResolved: { items: [] } }), { status: 200 }));
    render(<RequesterDashboard user={ALICE} />);
    expect(await screen.findByText(/No recently updated tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/No recently resolved tickets/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply/i })).not.toBeInTheDocument();
  });

  it("forbidden for non-requester", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "FORBIDDEN" } }), { status: 403 }));
    render(<RequesterDashboard user={STAFF} />);
    expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument();
  });
});
