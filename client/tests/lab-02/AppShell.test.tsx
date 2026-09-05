import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const ALICE = { id: 1, name: "Alice Anderson", email: "alice.anderson@example.com" };

const MY_TICKET: api.MyTicket = {
  ticketNumber: "TK-000007",
  id: 7,
  summary: "Laptop battery drains quickly",
  category: { id: 1, name: "Hardware" },
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

const FULL_DETAIL: api.TicketDetail = {
  ticketNumber: "TK-000007",
  id: 7,
  summary: "Laptop battery drains quickly",
  description: "Battery drains fast.",
  requesterId: 1,
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "ERP System", type: "Application" },
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  attachments: [],
};

const CREATED_TICKET = {
  ticketNumber: "TK-000009",
  id: 9,
  summary: "Laptop battery drains quickly",
  description: "Details.",
  requesterId: 1,
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "ERP System" },
  requestedPriority: "MEDIUM" as const,
  itPriority: "MEDIUM" as const,
  currentStatus: "NEW",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("App shell navigation", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue([ALICE]);
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      items: [MY_TICKET],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      filtersApplied: {},
    });
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(FULL_DETAIL);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
      { id: 1, name: "ERP System", type: "Application" },
    ]);
  });

  async function login(user: ReturnType<typeof userEvent.setup>) {
    const combobox = await screen.findByRole("combobox", {
      name: /Development Requester/i,
    });
    await user.selectOptions(combobox, "1");
    await user.click(screen.getByRole("button", { name: /Continue/i }));
  }

  it("shell shows My Tickets and Create Ticket navigation with a clear active page (ui-spec §8)", async () => {
    const user = userEvent.setup();
    render(<App />);
    await login(user);

    expect(await screen.findByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
    const myTicketsNav = screen.getByRole("button", { name: "My Tickets" });
    const createNav = screen.getByRole("button", { name: "Create Ticket" });
    expect(myTicketsNav).toHaveAttribute("aria-current", "page");
    expect(createNav).not.toHaveAttribute("aria-current");
    expect(screen.getByText(/Selected Requester/i)).toBeInTheDocument();
  });

  it("opens a ticket from My Tickets and returns via Back to My Tickets", async () => {
    const user = userEvent.setup();
    render(<App />);
    await login(user);

    const openButtons = await screen.findAllByRole("button", {
      name: /Open ticket TK-000007/i,
    });
    await user.click(openButtons[0]);

    expect(await screen.findByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByText("Battery drains fast.")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("ERP System")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Back to My Tickets/i }));
    expect(
      await screen.findByRole("heading", { name: /My Tickets/i })
    ).toBeInTheDocument();
  });

  it("switches from My Tickets to the Create Ticket form and back via View in My Tickets (AC-05)", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue(CREATED_TICKET);
    const user = userEvent.setup();
    render(<App />);
    await login(user);

    await user.click(screen.getByRole("button", { name: "Create Ticket" }));
    expect(
      await screen.findByRole("heading", { name: /Create Ticket/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Ticket" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    const comboboxes = screen.getAllByRole("combobox");
    await user.selectOptions(comboboxes[0], "1"); // Category
    await user.selectOptions(comboboxes[1], "1"); // Related System
    await user.type(screen.getByLabelText(/Summary/i), "Laptop battery drains quickly");
    await user.type(screen.getByLabelText(/Description/i), "Details.");
    await user.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    await user.click(await screen.findByRole("button", { name: /View in My Tickets/i }));
    expect(
      await screen.findByRole("heading", { name: /My Tickets/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My Tickets" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});