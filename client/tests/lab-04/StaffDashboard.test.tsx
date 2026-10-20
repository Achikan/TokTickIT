import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffDashboard from "../../src/StaffDashboard.js";
import type { AuthUser } from "../../src/api.js";

// Lab 4 Issue 34 — IT Staff Dashboard (tests.md API/UI-SD-01..04)

const DAN: AuthUser = { id: 6, name: "Dan Das", email: "dan.das@example.com", role: "IT_STAFF", requiresPasswordChange: false };
const ADMIN: AuthUser = { id: 9, name: "Admin Ada", email: "admin@example.com", role: "ADMIN", requiresPasswordChange: false };
const ALICE: AuthUser = { id: 1, name: "Alice Anderson", email: "alice.anderson@example.com", role: "REQUESTER", requiresPasswordChange: false };

const DASH = {
  metrics: {
    unassigned: 2,
    ownedByMe: 3,
    byStatus: { NEW: 1, OPEN: 2, IN_PROGRESS: 1, WAITING_FOR_REQUESTER: 1, RESOLVED: 1, CLOSED: 1, REOPENED: 0, CANCELLED: 0 },
    byItPriority: { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 1 },
  },
  lists: {
    recentlyUpdated: [
      { id: 101, ticketNumber: "TK-001001", summary: "Battery drains fast", currentStatus: "IN_PROGRESS", itPriority: "MEDIUM", requestedPriority: "MEDIUM", updatedAt: "2026-09-01T11:00:00.000Z", ownerId: 6 },
    ],
    urgentHigh: [
      { id: 102, ticketNumber: "TK-001002", summary: "VPN down", currentStatus: "NEW", itPriority: "URGENT", requestedPriority: "HIGH", updatedAt: "2026-09-01T10:00:00.000Z", ownerId: null },
    ],
  },
};

afterEach(() => vi.restoreAllMocks());

describe("UI-SD-01/02: staff dashboard cards and lists", () => {
  it("renders metrics, lists and drill-downs", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(DASH), { status: 200 }));
    render(<StaffDashboard user={DAN} />);

    await waitFor(() => expect(screen.getByText("IT Staff Dashboard")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText("Unassigned Tickets")).toBeInTheDocument();
    expect(screen.getByText("Owned by me")).toBeInTheDocument();
    expect(screen.getByText("TK-001001")).toBeInTheDocument();
    expect(screen.getByText("TK-001002")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unassigned Tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Owned by me/i })).toBeInTheDocument();
  });

  it("shows empty states when no recent/urgent tickets", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      metrics: { unassigned: 0, ownedByMe: 0, byStatus: { NEW:0,OPEN:0,IN_PROGRESS:0,WAITING_FOR_REQUESTER:0,RESOLVED:0,CLOSED:0,REOPENED:0,CANCELLED:0 }, byItPriority: { LOW:0,MEDIUM:0,HIGH:0,URGENT:0 } },
      lists: { recentlyUpdated: [], urgentHigh: [] },
    }), { status: 200 }));
    render(<StaffDashboard user={DAN} />);
    expect(await screen.findByText(/No recently updated tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/No urgent\/high priority tickets/i)).toBeInTheDocument();
  });

  it("shows forbidden for non-staff", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "FORBIDDEN" } }), { status: 403 }));
    render(<StaffDashboard user={ALICE} />);
    expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument();
  });

  it("shows safe failure with retry", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response("bad", { status: 500 })).mockResolvedValueOnce(new Response(JSON.stringify(DASH), { status: 200 }));
    const user = userEvent.setup();
    render(<StaffDashboard user={DAN} />);
    expect(await screen.findByText(/Unable to load/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Retry/i }));
    expect(await screen.findByText("TK-001001")).toBeInTheDocument();
    expect((global.fetch as any)).toHaveBeenCalledTimes(2);
  });
});

describe("UI-SD-04: Admin reuse with user counts", () => {
  it("shows AD-01 user counts for Administrators", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...DASH,
      administrator: { userCounts: { total: 10, active: 7, requesters: 6, staff: 3, admins: 1 } },
    }), { status: 200 }));
    render(<StaffDashboard user={ADMIN} />);
    expect(await screen.findByText("User accounts (concise)")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Requesters")).toBeInTheDocument();
  });
});
