import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import * as api from "../../src/api.js";

// Lab 3 Issue 24 — UI Style tests (tests.md §2, STYLE-01, STYLE-02).
//   STYLE-01 role/status/priority badge styling + read-only vs editable (AC-23, ui-spec §2, §6).
//   STYLE-02 Public Comments vs Internal Notes visually distinct + explicit marker (AC-17, ui-spec §6).
// These assert structural classes and non-color markers set by the CSS so the
// "never colour alone" accessibility rule (ui-spec §8) is enforced in the DOM.

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
  owner: { id: 6, name: "Dan Das" },
  requestedPriority: "URGENT",
  itPriority: "LOW",
  currentStatus: "WAITING_FOR_REQUESTER",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T11:00:00.000Z",
};

const DETAIL: api.StaffTicketDetailData = {
  ...SUMMARY,
  description: "Battery drops from 100% to 20% within an hour on idle.",
  relatedSystem: { id: 1, name: "ERP System", type: "Application" },
  requesterIndicatedResolvedAt: null,
  attachments: [],
  comments: [
    {
      id: 1,
      author: { id: 1, name: "Alice Anderson" },
      createdAt: "2026-09-01T10:05:00.000Z",
      content: "Updating to the latest firmware when plugged in.",
    },
  ],
  notes: [
    {
      id: 2,
      author: { id: 7, name: "Eileen Ford" },
      createdAt: "2026-09-01T10:10:00.000Z",
      content: "Arranging a loaner laptop while battery is replaced.",
    },
  ],
  availableOwners: [
    { id: 6, name: "Dan Das" },
    { id: 7, name: "Eileen Ford" },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("STYLE-01: badge styling and read-only vs editable treatments (AC-23, ui-spec §2, §6)", () => {
  it("renders status badges with their ui-spec class (never colour alone — label present)", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);

    const statusBadge = await screen.findByText(/WAITING_FOR_REQUESTER/i);
    expect(statusBadge.className).toContain("badge-status-waiting");
    expect(statusBadge.textContent).toMatch(/WAITING_FOR_REQUESTER/i);
  });

  it("distinguishes IT Priority value from Requested Priority with label and class", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    const requestedPrio = screen.getByText(/Requested Priority/i);
    const itPrio = screen.getAllByText(/IT Priority/i)[0];
    expect(requestedPrio).toBeInTheDocument();
    expect(itPrio).toBeInTheDocument();
    // The read-only IT Priority value (LOW) sits under the IT Priority term.
    const itRow = itPrio.closest("div")?.querySelector("dd, .col-md-9");
    expect(itRow).not.toBeNull();
  });

  it("marks read-only status as a badge while editable controls are select/buttons", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);
    await screen.findByRole("heading", { name: "TK-001001" });

    const statusEdit = screen.getByLabelText(/New status/i);
    expect(statusEdit.tagName).toBe("SELECT");
    expect(screen.getByRole("button", { name: /You own this ticket/i })).toBeDisabled();
    expect(screen.getByLabelText(/Reassign to/i).tagName).toBe("SELECT");
  });
});

describe("STYLE-02: Public Comments vs Internal Notes are visually distinct (AC-17, ui-spec §6)", () => {
  it("surfaces Internal Notes with the explicit marker class and text", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);

    const internal = await screen.findByText("Internal — visible to IT Staff and Administrators only. Never shown to the Requester.");
    expect(internal.className).toContain("internal-note-marker");

    const list = screen.getByTestId("staff-internal-notes-list");
    const noteItem = within(list).getByText(/loaner laptop/i);
    expect(noteItem.closest("li")?.className).toContain("internal-note-panel");
    expect(within(list).getByText(/Internal/i)).toBeInTheDocument();
  });

  it("shows the public comment in the Comments section without the Internal marker", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(DETAIL);

    render(<StaffTicketDetail user={DAN} ticket={SUMMARY} onBack={() => {}} />);

    const commentsHeading = await screen.findByRole("heading", { name: /Public Comments/i });
    const comments = commentsHeading.closest("section")!;
    const comment = await within(comments).findByText(/updating to the latest firmware/i);
    expect(comment.closest("li")?.className).not.toContain("internal-note-panel");
  });
});