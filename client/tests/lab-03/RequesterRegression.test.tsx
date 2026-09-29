import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketDetail from "../../src/TicketDetail.js";
import CreateTicket from "../../src/CreateTicket.js";
import * as api from "../../src/api.js";

// Lab 3 Issue 20 — Requester Regression (Lab 3 sheet §8.2).
// UI-09: the Development Requester selector is gone; identity is the session.
// UI-10: Requester Ticket Detail adds Public Comments + "Problem Appears Resolved".

const ALICE: api.AuthUser = {
  id: 1,
  name: "Alice Anderson",
  email: "alice.anderson@example.com",
  role: "REQUESTER",
  requiresPasswordChange: false,
};

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

function makeDetail(overrides: Partial<api.TicketDetail> = {}): api.TicketDetail {
  return {
    ticketNumber: "TK-000007",
    id: 7,
    summary: "Laptop battery drains quickly",
    description: "Battery drops from 100% to 20% in an hour.",
    requesterId: 1,
    category: { id: 1, name: "Hardware" },
    relatedSystem: { id: 1, name: "ERP System", type: "Application" },
    requestedPriority: "HIGH",
    itPriority: "MEDIUM",
    currentStatus: "IN_PROGRESS",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    requesterIndicatedResolvedAt: null,
    attachments: [],
    ...overrides,
  };
}

const STAFF_COMMENT: api.TicketComment = {
  id: 21,
  ticketId: 7,
  content: "We are looking into it.",
  author: { id: 9, name: "Dan Das" },
  createdAt: "2026-09-01T09:00:00.000Z",
};

describe("Issue 20 — Requester regression UI (UI-09, UI-10)", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(makeDetail());
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
      { id: 1, name: "ERP System", type: "Application" },
    ]);
  });

  it("UI-09: identity comes from the authenticated session, with no requester selector", async () => {
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    await screen.findByText("Laptop battery drains quickly");

    // The signed-in Requester is shown by name ...
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    // ... and the removed Lab 2 selector affordances are absent.
    expect(screen.queryByText(/Development Requester/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Change Requester/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /requester/i })).not.toBeInTheDocument();
  });

  it("UI-09: Create Ticket has no Development Requester selector", async () => {
    render(<CreateTicket requester={ALICE} />);
    await screen.findByLabelText(/Requester/i);

    expect(screen.getByLabelText(/Requester/i)).toHaveValue(
      "Alice Anderson (alice.anderson@example.com)"
    );
    expect(screen.queryByText(/Development Requester/i)).not.toBeInTheDocument();
  });

  it("UI-10: lists Public Comments with author and timestamp for all roles (FR-10, AC-17)", async () => {
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([STAFF_COMMENT]);

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    expect(await screen.findByText("We are looking into it.")).toBeInTheDocument();
    expect(screen.getByText("Dan Das")).toBeInTheDocument();
    expect(screen.getByText(/Public Comments/i)).toBeInTheDocument();
  });

  it("UI-10: posts a Public Comment on the owned Ticket (FR-10)", async () => {
    const posted: api.TicketComment = {
      id: 22,
      ticketId: 7,
      content: "Thanks, I will try the suggested fix.",
      author: { id: 1, name: "Alice Anderson" },
      createdAt: "2026-09-01T09:30:00.000Z",
    };
    const postSpy = vi.spyOn(api, "postTicketComment").mockResolvedValue(posted);
    const user = userEvent.setup();

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    await screen.findByText("Laptop battery drains quickly");

    await user.type(
      screen.getByLabelText(/Add a comment/i),
      "Thanks, I will try the suggested fix."
    );
    await user.click(screen.getByRole("button", { name: /Post Comment/i }));

    expect(postSpy).toHaveBeenCalledWith(7, "Thanks, I will try the suggested fix.");
    expect(
      await screen.findByText("Thanks, I will try the suggested fix.")
    ).toBeInTheDocument();
  });

  it("UI-10: rejects an empty comment without calling the API (BR-12)", async () => {
    const postSpy = vi.spyOn(api, "postTicketComment").mockResolvedValue(STAFF_COMMENT);
    const user = userEvent.setup();

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    await screen.findByText("Laptop battery drains quickly");

    await user.click(screen.getByRole("button", { name: /Post Comment/i }));

    expect(await screen.findByText(/Comment is required/i)).toBeInTheDocument();
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("UI-10: records 'Problem Appears Resolved' without changing status (FR-11, BR-11)", async () => {
    const at = "2026-09-01T11:00:00.000Z";
    const indicateSpy = vi.spyOn(api, "indicateProblemResolved").mockResolvedValue({
      id: 7,
      ticketNumber: "TK-000007",
      currentStatus: "IN_PROGRESS",
      requesterIndicatedResolvedAt: at,
    });
    const user = userEvent.setup();

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    await screen.findByText("Laptop battery drains quickly");

    await user.click(screen.getByRole("button", { name: /Mark as appears resolved/i }));

    expect(indicateSpy).toHaveBeenCalledWith(7);
    expect(await screen.findByTestId("resolved-indicated")).toBeInTheDocument();
    // The formal status is untouched; only the indication is recorded.
    expect(screen.getByText("IN_PROGRESS").className).toContain("badge-status-in-progress");
  });

  it("UI-10: shows the recorded indication instead of the action when already set (idempotent)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(
      makeDetail({ requesterIndicatedResolvedAt: "2026-09-01T11:00:00.000Z" })
    );

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    expect(await screen.findByTestId("resolved-indicated")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Mark as appears resolved/i })
    ).not.toBeInTheDocument();
  });
});
