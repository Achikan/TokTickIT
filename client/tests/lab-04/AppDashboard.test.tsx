import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const STAFF: api.AuthUser = { id: 6, name: "Dan Das", email: "dan.das@example.com", role: "IT_STAFF", requiresPasswordChange: false };

const DASH = {
  generatedAt: "2026-09-01T12:00:00.000Z",
  metrics: { unassignedCount: 2, ownedByMeCount: 3, byStatus: { NEW: 1, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 }, byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 } },
  recentlyUpdated: { items: [{ id: 101, ticketNumber: "TK-001001", summary: "Battery", currentStatus: "NEW", itPriority: "LOW", owner: null, updatedAt: "2026-09-01T11:00:00.000Z" }] },
  urgentHigh: { items: [] },
  drilldown: { unassigned: "/api/staff/tickets?ownerId=unassigned", ownedByMe: "/api/staff/tickets?ownerId=me", byStatus: "/api/staff/tickets?status={status}", byPriority: "/api/staff/tickets?itPriority={priority}", recentlyUpdated: "/api/staff/tickets?sort=-updatedAt" },
};

const QUEUE = { items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 }, filtersApplied: {} };

const DETAIL: api.StaffTicketDetailData = {
  id: 101, ticketNumber: "TK-001001", summary: "Battery", category: { id: 1, name: "Hardware" }, requester: { id: 1, name: "Alice" }, owner: null, requestedPriority: "MEDIUM", itPriority: "LOW", currentStatus: "NEW", createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T11:00:00.000Z", description: "d", relatedSystem: { id: 1, name: "ERP", type: "Application" }, requesterIndicatedResolvedAt: null, attachments: [], comments: [], notes: [], availableOwners: [], actionsCount: 0,
};

beforeEach(() => {
  vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(STAFF);
  vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(QUEUE as any);
  vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);
  vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
  vi.spyOn(api, "fetchStaffAssignees").mockResolvedValue([]);
  global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(DASH), { status: 200 })) as any;
});

afterEach(() => vi.restoreAllMocks());

describe("App dashboard drill-down", () => {
  it("sends filter to StaffTicketQueue when a card is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Staff Dashboard" });
    await user.click(screen.getByRole("button", { name: "Staff Dashboard" }));
    await screen.findByText("Unassigned Tickets");
    const link = screen.getByRole("link", { name: /Unassigned Tickets/i });
    await user.click(link);
    await screen.findByRole("heading", { name: /Ticket Queue/i });
    expect(api.fetchStaffQueue).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "unassigned", page: 1 }));
  });

  it("opens StaffTicketDetail when a ticket is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Staff Dashboard" });
    await user.click(screen.getByRole("button", { name: "Staff Dashboard" }));
    await screen.findByText("TK-001001");
    await user.click(screen.getByRole("button", { name: "TK-001001" }));
    await vi.waitFor(() => expect(api.fetchStaffTicketDetail).toHaveBeenCalledWith(101));
  });
});
