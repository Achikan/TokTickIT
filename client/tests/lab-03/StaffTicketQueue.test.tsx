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

// Active IT Staff/Administrators eligible to own a ticket (api-spec §6.1a).
const ASSIGNEES: api.StaffAssignee[] = [
  { id: 9, name: "Dan Das", role: "IT_STAFF" },
  { id: 7, name: "Eileen Ford", role: "IT_STAFF" },
  { id: 6, name: "Frank Gao", role: "IT_STAFF" },
  { id: 1, name: "Henri Ito", role: "ADMIN" },
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
    vi.spyOn(api, "fetchStaffAssignees").mockResolvedValue(ASSIGNEES);
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

    // Search + owner filter submit together. Owner is a select of real
    // assignable staff plus the "Unassigned" sentinel (api-spec §6.1a).
    await user.type(screen.getByRole("textbox", { name: /Search/i }), "vpn");
    await user.selectOptions(screen.getByLabelText(/Owner/i), "unassigned");
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

  it("UI-11: Owner is a select of assignable staff plus Unassigned and All, not a raw id box", async () => {
    const fetchSpy = vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(listResponse(TICKETS));
    const user = userEvent.setup();
    render(<StaffTicketQueue user={DAN} />);
    await screen.findByRole("table");

    const owner = screen.getByLabelText(/Owner/i);
    expect(owner.tagName).toBe("SELECT");
    expect(owner).toHaveAttribute("id", "filter-owner");

    const options = within(owner).getAllByRole("option");
    const values = options.map((o) => (o as HTMLOptionElement).value);
    const labels = options.map((o) => o.textContent);
    expect(values).toEqual(["", "unassigned", "9", "7", "6", "1"]);
    expect(labels).toEqual([
      "All",
      "Unassigned",
      "Dan Das",
      "Eileen Ford",
      "Frank Gao",
      "Henri Ito",
    ]);

    // Choosing a person filters by id, not by name.
    await user.selectOptions(owner, "7");
    expect(fetchSpy).toHaveBeenLastCalledWith(expect.objectContaining({ ownerId: "7", page: 1 }));

    // All clears the filter entirely (ownerId omitted).
    await user.selectOptions(owner, "");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ ownerId: expect.anything() })
    );

    // Reset returns the Owner filter to All.
    await user.selectOptions(owner, "unassigned");
    await user.click(screen.getByRole("button", { name: /Reset/i }));
    expect((owner as HTMLSelectElement).value).toBe("");
  });

  it("AC-23: queue dates render compactly and machine-readably, without clipping the table", async () => {
    vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(listResponse(TICKETS));
    render(<StaffTicketQueue user={DAN} onOpenTicket={() => {}} />);
    await screen.findByRole("table");

    // Machine-readable timestamp plus a short display string. The previous
    // toLocaleString() output ("9/29/2026, 11:52:03 AM") is what pushed the
    // Last Updated column out of the viewport.
    const cells = screen.getAllByRole("cell");
    const updatedCell = cells.find((c) => c.querySelector("time[dateTime]") !== null);
    expect(updatedCell).toBeDefined();
    const time = updatedCell!.querySelector("time")!;
    expect(time.getAttribute("datetime")).toMatch(/^2026-09-0[12]T/);
    expect(time.textContent).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(time.textContent).not.toMatch(/AM|PM/);

    // No horizontal-scroll wrapper: the table must fit its container
    // (ui-spec §5 "without a horizontal scroll"), so the responsive helper
    // class that implies sideways scrolling is gone and a fixed layout is used.
    expect(document.querySelector("div.table-responsive")).toBeNull();
    const table = document.querySelector("table")!;
    expect(table.className).toContain("table-fixed");

    // The table is the >=992px representation and the cards take over below it.
    const tableWrap = table.parentElement!;
    expect(tableWrap.className).toContain("d-none");
    expect(tableWrap.className).toContain("d-lg-block");
    const cardList = document.querySelector("ul.list-unstyled")!;
    expect(cardList.className).toContain("d-lg-none");
  });

  it("UI-11: keeps the filter controls mounted and usable while results refresh", async () => {
    // Regression: the whole filter bar used to be unmounted by the loading
    // state, so the second filter change in a row silently did nothing
    // (the detached <select> never delivered its change event).
    const fetchSpy = vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(listResponse(TICKETS));
    const user = userEvent.setup();
    render(<StaffTicketQueue user={DAN} />);
    await screen.findByRole("table");

    const owner = screen.getByLabelText(/Owner/i);
    await user.selectOptions(owner, "9");
    await user.selectOptions(owner, "unassigned");
    await user.selectOptions(owner, "7");

    expect(fetchSpy).toHaveBeenLastCalledWith(expect.objectContaining({ ownerId: "7", page: 1 }));
    // Still the same live element: not remounted by an intervening load.
    expect(screen.getByLabelText(/Owner/i)).toBe(owner);
    expect(owner).toBeEnabled();
  });

  it("AC-23: both representations carry every ticket, its badges and an Open action", async () => {
    const opened: number[] = [];
    vi.spyOn(api, "fetchStaffQueue").mockResolvedValue(listResponse(TICKETS));
    render(<StaffTicketQueue user={DAN} onOpenTicket={(t) => opened.push(t.id)} />);

    await screen.findByRole("table");

    // Desktop table: one row per ticket with status + both priority badges.
    const rows = within(document.querySelector("table")!).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(TICKETS.length);
    expect(within(rows[0]).getByText("MEDIUM")).toBeInTheDocument();
    expect(within(rows[0]).getByText("HIGH")).toBeInTheDocument();
    expect(within(rows[0]).getByText("NEW")).toBeInTheDocument();

    // Card list: same tickets, same badges, own Open action.
    const cards = document.querySelectorAll("ul.list-unstyled .card");
    expect(cards).toHaveLength(TICKETS.length);

    // Both representations are actionable.
    const openButtons = screen.getAllByRole("button", { name: /Open ticket TK-001001/ });
    expect(openButtons).toHaveLength(2);
    await userEvent.setup().click(openButtons[0]);
    expect(opened).toEqual([101]);
  });
});