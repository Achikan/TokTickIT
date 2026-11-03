import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffDashboard from "../../src/StaffDashboard.js";
import type { AuthUser } from "../../src/api.js";

const DAN: AuthUser = { id: 6, name: "Dan Das", email: "dan.das@example.com", role: "IT_STAFF", requiresPasswordChange: false };
const ADMIN: AuthUser = { id: 9, name: "Admin Ada", email: "admin@example.com", role: "ADMIN", requiresPasswordChange: false };
const ALICE: AuthUser = { id: 1, name: "Alice Anderson", email: "alice.anderson@example.com", role: "REQUESTER", requiresPasswordChange: false };

const DASH = {
  generatedAt: "2026-09-01T12:00:00.000Z",
  metrics: {
    unassignedCount: 2,
    ownedByMeCount: 3,
    byStatus: { NEW: 1, OPEN: 2, IN_PROGRESS: 1, WAITING_FOR_REQUESTER: 1, RESOLVED: 1, CLOSED: 1, REOPENED: 0, CANCELLED: 0 },
    byPriority: { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 1 },
  },
  recentlyUpdated: {
    items: [
      { id: 101, ticketNumber: "TK-001001", summary: "Battery drains fast", currentStatus: "IN_PROGRESS", itPriority: "MEDIUM", owner: { id: 6, name: "Dan Das" }, updatedAt: "2026-09-01T11:00:00.000Z" },
    ],
  },
  urgentHigh: {
    items: [
      { id: 102, ticketNumber: "TK-001002", summary: "VPN down", currentStatus: "NEW", itPriority: "URGENT", owner: null, updatedAt: "2026-09-01T10:00:00.000Z" },
      { id: 103, ticketNumber: "TK-001003", summary: "Printer jam", currentStatus: "OPEN", itPriority: "HIGH", owner: { id: 6, name: "Dan Das" }, updatedAt: "2026-09-01T09:00:00.000Z" },
    ],
  },
  drilldown: {
    unassigned: "/api/staff/tickets?ownerId=unassigned",
    ownedByMe: "/api/staff/tickets?ownerId=me",
    byStatus: "/api/staff/tickets?status={status}",
    byPriority: "/api/staff/tickets?itPriority={priority}",
    recentlyUpdated: "/api/staff/tickets?sort=-updatedAt",
  },
};

afterEach(() => vi.restoreAllMocks());

describe("UI-SD-01/02: staff dashboard cards and lists", () => {
  it("renders metrics, lists and drill-downs", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(DASH), { status: 200 }));
    const onViewQueue = vi.fn();
    const onSelectTicket = vi.fn();
    render(<StaffDashboard user={DAN} onViewQueue={onViewQueue} onSelectTicket={onSelectTicket} />);

    await waitFor(() => expect(screen.getByText("IT Staff Dashboard")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText("Unassigned Tickets")).toBeInTheDocument();
    expect(screen.getByText("Owned by me")).toBeInTheDocument();
    expect(screen.getByText("TK-001001")).toBeInTheDocument();
    expect(screen.getByText("TK-001002")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Unassigned Tickets/i });
    expect(link).toBeInTheDocument();
    (link as HTMLElement).click();
    expect(onViewQueue).toHaveBeenCalledWith({ ownerId: "unassigned", status: "open" });

    // drilldown links carry documented query parameters
    const statusLink = screen.getByRole("link", { name: /NEW/ });
    expect((statusLink as HTMLAnchorElement).getAttribute("href")).toContain("status=NEW");
    const prioLink = screen.getByRole("link", { name: /HIGH/ });
    expect((prioLink as HTMLAnchorElement).getAttribute("href")).toContain("itPriority=HIGH");

    const ticketBtn = screen.getByRole("button", { name: "TK-001001" });
    ticketBtn.click();
    expect(onSelectTicket).toHaveBeenCalledWith(101);
  });

  it("shows empty states when no recent/urgent tickets", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...DASH,
      metrics: { unassignedCount: 0, ownedByMeCount: 0, byStatus: { NEW:0,OPEN:0,IN_PROGRESS:0,WAITING_FOR_REQUESTER:0,RESOLVED:0,CLOSED:0,REOPENED:0,CANCELLED:0 }, byPriority: { LOW:0,MEDIUM:0,HIGH:0,URGENT:0 } },
      recentlyUpdated: { items: [] },
      urgentHigh: { items: [] },
    }), { status: 200 }));
    render(<StaffDashboard user={DAN} />);
    expect(await screen.findByText(/No recently updated tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/No urgent or high-priority tickets/i)).toBeInTheDocument();
  });

  it("IT_STAFF does not see user counts", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(DASH), { status: 200 }));
    render(<StaffDashboard user={DAN} />);
    await waitFor(() => expect(screen.getByText("IT Staff Dashboard")).toBeInTheDocument());
    expect(screen.queryByText("User accounts (concise)")).not.toBeInTheDocument();
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

  it("double-click card fires single navigation", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(DASH), { status: 200 }));
    const onViewQueue = vi.fn();
    render(<StaffDashboard user={DAN} onViewQueue={onViewQueue} />);
    await waitFor(() => expect(screen.getByText("Unassigned Tickets")).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /Unassigned Tickets/i });
    link.click();
    link.click();
    expect(onViewQueue).toHaveBeenCalledTimes(1);
  });
});

describe("UI-SD-04: Admin reuse with user counts", () => {
  it("shows AD-01 user counts for Administrators", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...DASH,
      userCounts: { total: 10, active: 7 },
    }), { status: 200 }));
    const onViewUsers = vi.fn();
    render(<StaffDashboard user={ADMIN} onViewUsers={onViewUsers} />);
    expect(await screen.findByText("User accounts (concise)")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    const card = screen.getByRole("link", { name: /View user management/i });
    card.click();
    expect(onViewUsers).toHaveBeenCalled();
  });
});
