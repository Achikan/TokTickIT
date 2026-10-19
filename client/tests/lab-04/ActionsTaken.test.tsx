import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

// Lab 4 Issue 31 — Actions Taken UI on Ticket Detail (tests.md §4, UI-TA-01..06;
// ui-spec.md §5; specification.md FR-02/FR-05/FR-22; AC-13/AC-17).

const DAN: api.AuthUser = {
  id: 6,
  name: "Dan Das",
  email: "dan.das@example.com",
  role: "IT_STAFF",
  requiresPasswordChange: false,
};

const ALICE: api.AuthUser = {
  id: 1,
  name: "Alice Anderson",
  email: "alice.anderson@example.com",
  role: "REQUESTER",
  requiresPasswordChange: false,
};

const STAFF_SUMMARY: api.StaffTicket = {
  ticketNumber: "TK-001001",
  id: 101,
  summary: "Laptop battery drains quickly",
  category: { id: 1, name: "Hardware" },
  requester: { id: 1, name: "Alice Anderson" },
  owner: { id: 6, name: "Dan Das" },
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T11:00:00.000Z",
};

const STAFF_DETAIL: api.StaffTicketDetailData = {
  ...STAFF_SUMMARY,
  description: "Battery drops from 100% to 20% within an hour on idle.",
  relatedSystem: { id: 1, name: "ERP System", type: "Application" },
  requesterIndicatedResolvedAt: null,
  attachments: [],
  comments: [],
  notes: [],
  availableOwners: [{ id: 6, name: "Dan Das" }],
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

const REQUESTER_DETAIL: api.TicketDetail = {
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
};

const ACTION_FOLLOW_UP: api.TicketAction = {
  id: 501,
  ticketId: 101,
  actionDateTime: "2026-09-01T10:30:00.000Z",
  actionDescription: "Swapped the battery with the spare from stock.",
  result: "Battery now holds a full charge.",
  performedBy: { id: 6, name: "Dan Das", role: "IT_STAFF" },
  followUpRequired: true,
  followUpNote: "Ask the requester to confirm after 24 hours.",
  attachmentNotes: "battery-report.png — see tab 2",
  createdAt: "2026-09-01T10:31:00.000Z",
  updatedAt: "2026-09-01T10:31:00.000Z",
};

const ACTION_PLAIN: api.TicketAction = {
  id: 502,
  ticketId: 101,
  actionDateTime: "2026-09-01T09:00:00.000Z",
  actionDescription: "Ran a battery health diagnostic.",
  result: null,
  performedBy: { id: 7, name: "Eileen Ford", role: "IT_STAFF" },
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  createdAt: "2026-09-01T09:01:00.000Z",
  updatedAt: "2026-09-01T09:01:00.000Z",
};

const CREATED_ACTION: api.TicketAction = {
  id: 900,
  ticketId: 101,
  actionDateTime: "2026-09-01T12:00:00.000Z",
  actionDescription: "Replaced battery",
  result: null,
  performedBy: { id: 6, name: "Dan Das", role: "IT_STAFF" },
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  createdAt: "2026-09-01T12:01:00.000Z",
  updatedAt: "2026-09-01T12:01:00.000Z",
};

const CREATED_TICKET_SUMMARY: api.TicketActionTicketSummary = {
  id: 101,
  currentStatus: "IN_PROGRESS",
  updatedAt: "2026-09-01T12:01:00.000Z",
  actionsCount: 1,
};

function renderStaff() {
  vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(STAFF_DETAIL);
  render(<StaffTicketDetail user={DAN} ticket={STAFF_SUMMARY} onBack={() => {}} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(api, "fetchTicketActions").mockResolvedValue([]);
});

describe("Actions Taken (UI-TA-01..06)", () => {
  it("UI-TA-01: renders the staff list with date, description, performer and a non-colour follow-up cue", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([ACTION_FOLLOW_UP, ACTION_PLAIN]);

    renderStaff();

    const heading = await screen.findByRole("heading", { name: "Actions Taken" });
    expect(heading).toBeInTheDocument();

    const table = screen.getByTestId("actions-table");
    expect(within(table).getByText(ACTION_FOLLOW_UP.actionDescription)).toBeInTheDocument();
    expect(within(table).getByText(ACTION_PLAIN.actionDescription)).toBeInTheDocument();
    expect(within(table).getAllByText("Dan Das").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("(IT Staff)").length).toBeGreaterThan(0);
    expect(within(table).getByText("Battery now holds a full charge.")).toBeInTheDocument();

    // Follow-up is conveyed by an icon + the literal word, not colour alone.
    const cue = table.querySelector(".badge-followup");
    expect(cue).not.toBeNull();
    expect(cue?.textContent).toContain("Follow-up");
    expect(cue?.textContent).toContain("❗");
    expect(within(table).getByText("No")).toBeInTheDocument();

    // Semantic date/time cell.
    expect(table.querySelector("time")).not.toBeNull();
    expect(within(table).getAllByText(/2026-09-01 \d\d:\d\d/).length).toBeGreaterThan(0);

    // Staff can start editing from a row.
    expect(within(table).getByRole("button", { name: "Edit action 501" })).toBeInTheDocument();
  });

  it("UI-TA-01: shows an empty state and an Add Action control when there are no actions", async () => {
    renderStaff();

    await screen.findByRole("heading", { name: "Actions Taken" });
    expect(await screen.findByTestId("actions-empty")).toHaveTextContent(
      "No actions recorded yet."
    );
    expect(screen.getByRole("button", { name: "Add Action" })).toBeInTheDocument();
  });

  it("UI-TA-02: creates an action from Ticket Detail and shows the automatic performer", async () => {
    const create = vi
      .spyOn(api, "createTicketAction")
      .mockResolvedValue({ action: CREATED_ACTION, ticket: CREATED_TICKET_SUMMARY });

    const user = userEvent.setup();
    renderStaff();
    await screen.findByRole("heading", { name: "Actions Taken" });

    await user.click(screen.getByRole("button", { name: "Add Action" }));

    const form = screen.getByRole("form", { name: /Add action/i });
    // Performed By is automatic from the session — read-only, never an input.
    expect(within(form).getByTestId("action-performer-note")).toHaveTextContent("Dan Das");
    expect(within(form).queryByLabelText(/Performed By/i)).toBeNull();

    await user.type(
      within(form).getByLabelText("Action Description"),
      "Replaced battery"
    );
    await user.click(within(form).getByRole("button", { name: "Save Action" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          actionDescription: "Replaced battery",
          followUpRequired: false,
          followUpNote: null,
        })
      )
    );

    // Success returns to the list and shows the new action.
    await waitFor(() =>
      expect(screen.queryByRole("form", { name: /Add action/i })).toBeNull()
    );
    expect((await screen.findAllByText("Replaced battery")).length).toBeGreaterThan(0);
  });

  it("UI-TA-02/03: reveals and requires the Follow-up Note only when follow-up is switched on", async () => {
    const create = vi
      .spyOn(api, "createTicketAction")
      .mockResolvedValue({ action: CREATED_ACTION, ticket: CREATED_TICKET_SUMMARY });

    const user = userEvent.setup();
    renderStaff();
    await screen.findByRole("heading", { name: "Actions Taken" });
    await user.click(screen.getByRole("button", { name: "Add Action" }));

    const form = screen.getByRole("form", { name: /Add action/i });
    await user.type(within(form).getByLabelText("Action Description"), "Follow up with vendor");

    // Hidden while follow-up is off.
    expect(within(form).queryByLabelText("Follow-up Note")).toBeNull();

    await user.click(within(form).getByLabelText("Follow-up needed?"));
    expect(within(form).getByLabelText("Follow-up Note")).toBeInTheDocument();

    // Submitting without the note is blocked near-field and nothing is sent.
    await user.click(within(form).getByRole("button", { name: "Save Action" }));
    expect(
      within(form).getByText("A follow-up note is required when follow-up is needed.")
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    // The typed description is preserved.
    expect(within(form).getByLabelText("Action Description")).toHaveValue("Follow up with vendor");
  });

  it("UI-TA-02/BR-07: inserts a backdated action newest-first and refreshes the ticket timestamp", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([ACTION_FOLLOW_UP]);
    const backdated: api.TicketAction = {
      ...CREATED_ACTION,
      id: 800,
      actionDateTime: "2026-09-01T08:00:00.000Z",
      actionDescription: "Backdated earlier action",
    };
    const newTicketSummary: api.TicketActionTicketSummary = {
      ...CREATED_TICKET_SUMMARY,
      updatedAt: "2026-09-01T14:00:00.000Z",
    };
    vi.spyOn(api, "createTicketAction").mockResolvedValue({
      action: backdated,
      ticket: newTicketSummary,
    });

    const user = userEvent.setup();
    renderStaff();
    await screen.findByRole("heading", { name: "Actions Taken" });

    await user.click(screen.getByRole("button", { name: "Add Action" }));
    const form = screen.getByRole("form", { name: /Add action/i });
    await user.type(
      within(form).getByLabelText("Action Description"),
      "Backdated earlier action"
    );
    await user.click(within(form).getByRole("button", { name: "Save Action" }));

    // BR-07: the older action lands below the newer one, not at the top.
    await waitFor(() =>
      expect(screen.getAllByText("Backdated earlier action").length).toBeGreaterThan(0)
    );
    const table = screen.getByTestId("actions-table");
    const bodyRows = within(table).getAllByRole("row").slice(1);
    expect(bodyRows[0].textContent).toContain(ACTION_FOLLOW_UP.actionDescription);
    expect(bodyRows[1].textContent).toContain("Backdated earlier action");

    // The Ticket's cached updatedAt follows the create response (BR-12 anchor).
    expect(
      screen.getByText(new Date(newTicketSummary.updatedAt).toLocaleString())
    ).toBeInTheDocument();
  });

  it("UI-TA-04: requester sees the actions read-only with no write controls", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(REQUESTER_DETAIL);
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]);
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([ACTION_FOLLOW_UP]);

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    await screen.findByRole("heading", { name: "Actions Taken" });
    const table = screen.getByTestId("actions-table");
    expect(within(table).getByText(ACTION_FOLLOW_UP.actionDescription)).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Add Action" })).toBeNull();
    expect(screen.queryAllByRole("button", { name: /Edit action/i })).toHaveLength(0);
    expect(screen.queryByRole("form", { name: /Add action|Edit action/i })).toBeNull();
  });

  it("UI-TA-05: pre-fills the edit form and submits the expected version", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([ACTION_FOLLOW_UP]);
    const updated: api.TicketAction = {
      ...ACTION_FOLLOW_UP,
      result: "Battery replaced and tested.",
      updatedAt: "2026-09-01T13:00:00.000Z",
    };
    const update = vi.spyOn(api, "updateTicketAction").mockResolvedValue(updated);

    const user = userEvent.setup();
    renderStaff();
    await screen.findByRole("heading", { name: "Actions Taken" });

    await user.click(screen.getAllByRole("button", { name: "Edit action 501" })[0]);

    const form = screen.getByRole("form", { name: /Edit action/i });
    expect(within(form).getByLabelText("Action Description")).toHaveValue(
      ACTION_FOLLOW_UP.actionDescription
    );
    expect(within(form).getByLabelText("Follow-up Note")).toHaveValue(
      ACTION_FOLLOW_UP.followUpNote
    );

    await user.clear(within(form).getByLabelText("Result"));
    await user.type(within(form).getByLabelText("Result"), "Battery replaced and tested.");
    await user.click(within(form).getByRole("button", { name: "Save Action" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        101,
        501,
        expect.objectContaining({
          result: "Battery replaced and tested.",
          expectedUpdatedAt: ACTION_FOLLOW_UP.updatedAt,
        })
      )
    );
    expect((await screen.findAllByText("Battery replaced and tested.")).length).toBeGreaterThan(0);
  });

  it("UI-TA-05: surfaces a stale-update conflict and can reload the list", async () => {
    const fetchActions = vi
      .spyOn(api, "fetchTicketActions")
      .mockResolvedValue([ACTION_FOLLOW_UP]);
    vi.spyOn(api, "updateTicketAction").mockRejectedValue(
      new api.ApiError("This action was changed by someone else.", 409, "STALE_UPDATE")
    );

    const user = userEvent.setup();
    renderStaff();
    await screen.findByRole("heading", { name: "Actions Taken" });
    await user.click(screen.getAllByRole("button", { name: "Edit action 501" })[0]);

    const form = screen.getByRole("form", { name: /Edit action/i });
    await user.click(within(form).getByRole("button", { name: "Save Action" }));

    expect(
      await screen.findByText(/changed by someone else/i)
    ).toBeInTheDocument();

    const before = fetchActions.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Reload actions" }));
    await waitFor(() => expect(fetchActions.mock.calls.length).toBeGreaterThan(before));
  });

  it("UI-TA-06: preserves typed values on a recoverable error and leaves the form mounted", async () => {
    vi.spyOn(api, "createTicketAction").mockRejectedValue(
      new api.ApiError("Invalid", 400, "VALIDATION_ERROR", {
        actionDescription: "Action Date/Time is out of the allowed range.",
      })
    );

    const user = userEvent.setup();
    renderStaff();
    await screen.findByRole("heading", { name: "Actions Taken" });
    await user.click(screen.getByRole("button", { name: "Add Action" }));

    const form = screen.getByRole("form", { name: /Add action/i });
    await user.type(within(form).getByLabelText("Action Description"), "Sent invoice");
    await user.click(within(form).getByRole("button", { name: "Save Action" }));

    expect(
      await within(form).findByText("Action Date/Time is out of the allowed range.")
    ).toBeInTheDocument();
    expect(within(form).getByLabelText("Action Description")).toHaveValue("Sent invoice");
  });

  it("UI-TA-06: blocks a duplicate double submit while the save is in flight", async () => {
    let resolveCreate: (value: {
      action: api.TicketAction;
      ticket: api.TicketActionTicketSummary;
    }) => void = () => {};
    const create = vi.spyOn(api, "createTicketAction").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    const user = userEvent.setup();
    renderStaff();
    await screen.findByRole("heading", { name: "Actions Taken" });
    await user.click(screen.getByRole("button", { name: "Add Action" }));

    const form = screen.getByRole("form", { name: /Add action/i });
    await user.type(within(form).getByLabelText("Action Description"), "Replaced battery");
    const save = within(form).getByRole("button", { name: "Save Action" });
    await user.click(save);

    const busySave = within(form).getByRole("button", { name: /Saving/i });
    expect(busySave).toBeDisabled();
    await user.click(busySave);
    expect(create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({ action: CREATED_ACTION, ticket: CREATED_TICKET_SUMMARY });
    });
    expect((await screen.findAllByText("Replaced battery")).length).toBeGreaterThan(0);
  });
});
