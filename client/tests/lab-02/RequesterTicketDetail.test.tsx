import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const ALICE = { id: 1, name: "Alice Anderson", email: "alice.anderson@example.com" };

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
  description: "Battery drops from 100% to 20% in an hour.",
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

const REMOVED_ATTACHMENT: api.AttachmentInfo = {
  id: 101,
  originalName: "error-log.txt",
  mimeType: "text/plain",
  size: 2048,
  uploadedAt: "2026-09-01T09:00:00.000Z",
  removedAt: "2026-09-01T11:00:00.000Z",
  removedReason: "Duplicate file",
};

const ACTIVE_ATTACHMENT: api.AttachmentInfo = {
  id: 102,
  originalName: "screenshot.png",
  mimeType: "image/png",
  size: 512000,
  uploadedAt: "2026-09-01T09:30:00.000Z",
  removedAt: null,
  removedReason: null,
};

describe("TicketDetail", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(FULL_DETAIL);
  });

  it("shows a loading state while the ticket is being fetched", () => {
    let resolveFn!: (v: api.TicketDetail) => void;
    vi.spyOn(api, "fetchTicketDetail").mockReturnValue(
      new Promise((resolve) => { resolveFn = resolve; })
    );
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    expect(screen.getByText(/Loading ticket/i)).toBeInTheDocument();
    resolveFn(FULL_DETAIL);
  });

  it("renders the full ticket detail with all read-only fields (UI-09, FR-13)", async () => {
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    expect(await screen.findByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByText("Battery drops from 100% to 20% in an hour.")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("ERP System")).toBeInTheDocument();
    expect(screen.getByText("(Application)")).toBeInTheDocument();
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();

    // Ticket number appears in heading + dd readonly field
    const ticketNumbers = screen.getAllByText("TK-000007");
    expect(ticketNumbers.length).toBeGreaterThanOrEqual(2);
    expect(ticketNumbers.some((el) => el.className.includes("readonly-field"))).toBe(true);
  });

  it("shows priority and status badges with correct severity classes", async () => {
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    await screen.findByText("Laptop battery drains quickly");
    const highBadge = screen.getByText("HIGH");
    expect(highBadge.className).toContain("badge-priority-high");
    const medBadge = screen.getByText("MEDIUM");
    expect(medBadge.className).toContain("badge-priority-medium");
    const statusBadge = screen.getByText("IN_PROGRESS");
    expect(statusBadge.className).toContain("badge-status-in-progress");
  });

  it("shows 'No attachments yet' when there are no attachments", async () => {
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    expect(await screen.findByText(/No attachments yet/i)).toBeInTheDocument();
  });

  it("renders attachment rows with distinct active and removed states (AC-15)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      ...FULL_DETAIL,
      attachments: [ACTIVE_ATTACHMENT, REMOVED_ATTACHMENT],
    });

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("screenshot.png")).toBeInTheDocument();
    expect(within(table).getByText("Active")).toBeInTheDocument();
    expect(within(table).getByText("error-log.txt")).toBeInTheDocument();
    expect(within(table).getByText(/Removed — Duplicate file/i)).toBeInTheDocument();
  });

  it("shows a safe failure state when the API call fails", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockRejectedValue(new Error("network down"));

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    expect(
      await screen.findByText(/Unable to load the ticket details/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Ticket TK-000007/)).toBeInTheDocument();
  });

  it("navigates back to My Tickets when Back is clicked", async () => {
    const onBack = vi.fn();
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={onBack} />);
    await screen.findByText("Laptop battery drains quickly");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Back to My Tickets/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("calls fetchTicketDetail with the correct requester and ticket ids", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(FULL_DETAIL);
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    await screen.findByText("Laptop battery drains quickly");
    expect(fetchSpy).toHaveBeenCalledWith(1, 7);
  });
});