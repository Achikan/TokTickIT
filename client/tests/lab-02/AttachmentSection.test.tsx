import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
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

const BASE_DETAIL: api.TicketDetail = {
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

const ACTIVE: api.AttachmentInfo = {
  id: 102,
  ticketId: 7,
  originalName: "screenshot.png",
  mimeType: "image/png",
  size: 512000,
  uploadedAt: "2026-09-01T09:30:00.000Z",
  removedAt: null,
  removedReason: null,
};

const REMOVED: api.AttachmentInfo = {
  id: 101,
  ticketId: 7,
  originalName: "error-log.txt",
  mimeType: "text/plain",
  size: 2048,
  uploadedAt: "2026-09-01T09:00:00.000Z",
  removedAt: "2026-09-01T11:00:00.000Z",
  removedReason: "Duplicate file",
};

function makeDetail(attachments: api.AttachmentInfo[]): api.TicketDetail {
  return { ...BASE_DETAIL, attachments };
}

function makeFile(name: string, type: string, size = 1000) {
  return new File([new ArrayBuffer(size)], name, { type });
}

describe("TicketDetail attachments — Issue 11 (UI-10, AC-11, AC-15)", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(BASE_DETAIL);
  });

  it("shows an upload control and 'No attachments yet' when empty (initial state)", async () => {
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    expect(await screen.findByText(/No attachments yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload Attachment/i })).toBeInTheDocument();
    expect(
      screen.getByTestId("attachment-file-input")
    ).toBeInTheDocument();
  });

  it("disables the upload button until a file is chosen", async () => {
    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    const uploadBtn = await screen.findByRole("button", { name: /Upload Attachment/i });
    expect(uploadBtn).toBeDisabled();

    const input = await screen.findByTestId("attachment-file-input");
    fireEvent.change(input, { target: { files: [makeFile("a.txt", "text/plain")] } });
    expect(uploadBtn).not.toBeDisabled();
  });

  it("uploads a file and appends it to the list (FR-15, AC-11)", async () => {
    const created: api.AttachmentInfo = {
      id: 300,
      ticketId: 7,
      originalName: "new.png",
      mimeType: "image/png",
      size: 1000,
      uploadedAt: "2026-09-02T00:00:00.000Z",
      removedAt: null,
      removedReason: null,
    };
    const uploadSpy = vi.spyOn(api, "uploadAttachment").mockResolvedValue(created);

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    const input = await screen.findByTestId("attachment-file-input");
    fireEvent.change(input, { target: { files: [makeFile("new.png", "image/png")] } });

    await userEvent.setup().click(screen.getByRole("button", { name: /Upload Attachment/i }));

    expect(uploadSpy).toHaveBeenCalledWith(1, 7, expect.any(File));
    expect(await screen.findByText("new.png")).toBeInTheDocument();
  });

  it("shows a field-level error when upload is rejected (BR-07, AC-11)", async () => {
    vi.spyOn(api, "uploadAttachment").mockRejectedValue(
      Object.assign(new Error("bad"), { fields: { file: "This file type is not supported." } })
    );

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);
    const input = await screen.findByTestId("attachment-file-input");
    fireEvent.change(input, { target: { files: [makeFile("x.exe", "application/x-msdownload")] } });

    await userEvent.setup().click(screen.getByRole("button", { name: /Upload Attachment/i }));

    expect(await screen.findByText("This file type is not supported.")).toBeInTheDocument();
  });

  it("downloads an active attachment (FR-17, AC-08)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(makeDetail([ACTIVE]));
    const downloadSpy = vi.spyOn(api, "downloadAttachment").mockResolvedValue({
      blob: new Blob(["x"], { type: "image/png" }),
      filename: "screenshot.png",
      mimeType: "image/png",
    });

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    const downloadBtn = await screen.findByRole("button", { name: /Download/i });
    await userEvent.setup().click(downloadBtn);

    expect(downloadSpy).toHaveBeenCalledWith(1, ACTIVE);
  });

  it("shows unavailable state when download returns 410 (AC-15, unavailable)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(makeDetail([ACTIVE]));
    vi.spyOn(api, "downloadAttachment").mockRejectedValue(
      Object.assign(new Error("gone"), { code: "UNAVAILABLE" })
    );

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    const downloadBtn = await screen.findByRole("button", { name: /Download/i });
    await userEvent.setup().click(downloadBtn);

    expect(
      await screen.findByText(/not available on the server/i)
    ).toBeInTheDocument();
  });

  it("soft-removes an attachment with a reason and lists it as removed (FR-18, AC-09)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(makeDetail([ACTIVE]));
    const updated: api.AttachmentInfo = {
      ...ACTIVE,
      removedAt: "2026-09-02T01:00:00.000Z",
      removedReason: "Uploaded the wrong file",
    };
    const removeSpy = vi.spyOn(api, "removeAttachment").mockResolvedValue(updated);
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Uploaded the wrong file");

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    const removeBtn = await screen.findByRole("button", { name: /Remove/i });
    await userEvent.setup().click(removeBtn);

    expect(removeSpy).toHaveBeenCalledWith(1, ACTIVE.id, "Uploaded the wrong file");
    expect(promptSpy).toHaveBeenCalled();
    expect(await screen.findByText(/Removed — Uploaded the wrong file/i)).toBeInTheDocument();
  });

  it("blocks download/remove actions for a removed attachment (BR-09, AC-09)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(makeDetail([REMOVED]));

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    expect(await screen.findByText(/error-log.txt/)).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/i })).not.toBeInTheDocument();
  });

  it("shows removed metadata with reason for a removed attachment (BR-09)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(makeDetail([REMOVED]));

    render(<TicketDetail requester={ALICE} ticket={MY_TICKET} onBack={() => {}} />);

    expect(await screen.findByText(/Removed — Duplicate file/i)).toBeInTheDocument();
  });
});
