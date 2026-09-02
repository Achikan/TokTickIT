import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyTickets from "../../src/MyTickets.js";
import * as api from "../../src/api.js";

const ALICE = {
  id: 1,
  name: "Alice Anderson",
  email: "alice.anderson@example.com",
};

const TICKETS: api.MyTicket[] = [
  {
    ticketNumber: "TK-000001",
    id: 1,
    summary: "Laptop battery drains quickly",
    category: { id: 1, name: "Hardware" },
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "IN_PROGRESS",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    ticketNumber: "TK-000002",
    id: 2,
    summary: "Printer offline in room 202",
    category: { id: 2, name: "Printing" },
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "SUBMITTED",
    updatedAt: "2026-09-01T09:00:00.000Z",
  },
];

function listResponse(items: api.MyTicket[], overrides: Partial<api.MyTicketsResponse> = {}) {
  return {
    items,
    pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
    filtersApplied: {},
    ...overrides,
  };
}

describe("MyTickets", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Hardware" },
      { id: 2, name: "Printing" },
    ]);
  });

  it("shows the requester's ticket list with badges and metadata (UI-08, FR-11)", async () => {
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue(listResponse(TICKETS));

    render(<MyTickets requester={ALICE} onCreate={() => {}} />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("TK-000001")).toBeInTheDocument();
    expect(within(table).getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(within(table).getByText("TK-000002")).toBeInTheDocument();
    expect(within(table).getByText("Printer offline in room 202")).toBeInTheDocument();

    // Badges for Requested Priority and Current Status (ui-spec §10).
    expect(within(table).getByText("IN_PROGRESS").className).toContain("badge");
    expect(
      within(table).getAllByText("HIGH").some((el) => el.className.includes("badge"))
    ).toBe(true);

    // Result metadata: total + page indicator.
    expect(screen.getByText(/2 tickets · Page 1 of 1/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create a new ticket/i })
    ).toBeInTheDocument();
  });

  it("shows a distinct empty state when there are no tickets (UI-08, AC-14)", async () => {
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue(listResponse([]));

    render(<MyTickets requester={ALICE} onCreate={() => {}} />);

    expect(
      await screen.findByText(/You don't have any tickets yet/i)
    ).toBeInTheDocument();
  });

  it("shows a distinct no-results state when filters/search match nothing (UI-08, AC-14)", async () => {
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue(
      listResponse([], { filtersApplied: { search: "zzz" } })
    );

    render(<MyTickets requester={ALICE} onCreate={() => {}} />);

    expect(
      await screen.findByText(/No tickets match your current search and filters/i)
    ).toBeInTheDocument();
  });

  it("shows a safe failure state when the API call fails (UI-08, FR-19)", async () => {
    vi.spyOn(api, "fetchMyTickets").mockRejectedValue(new Error("network down"));

    render(<MyTickets requester={ALICE} onCreate={() => {}} />);

    expect(
      await screen.findByText(/Unable to load your tickets/i)
    ).toBeInTheDocument();
  });

  it("applies search, filters, and pagination to the query (AC-07, FR-12)", async () => {
    const fetchSpy = vi.spyOn(api, "fetchMyTickets").mockResolvedValue(
      listResponse(TICKETS, {
        pagination: { page: 1, pageSize: 10, total: 12, totalPages: 2 },
      })
    );
    const user = userEvent.setup();
    render(<MyTickets requester={ALICE} onCreate={() => {}} />);
    await screen.findByRole("table");

    // Search.
    await user.type(screen.getByRole("textbox", { name: /Search/i }), "printer");
    await user.click(screen.getByRole("button", { name: /Search/i }));
    expect(fetchSpy).toHaveBeenLastCalledWith(
      ALICE.id,
      expect.objectContaining({ search: "printer", page: 1 })
    );

    // Status filter.
    await user.selectOptions(
      screen.getByLabelText(/Status/i),
      "SUBMITTED"
    );
    expect(fetchSpy).toHaveBeenLastCalledWith(
      ALICE.id,
      expect.objectContaining({ status: "SUBMITTED", page: 1 })
    );

    // Priority filter.
    await user.selectOptions(screen.getByLabelText(/Priority/i), "HIGH");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      ALICE.id,
      expect.objectContaining({ requestedPriority: "HIGH" })
    );

    // Sort.
    await user.selectOptions(screen.getByLabelText(/Sort/i), "summary");
    expect(fetchSpy).toHaveBeenLastCalledWith(
      ALICE.id,
      expect.objectContaining({ sort: "summary" })
    );

    // Pagination.
    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(fetchSpy).toHaveBeenLastCalledWith(
      ALICE.id,
      expect.objectContaining({ page: 2 })
    );
  });

  it("reloads data when the selected requester changes (UI-07, AC-06)", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchMyTickets")
      .mockResolvedValue(listResponse(TICKETS));
    const { rerender } = render(<MyTickets requester={ALICE} onCreate={() => {}} />);
    await screen.findByRole("table");
    expect(fetchSpy).toHaveBeenCalledWith(ALICE.id, expect.anything());

    const BOB = { id: 2, name: "Bob Brown", email: "bob.brown@example.com" };
    rerender(<MyTickets requester={BOB} onCreate={() => {}} />);
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchSpy).toHaveBeenLastCalledWith(BOB.id, expect.anything());
  });

  it("renders mobile cards in addition to the desktop table (utilities present)", async () => {
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue(listResponse(TICKETS));
    render(<MyTickets requester={ALICE} onCreate={() => {}} />);

    await screen.findByRole("table");
    const wrapper = document.querySelector("div.table-responsive");
    expect(wrapper).not.toBeNull();
    expect(wrapper!.className).toContain("d-none");
    expect(wrapper!.className).toContain("d-md-block");

    const cards = document.querySelectorAll("ul.list-unstyled.d-md-none .card");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("uses the correct requester-scoped identity header via fetchMyTickets", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchMyTickets")
      .mockResolvedValue(listResponse([]));
    render(<MyTickets requester={ALICE} onCreate={() => {}} />);
    await screen.findByText(/You don't have any tickets yet/i);
    expect(fetchSpy).toHaveBeenCalledWith(1, expect.anything());
  });
});