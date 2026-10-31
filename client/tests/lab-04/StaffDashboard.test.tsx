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
  generatedAt: "2026-09-01T12:00:00.000Z",
  metrics: {
    unassignedCount: 2,
    ownedByMeCount: 3,
    byStatus: { NEW: 1, OPEN: 2, IN_PROGRESS: 1, WAITING_FOR_REQUESTER: 1, RESOLVED: 1, CLOSED: 1, REOPENED: 0, CANCELLED: 0 },
    byPriority: { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 1 },
  },
  recentlyUpdated: {
    items: [
      { id: 101, ticketNumber: "TK-001001", summary: "Battery drains fast", currentStatus: "IN_PROGRESS", itPriority: "MEDIUM", updatedAt: "2026-09-01T11:00:00.000Z", owner: { id: 6, name: "Dan Das" } },
    ],
  },
  urgentHigh: {
    items: [
      { id: 102, ticketNumber: "TK-001002", summary: "VPN down", currentStatus: "NEW", itPriority: "URGENT", updatedAt: "2026-09-01T10:00:00.000Z", owner: null },
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
    const onSelectTicket = vi.fn();
    const onViewQueue = vi.fn();
    const user = userEvent.setup();

    render(<StaffDashboard user={DAN} onSelectTicket={onSelectTicket} onViewQueue={onViewQueue} />);

    await waitFor(() => expect(screen.getByText("IT Staff Dashboard")).toBeInTheDocument(), { timeout: 3000 });
    const unassignedBtn = screen.getByRole("button", { name: /Unassigned Tickets/i });
    expect(unassignedBtn).toHaveTextContent("2");
    const ownedByMeBtn = screen.getByRole("button", { name: /Owned by me/i });
    expect(ownedByMeBtn).toHaveTextContent("3");

    expect(screen.getByText("TK-001001")).toBeInTheDocument();
    expect(screen.getByText("TK-001002")).toBeInTheDocument();
    expect(screen.getByText(/Owner:\s*Dan Das/i)).toBeInTheDocument();
    expect(screen.getByText(/Owner:\s*Unassigned/i)).toBeInTheDocument();

    // Click Unassigned card -> drill down to queue ownerId=unassigned
    await user.click(unassignedBtn);
    expect(onViewQueue).toHaveBeenCalledWith({ ownerId: "unassigned" });

    // Click Owned by me card -> drill down to queue ownerId=me
    await user.click(ownedByMeBtn);
    expect(onViewQueue).toHaveBeenCalledWith({ ownerId: "me" });

    // Click status button -> drill down to queue with status
    await user.click(screen.getByRole("button", { name: /^OPEN\b/i }));
    expect(onViewQueue).toHaveBeenCalledWith({ status: "OPEN" });

    // Click priority button -> drill down to queue with itPriority
    await user.click(screen.getByRole("button", { name: /^HIGH\b/i }));
    expect(onViewQueue).toHaveBeenCalledWith({ itPriority: "HIGH" });

    // Click ticket -> select ticket detail
    await user.click(screen.getByRole("button", { name: "TK-001001" }));
    expect(onSelectTicket).toHaveBeenCalledWith(101);
  });

  it("shows empty states when no recent/urgent tickets", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      generatedAt: "2026-09-01T12:00:00.000Z",
      metrics: {
        unassignedCount: 0,
        ownedByMeCount: 0,
        byStatus: { NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 },
        byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      },
      recentlyUpdated: { items: [] },
      urgentHigh: { items: [] },
      drilldown: {
        unassigned: "/api/staff/tickets?ownerId=unassigned",
        ownedByMe: "/api/staff/tickets?ownerId=me",
        byStatus: "/api/staff/tickets?status={status}",
        byPriority: "/api/staff/tickets?itPriority={priority}",
        recentlyUpdated: "/api/staff/tickets?sort=-updatedAt",
      },
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
      userCounts: { total: 10, active: 7 },
    }), { status: 200 }));
    render(<StaffDashboard user={ADMIN} />);
    expect(await screen.findByText("User accounts (concise)")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("does not show AD-01 user counts for IT_STAFF", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...DASH,
      userCounts: { total: 10, active: 7 },
    }), { status: 200 }));
    render(<StaffDashboard user={DAN} />);
    await waitFor(() => expect(screen.getByText("IT Staff Dashboard")).toBeInTheDocument());
    expect(screen.queryByText("User accounts (concise)")).not.toBeInTheDocument();
  });
});
