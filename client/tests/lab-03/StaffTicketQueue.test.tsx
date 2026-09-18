import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketQueue from "../../src/StaffTicketQueue.js";
import * as api from "../../src/api.js";

// Lab 3 Issue 21 — Staff Ticket Queue UI (tests.md §2, UI-11, UI-12, UI-18).
//   UI-11 search / filter / sort / pagination controls update the list.
//   UI-12 empty vs no-results states are distinct.
//   UI-18 forbidden/failure feedback rendering.
//   AC-13 responsive + badges + open-detail action (ui-spec.md §5).

const DAN: api.AuthUser = {
  id: 6,
  name: "Dan Das",
  email: "dan.das@example.com",
  role: "IT_STAFF",
  requiresPasswordChange: false,
};

const STAFF_NULL: api.StaffTicket[] = [];

const TICKETS: api.StaffTicket[] = [
  {
    ticketNumber: "TK-001001",
    id: 101,
    summary: "Laptop battery drains quickly",
    category: { id: 1, name: "Hardware" },
    requester: { id: 1, name: "Alice Anderson" },
    owner: null,
    requestedPriority: "MEDIUM",
    itPriority: "HIGH",
    currentStatus: "NEW",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T11:00:00.000Z",
  },
  {
    ticketNumber: "TK-001002",
    id: 102,
    summary: "Cannot log into VPN from lab",
    category: { id: 4, name: "Network" },
    requester: { id: 2, name: "Bob Brown" },
    owner: { id: 6, name: "Dan Das" },
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "OPEN",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-02T09:00:00.000Z",
  },
];

function listResponse(items: api.StaffTicket[], overrides: Partial<api.StaffQueueResponse> = {}) {
  return {
    items,
    pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
    filtersApplied: {},
    ...overrides,
  };
}

describe("StaffTicketQueue", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Hardware" },
      { id: 4, name: "Network" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-11: renders the queue table with badges, owner and both priorities", async () => {
    vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(listResponse(TICKETS));

    render(<StaffTicketQueue user={DAN} />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("TK-001001")).toBeInTheDocument();
    expect(within(table).getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(within(table).getByText("Cannot log into VPN from lab")).toBeInTheDocument();

    // Owner shown by name, or a distinct "Unassigned" marker (ui-spec §5).
    expect(within(table).getByText("Dan Das")).toBeInTheDocument();
    expect(within(table).getByText("Unassigned")).toBeInTheDocument();

    // Both Requested Priority and IT Priority badges render.
    const mediumBadge = within(table)
      .getAllByText("MEDIUM")
      .find((el) => el.className.includes("badge"));
    expect(mediumBadge?.className).toContain("badge-priority-medium");
    const highBadges = within(table)
      .getAllByText("HIGH")
      .filter((el) => el.className.includes("badge"));
    expect(highBadges.length).toBeGreaterThanOrEqual(2);

    const statusBadge = within(table)
      .getAllByText("OPEN")
      .find((el) => el.className.includes("badge"));
    expect(statusBadge?.className).toContain("badge-status-open");

    // Open action present on desktop rows.
    expect(screen.getAllByRole("button", { name: /Open ticket/i }).length).toBeGreaterThan(0);

    // Result metadata.
    expect(screen.getByText(/2 tickets · Page 1 of 1/i)).toBeInTheDocument();
  });

  it("UI-11: search, owner, filter, sort and pagination controls update the query", async () => {
    const fetchSpy = vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(
      listResponse(TICKETS, {
        pagination: { page: 1, pageSize: 10, total: 20, totalPages: 2 },
      })
    );
    const user = userEvent.setup();
    render(<StaffTicketQueue user={DAN} />);
    await screen.findByRole("table");

    // Search + owner filter submit together.
    await user.type(screen.getByRole("textbox", { name: /Search/i }), "vpn");
    await user.type(screen.getByRole("textbox", { name: /Owner/i }), "unassigned");
    await user.click(screen.getByRole("button", { name: /Search/i }));
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "vpn", ownerId: "unassigned", page: 1 })
    );

    // Category filter.
    await user.selectOptions(screen.getByLabelText(/Category/i), "4");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: 4, page: 1 })
    );

    // Status filter.
    await user.selectOptions(screen.getByLabelText(/Status/i), "NEW");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "NEW" })
    );

    // Requested Priority filter.
    await user.selectOptions(screen.getByLabelText(/Requested Priority/i), "HIGH");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ requestedPriority: "HIGH" })
    );

    // IT Priority filter.
    await user.selectOptions(screen.getByLabelText(/IT Priority/i), "URGENT");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ itPriority: "URGENT" })
    );

    // Sort.
    await user.selectOptions(screen.getByLabelText(/Sort/i), "+ticketNumber");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "+ticketNumber" })
    );

    // Pagination.
    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(fetchSpy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));

    // Reset clears search, owner and returns to defaults.
    await user.click(screen.getByRole("button", { name: /Reset/i }));
    expect(fetchSpy).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, sort: "-updatedAt" });
  });

  it("UI-12: shows a distinct empty state when nothing exists yet", async () => {
    vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(listResponse(STAFF_NULL));

    render(<StaffTicketQueue user={DAN} />);

    expect(
      await screen.findByText(/No tickets in the queue yet/i)
    ).toBeInTheDocument();
  });

  it("UI-12: shows a distinct no-results state when search/filters match nothing", async () => {
    vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(
      listResponse(STAFF_NULL, { filtersApplied: { search: "zzz" } })
    );

    render(<StaffTicketQueue user={DAN} />);

    expect(
      await screen.findByText(/No tickets match your current search and filters/i)
    ).toBeInTheDocument();
  });

  it("UI-18: shows a loading state while the queue is being fetched", async () => {
    let resolveList!: (res: api.StaffQueueResponse) => void;
    vi.spyOn(api, "fetchStaffQueue").mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      })
    );

    render(<StaffTicketQueue user={DAN} />);

    expect(screen.getByText(/Loading the ticket queue…/i)).toBeInTheDocument();

    resolveList(listResponse(TICKETS));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("UI-18: shows a safe failure state when the API call fails", async () => {
    vi.spyOn(api, "fetchStaffQueue").mockRejectedValue(new Error("network down"));

    render(<StaffTicketQueue user={DAN} />);

    expect(
      await screen.findByText(/Unable to load the ticket queue/i)
    ).toBeInTheDocument();
  });

  it("lets staff open a ticket via the Open action", async () => {
    vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(listResponse(TICKETS));
    const onOpenTicket = vi.fn();
    render(<StaffTicketQueue user={DAN} onOpenTicket={onOpenTicket} />);

    const openButtons = await screen.findAllByRole("button", { name: /Open ticket/i });
    expect(openButtons.length).toBeGreaterThan(0);

    const user = userEvent.setup();
    await user.click(openButtons[0]);
    expect(onOpenTicket).toHaveBeenCalledWith(TICKETS[0]);
  });

  it("AC-23: renders desktop table plus a smaller-screen card representation", async () => {
    vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(listResponse(TICKETS));
    render(<StaffTicketQueue user={DAN} onOpenTicket={() => {}} />);

    await screen.findByRole("table");
    const wrapper = document.querySelector("div.table-responsive");
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toContain("d-none");
    expect(wrapper!.className).toContain("d-md-block");

    const cards = document.querySelectorAll("ul.list-unstyled.d-md-none .card");
    expect(cards.length).toBeGreaterThan(0);
  });
});