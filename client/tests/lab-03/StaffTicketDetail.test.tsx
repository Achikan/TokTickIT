import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import * as api from "../../src/api.js";

// Lab 3 Issue 22 — IT Staff Ticket Detail UI (tests.md §2, UI-13, UI-14, UI-18).
//   UI-13 claim / IT Priority / status controls; permitted actions; conflicts surfaced.
//   UI-14 Public Comments vs Internal Notes visually distinct.
//   UI-18 safe failure feedback.
//   AC-14..AC-17, ui-spec.md §6.

const DAN: api.AuthUser = {
  id: 6,
  name: "Dan Das",
  email: "dan.das@example.com",
  role: "IT_STAFF",
  requiresPasswordChange: false,
};

const SUMMARY: api.StaffTicket = {
  ticketNumber: "TK-001001",
  id: 101,
  summary: "Laptop battery drains quickly",
  category: { id: 1, name: "Hardware" },
  requester: { id: 1, name: "Alice Anderson" },
  owner: null,
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "NEW",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T11:00:00.000Z",
};

const DETAIL: api.StaffTicketDetailData = {
  ...SUMMARY,
  description: "Battery drops from 100% to 20% within an hour on idle.",
  relatedSystem: { id: 1, name: "ERP System", type: "Application" },
  requesterIndicatedResolvedAt: null,
  attachments: [],
  comments: [],
  notes: [],
  availableOwners: [
    { id: 6, name: "Dan Das" },
    { id: 7, name: "Eileen Ford" },
  ],
};

function summaryWith(overrides: Partial<api.StaffTicket>): api.StaffTicket {
  return { ...SUMMARY, ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StaffTicketDetail", () => {
  it("UI-13: renders grouped read-only info and operational controls", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);

    expect(await screen.findByRole("heading", { name: "TK-001001" })).toBeInTheDocument();
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();

    // Operational controls for ownership, IT Priority and status.
    expect(screen.getByRole("button", { name: /Claim ticket/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/IT Priority value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/New status/i)).toBeInTheDocument();
  });

  it("UI-13: claims a Ticket and reflects the new owner", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);
    const claimSpy = vi
      .spyOn(api, "updateStaffTicketOwner")
      .mockResolvedValue(summaryWith({ owner: { id: 6, name: "Dan Das" } }));
    const user = userEvent.setup();

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    await user.click(screen.getByRole("button", { name: /Claim ticket/i }));

    expect(claimSpy).toHaveBeenCalledWith(101, 6);
    expect(await screen.findByTestId("ticket-owner")).toHaveTextContent("Dan Das");
  });

  it("UI-13: reassigns ownership to another eligible user", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);
    const assignSpy = vi
      .spyOn(api, "updateStaffTicketOwner")
      .mockResolvedValue(summaryWith({ owner: { id: 7, name: "Eileen Ford" } }));
    const user = userEvent.setup();

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    await user.selectOptions(screen.getByLabelText(/Reassign to/i), "7");
    await user.click(screen.getByRole("button", { name: /Assign owner/i }));

    expect(assignSpy).toHaveBeenCalledWith(101, 7);
    expect(await screen.findByTestId("ticket-owner")).toHaveTextContent("Eileen Ford");
  });

  it("UI-13: updates IT Priority", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);
    const prioritySpy = vi
      .spyOn(api, "updateStaffTicketPriority")
      .mockResolvedValue(summaryWith({ itPriority: "URGENT" }));
    const user = userEvent.setup();

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    await user.selectOptions(screen.getByLabelText(/IT Priority value/i), "URGENT");
    await user.click(screen.getByRole("button", { name: /Save IT Priority/i }));

    expect(prioritySpy).toHaveBeenCalledWith(101, "URGENT");
  });

  it("UI-13: restricts status options to the matrix and surfaces a conflict", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);
    const statusSpy = vi
      .spyOn(api, "updateStaffTicketStatus")
      .mockRejectedValue(
        new api.ApiError("A Ticket cannot move from NEW to RESOLVED.", 409, "INVALID_TRANSITION")
      );
    const user = userEvent.setup();

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    // NEW may only move to OPEN / IN_PROGRESS / CANCELLED.
    const select = screen.getByLabelText(/New status/i);
    expect(within(select).getByRole("option", { name: "OPEN" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "CANCELLED" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "RESOLVED" })).toBeNull();

    await user.selectOptions(select, "OPEN");
    await user.click(screen.getByRole("button", { name: /Update Status/i }));

    expect(statusSpy).toHaveBeenCalledWith(101, "OPEN");
    // A forbidden transition surface a specific conflict, not a hidden option.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot move from NEW to RESOLVED/i
    );
  });

  it("UI-14: renders Public Comments and visually distinct Internal Notes", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...DETAIL,
      comments: [
        {
          id: 1,
          ticketId: 101,
          content: "Public update for everyone.",
          author: { id: 6, name: "Dan Das" },
          createdAt: "2026-09-01T12:00:00.000Z",
        },
      ],
      notes: [
        {
          id: 2,
          ticketId: 101,
          content: "Private diagnosis: replace battery.",
          author: { id: 6, name: "Dan Das" },
          createdAt: "2026-09-01T12:30:00.000Z",
        },
      ],
    });

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    // Public comment lives in the public section, not the internal panel.
    const publicList = await screen.findByTestId("staff-public-comments-list");
    expect(within(publicList).getByText("Public update for everyone.")).toBeInTheDocument();

    const noteList = await screen.findByTestId("staff-internal-notes-list");
    expect(within(noteList).getByText("Private diagnosis: replace battery.")).toBeInTheDocument();

    // Distinct surface tint + explicit "Internal" marker (not colour alone).
    const noteItem = noteList.querySelector(".internal-note-panel");
    expect(noteItem).not.toBeNull();
    expect(within(noteList).getAllByText("Internal").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".internal-note-panel")).toHaveLength(1);
  });

  it("surfaces the Requester's resolution indication as a callout", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...DETAIL,
      requesterIndicatedResolvedAt: "2026-09-02T09:00:00.000Z",
    });

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);

    expect(await screen.findByTestId("requester-indication")).toHaveTextContent(
      /problem appears resolved/i
    );
  });

  it("renders attachment continuity with active and removed states", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...DETAIL,
      attachments: [
        {
          id: 1,
          ticketId: 101,
          originalName: "battery.png",
          mimeType: "image/png",
          size: 2048,
          uploadedAt: "2026-09-01T10:05:00.000Z",
          removedAt: null,
          removedReason: null,
        },
        {
          id: 2,
          ticketId: 101,
          originalName: "stale.png",
          mimeType: "image/png",
          size: 1024,
          uploadedAt: "2026-09-01T10:06:00.000Z",
          removedAt: "2026-09-01T10:07:00.000Z",
          removedReason: "Wrong file",
        },
      ],
    });

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    expect(screen.getByText("battery.png")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/Removed — Wrong file/i)).toBeInTheDocument();
  });

  it("posts a Public Comment and an Internal Note (append-only)", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);
    const commentSpy = vi.spyOn(api, "postTicketComment").mockResolvedValue({
      id: 9,
      ticketId: 101,
      content: "Looking into it.",
      author: { id: 6, name: "Dan Das" },
      createdAt: "2026-09-01T13:00:00.000Z",
    });
    const noteSpy = vi.spyOn(api, "postTicketNote").mockResolvedValue({
      id: 10,
      ticketId: 101,
      content: "Ordered a replacement battery.",
      author: { id: 6, name: "Dan Das" },
      createdAt: "2026-09-01T13:05:00.000Z",
    });
    const user = userEvent.setup();

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    await user.type(screen.getByLabelText(/Add a public comment/i), "Looking into it.");
    await user.click(screen.getByRole("button", { name: /Post Comment/i }));
    expect(commentSpy).toHaveBeenCalledWith(101, "Looking into it.");
    expect(await screen.findByText("Looking into it.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Add an internal note/i), "Ordered a replacement battery.");
    await user.click(screen.getByRole("button", { name: /Save Note/i }));
    expect(noteSpy).toHaveBeenCalledWith(101, "Ordered a replacement battery.");
    expect(await screen.findByText("Ordered a replacement battery.")).toBeInTheDocument();
  });

  it("UI-18: shows a loading state then a safe failure state", async () => {
    let rejectDetail!: (e: unknown) => void;
    vi.spyOn(api, "fetchStaffTicketDetail").mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectDetail = reject;
      })
    );

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    expect(screen.getByText(/Loading ticket…/i)).toBeInTheDocument();

    rejectDetail(new Error("network down"));
    expect(await screen.findByText(/Unable to load the ticket/i)).toBeInTheDocument();
  });
});
