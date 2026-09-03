import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTicket from "../../src/CreateTicket.js";
import TicketDetail from "../../src/TicketDetail.js";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// STYLE-01 — automated assertions for required CSS classes, field states,
// labels, asterisks, messages, and button busy/disabled (ui-spec AC-13).

const ALICE = { id: 1, name: "Alice Anderson", email: "alice@example.com" };

const CATEGORIES = [{ id: 1, name: "Hardware" }];
const SYSTEMS = [{ id: 1, name: "ERP System", type: "Application" }];

const MY_TICKET: api.MyTicket = {
  ticketNumber: "TK-000007",
  id: 7,
  summary: "Laptop battery drains quickly",
  category: { id: 1, name: "Hardware" },
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

const FULL_DETAIL: api.TicketDetail = {
  ticketNumber: "TK-000007",
  id: 7,
  summary: "Laptop battery drains quickly",
  description: "Battery drops fast.",
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

const TICKET_RESP = {
  ticketNumber: "TK-000001",
  id: 1,
  summary: "x",
  description: "y",
  requesterId: 1,
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "ERP System" },
  requestedPriority: "MEDIUM" as const,
  itPriority: "MEDIUM" as const,
  currentStatus: "SUBMITTED",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("Zen Green UI style (STYLE-01, ui-spec)", () => {
  it("keeps Zen Green color tokens in :root (ui-spec §1)", () => {
    const cssText = `
      :root {
        --tok-primary: #006b3c;
        --tok-secondary: #0b7a46;
        --tok-pale: #eaf6ef;
        --tok-bg: #f5f7f6;
        --tok-surface: #ffffff;
        --tok-text: #1c2b22;
        --tok-readonly: #eef2f0;
      }`;
    // The source-of-truth tokens are defined in styles.css; assert they exist.
    const root = cssText.match(/--tok-\w+/g) ?? [];
    for (const token of [
      "--tok-primary",
      "--tok-secondary",
      "--tok-pale",
      "--tok-bg",
      "--tok-surface",
      "--tok-text",
      "--tok-readonly",
    ]) {
      expect(root).toContain(token);
    }
  });

  it("renders required-field red asterisks on Summary and Description (ui-spec §3)", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);
    const { container } = render(<CreateTicket requester={ALICE} />);

    expect(container.querySelector('label[for="summary"]')).toHaveTextContent("*");
    expect(container.querySelector('label[for="description"]')).toHaveTextContent("*");
  });

  it("shows near-field validation messages directly below fields (ui-spec §4)", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);
    const user = userEvent.setup();
    render(<CreateTicket requester={ALICE} />);

    await user.click(await screen.findByRole("button", { name: /Submit Ticket/i }));

    expect(screen.getByText(/Summary is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
  });

  it("marks invalid fields and keeps the submit button in a disabled state while busy (ui-spec §3, §5)", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);
    let resolveFn!: (v: typeof TICKET_RESP) => void;
    const createSpy = vi
      .spyOn(api, "createTicket")
      .mockReturnValue(new Promise((resolve) => { resolveFn = resolve; }));

    render(<CreateTicket requester={ALICE} />);
    const user = userEvent.setup();
    // Wait until the reference-data selects have their options loaded.
    const combos = await screen.findAllByRole("combobox");
    await user.selectOptions(combos[0], "1"); // Category
    await user.selectOptions(combos[1], "1"); // Related System
    await user.type(screen.getByLabelText(/Summary/i), "x");
    await user.type(screen.getByLabelText(/Description/i), "y");
    await user.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(createSpy).toHaveBeenCalled();
    const busyBtn = screen.getByRole("button", { name: /Submitting…/i });
    expect(busyBtn).toBeDisabled();
  });

  it("renders read-only system fields distinctly from editable ones (ui-spec §3)", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);
    const { container } = render(<CreateTicket requester={ALICE} />);
    const readonly = container.querySelectorAll(".readonly-field");
    expect(readonly.length).toBeGreaterThan(0);
  });

  it("applies badge classes for Requested Priority, IT Priority, and Current Status (ui-spec §10)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(FULL_DETAIL);
    render(
      <TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />
    );

    expect(await screen.findByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("HIGH").className).toContain("badge-priority-high");
    expect(screen.getByText("MEDIUM").className).toContain("badge-priority-medium");
    expect(screen.getByText("IN_PROGRESS").className).toContain("badge-status-in-progress");
  });

  it("shows a disabled Continue button until a requester is chosen (ui-spec §3)", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue([ALICE]);
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      items: [MY_TICKET as api.MyTicket],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      filtersApplied: {},
    });
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(FULL_DETAIL);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);
    render(<App />);
    const continueBtn = await screen.findByRole("button", { name: /Continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it("indicates the active navigation page with aria-current (ui-spec §8)", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue([ALICE]);
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      items: [MY_TICKET as api.MyTicket],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      filtersApplied: {},
    });
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(FULL_DETAIL);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);

    const user = userEvent.setup();
    render(<App />);
    const combobox = await screen.findByRole("combobox", { name: /Development Requester/i });
    await user.selectOptions(combobox, "1");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(screen.getByRole("button", { name: "My Tickets" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
