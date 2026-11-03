import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketWorkflow from "../../src/TicketWorkflow.js";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

// Lab 4 Issue 33 — Ticket Workflow UI controls (tests.md UI-WF-01..03;
// ui-spec.md §6/§9; specification.md FR-13/FR-14, BR-09/BR-11/BR-12,
// AC-11/AC-16/AC-25). Controls must offer only matrix-permitted transitions,
// surface the backend's safe conflict/gate feedback, refresh the summary badge
// in place, and communicate the Requester advisory as status-neutral.

const ANCHOR = "2026-09-01T11:00:00.000Z";

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

function summaryWith(overrides: Partial<api.StaffTicket> = {}): api.StaffTicket {
  return {
    ticketNumber: "TK-001001",
    id: 101,
    summary: "Laptop battery drains quickly",
    category: { id: 1, name: "Hardware" },
    requester: { id: 1, name: "Alice Anderson" },
    owner: { id: 6, name: "Dan Das" },
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: ANCHOR,
    ...overrides,
  };
}

function renderWorkflow(
  props: Partial<React.ComponentProps<typeof TicketWorkflow>> = {}
) {
  const onTransitioned = vi.fn();
  const onReloadTicket = vi.fn();
  render(
    <TicketWorkflow
      ticketId={101}
      currentStatus="NEW"
      expectedUpdatedAt={ANCHOR}
      actionsCount={0}
      onTransitioned={onTransitioned}
      onReloadTicket={onReloadTicket}
      {...props}
    />
  );
  return { onTransitioned, onReloadTicket };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
describe("UI-WF-01: only matrix-permitted transitions are offered", () => {
  it("renders the NEW choices and hides every illegal target", () => {
    renderWorkflow({ currentStatus: "NEW" });

    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Progress" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
    // Not reachable from NEW: no Resolve / Close / Reopen / Waiting control.
    expect(screen.queryByRole("button", { name: "Resolve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reopen" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Waiting/i })).toBeNull();
  });

  it("renders the IN_PROGRESS choices instead", () => {
    renderWorkflow({ currentStatus: "IN_PROGRESS", actionsCount: 2 });

    expect(screen.getByRole("button", { name: "Set Waiting for Requester" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("shows no controls from a terminal CANCELLED status", () => {
    renderWorkflow({ currentStatus: "CANCELLED" });

    expect(screen.getByTestId("workflow-terminal")).toHaveTextContent(/no further status transitions/i);
    expect(within(screen.getByTestId("ticket-workflow")).queryByRole("button")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("UI-WF-01: BR-11 resolve pre-check", () => {
  it("disables Resolve and shows the remedy when there are no Actions", () => {
    renderWorkflow({ currentStatus: "IN_PROGRESS", actionsCount: 0 });

    const resolve = screen.getByRole("button", { name: "Resolve" });
    expect(resolve).toBeDisabled();
    expect(resolve).toHaveAccessibleDescription(/Record at least one Action Taken first/i);
    expect(screen.getByText(/Record at least one Action Taken first/i)).toBeInTheDocument();
  });

  it("enables Resolve once at least one Action exists", () => {
    renderWorkflow({ currentStatus: "IN_PROGRESS", actionsCount: 1 });

    expect(screen.getByRole("button", { name: "Resolve" })).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
describe("UI-WF-01: a permitted transition succeeds and refreshes the summary", () => {
  it("sends the last-read updatedAt and reports success", async () => {
    const spy = vi
      .spyOn(api, "updateStaffTicketStatus")
      .mockResolvedValue(summaryWith({ currentStatus: "OPEN" }));
    const { onTransitioned } = renderWorkflow({ currentStatus: "NEW" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(spy).toHaveBeenCalledWith(101, "OPEN", ANCHOR);
    expect(onTransitioned).toHaveBeenCalledWith(
      expect.objectContaining({ currentStatus: "OPEN" })
    );
    expect(await screen.findByTestId("workflow-success")).toHaveTextContent(/OPEN/);
  });
});

// ---------------------------------------------------------------------------
describe("UI-WF-02: conflict, gate and stale feedback", () => {
  it("surfaces a forbidden transition and refreshes the control set", async () => {
    vi.spyOn(api, "updateStaffTicketStatus").mockRejectedValue(
      new api.ApiError("forbidden", 409, "FORBIDDEN_TRANSITION")
    );
    const { onTransitioned, onReloadTicket } = renderWorkflow({ currentStatus: "NEW" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Start Progress" }));

    expect(await screen.findByTestId("workflow-forbidden")).toHaveTextContent(
      /no longer allowed/i
    );
    expect(onReloadTicket).toHaveBeenCalled();
    expect(onTransitioned).not.toHaveBeenCalled();
  });

  it("shows the exact BR-11 remedy on a resolution-gate conflict", async () => {
    vi.spyOn(api, "updateStaffTicketStatus").mockRejectedValue(
      new api.ApiError("gate", 409, "RESOLUTION_GATE")
    );
    renderWorkflow({ currentStatus: "IN_PROGRESS", actionsCount: 1 });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Resolve" }));

    expect(await screen.findByTestId("workflow-gate")).toHaveTextContent(
      /Record at least one action on this ticket before resolving/i
    );
  });

  it("shows a stale-update conflict with a working Reload ticket action", async () => {
    vi.spyOn(api, "updateStaffTicketStatus").mockRejectedValue(
      new api.ApiError("stale", 409, "STALE_UPDATE")
    );
    const { onReloadTicket } = renderWorkflow({ currentStatus: "NEW" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Open" }));

    const callout = await screen.findByTestId("workflow-stale");
    expect(callout).toHaveTextContent(/changed by someone else/i);
    await user.click(within(callout).getByRole("button", { name: /Reload ticket/i }));
    expect(onReloadTicket).toHaveBeenCalled();
    // The conflict callout clears once the reload is requested (Issue 33 review).
    expect(screen.queryByTestId("workflow-stale")).toBeNull();
  });

  it("falls back to a safe failure message for unexpected errors", async () => {
    vi.spyOn(api, "updateStaffTicketStatus").mockRejectedValue(new Error("boom"));
    renderWorkflow({ currentStatus: "NEW" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(await screen.findByTestId("workflow-error")).toHaveTextContent(
      /Unable to update the ticket status/i
    );
  });
});

// ---------------------------------------------------------------------------
describe("UI-WF-03: destructive confirmation and busy state", () => {
  it("requires an inline confirmation before cancelling", async () => {
    const spy = vi
      .spyOn(api, "updateStaffTicketStatus")
      .mockResolvedValue(summaryWith({ currentStatus: "CANCELLED" }));
    const { onReloadTicket } = renderWorkflow({ currentStatus: "NEW" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Cancel Ticket" }));
    // First click only arms the confirmation — no request yet.
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId("cancel-confirm")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm cancel?" }));
    expect(spy).toHaveBeenCalledWith(101, "CANCELLED", ANCHOR);
    expect(onReloadTicket).not.toHaveBeenCalled();
  });

  it("lets the user back out of cancelling", async () => {
    const spy = vi.spyOn(api, "updateStaffTicketStatus");
    renderWorkflow({ currentStatus: "NEW" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Cancel Ticket" }));
    await user.click(screen.getByRole("button", { name: "Keep ticket" }));

    expect(screen.queryByTestId("cancel-confirm")).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("blocks a double submit while a transition is in flight", async () => {
    let resolve!: (t: api.StaffTicket) => void;
    const spy = vi.spyOn(api, "updateStaffTicketStatus").mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    renderWorkflow({ currentStatus: "NEW" });
    const user = userEvent.setup();

    const open = screen.getByRole("button", { name: "Open" });
    await user.click(open);
    // Once busy the whole control set is disabled.
    expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeDisabled();

    resolve(summaryWith({ currentStatus: "OPEN" }));
    expect(await screen.findByTestId("workflow-success")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe("UI-WF-01 (integration): the summary status badge refreshes in place", () => {
  it("updates the Ticket Information badge without a reload", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...summaryWith({ currentStatus: "NEW" }),
      description: "Battery drains fast.",
      relatedSystem: { id: 1, name: "ERP System", type: "Application" },
      requesterIndicatedResolvedAt: null,
      actionsCount: 2,
      attachments: [],
      comments: [],
      notes: [],
      availableOwners: [{ id: 6, name: "Dan Das" }],
    });
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([]);
    vi.spyOn(api, "updateStaffTicketStatus").mockResolvedValue(
      summaryWith({ currentStatus: "IN_PROGRESS" })
    );

    const { container } = render(
      <StaffTicketDetail user={DAN} ticket={summaryWith({ currentStatus: "NEW" })} onBack={() => {}} />
    );
    await screen.findByRole("heading", { name: "TK-001001" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start Progress" }));

    expect(await screen.findByTestId("workflow-success")).toBeInTheDocument();
    // Insync badge: the Current Status row now shows IN_PROGRESS.
    const statusBadge = container.querySelector(".badge-status-in-progress");
    expect(statusBadge).toHaveTextContent("IN_PROGRESS");
  });
});

// ---------------------------------------------------------------------------
describe("UI-WF-01 (integration): the resolve pre-check follows on-screen Actions", () => {
  it("un-gates Resolve when an Action is on screen despite a zero actionsCount", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...summaryWith({ currentStatus: "IN_PROGRESS" }),
      description: "Battery drains fast.",
      relatedSystem: { id: 1, name: "ERP System", type: "Application" },
      requesterIndicatedResolvedAt: null,
      // Stale server count: the on-screen Action list must still un-gate Resolve.
      actionsCount: 0,
      attachments: [],
      comments: [],
      notes: [],
      availableOwners: [{ id: 6, name: "Dan Das" }],
    });
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([
      {
        id: 501,
        ticketId: 101,
        actionDateTime: "2026-09-01T10:30:00.000Z",
        actionDescription: "Swapped the battery.",
        result: "Full charge.",
        performedBy: { id: 6, name: "Dan Das", role: "IT_STAFF" },
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        createdAt: "2026-09-01T10:31:00.000Z",
        updatedAt: "2026-09-01T10:31:00.000Z",
      },
    ]);

    render(
      <StaffTicketDetail
        user={DAN}
        ticket={summaryWith({ currentStatus: "IN_PROGRESS" })}
        onBack={() => {}}
      />
    );
    await screen.findByRole("heading", { name: "TK-001001" });

    expect(screen.getByRole("button", { name: "Resolve" })).toBeEnabled();
    expect(screen.queryByText(/Record at least one Action Taken first/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("Requester advisory is status-neutral (UI-WF-02, FR-11/BR-11)", () => {
  it("states that the note was recorded and the status did not change", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
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
      requesterIndicatedResolvedAt: "2026-09-01T11:00:00.000Z",
      attachments: [],
    });
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]);
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([]);

    render(
      <TicketDetail
        requester={ALICE}
        ticket={{
          ticketNumber: "TK-000007",
          id: 7,
          summary: "Laptop battery drains quickly",
          category: { id: 1, name: "Hardware" },
          requestedPriority: "HIGH",
          itPriority: "MEDIUM",
          currentStatus: "IN_PROGRESS",
          updatedAt: "2026-09-01T10:00:00.000Z",
        }}
        onBack={() => {}}
      />
    );

    const callout = await screen.findByTestId("resolved-indicated");
    expect(callout).toHaveTextContent(
      /Your note was recorded for IT Staff. The ticket status has not changed./i
    );
  });
});
