import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTicket from "../../src/CreateTicket.js";
import * as api from "../../src/api.js";

const REQUIRE = { requester: { id: 1, name: "Alice Anderson", email: "alice@example.com" } } as const;

const CATEGORIES = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Software" },
];

const SYSTEMS = [
  { id: 1, name: "ERP System", type: "Application" },
  { id: 2, name: "Email Server", type: "Infrastructure" },
];

const TICKET = {
  ticketNumber: "TK-000001",
  id: 1,
  summary: "Laptop battery drains quickly",
  description: "Battery drops fast.",
  requesterId: 1,
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "ERP System" },
  requestedPriority: "MEDIUM" as const,
  itPriority: "MEDIUM" as const,
  currentStatus: "SUBMITTED",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("CreateTicket", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(SYSTEMS);
  });

  it("shows field-level messages and does not call the API on invalid submit (UI-01)", async () => {
    const createSpy = vi.spyOn(api, "createTicket").mockResolvedValue(TICKET);
    const user = userEvent.setup();
    render(<CreateTicket {...REQUIRE} />);

    await user.click(
      await screen.findByRole("button", { name: /Submit Ticket/i })
    );

    expect(await screen.findByText(/Summary is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Category is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Related System is required/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("creates a ticket and shows the official Ticket Number on success (UI-02)", async () => {
    const createSpy = vi.spyOn(api, "createTicket").mockResolvedValue(TICKET);
    const user = userEvent.setup();
    render(<CreateTicket {...REQUIRE} />);

    const comboboxes = await screen.findAllByRole("combobox");
    // order: Category, Related System, Requested Priority
    await user.selectOptions(comboboxes[0], "1");
    await user.selectOptions(comboboxes[1], "1");
    await user.type(screen.getByLabelText(/Summary/i), "Laptop battery drains quickly");
    await user.type(screen.getByLabelText(/Description/i), "Battery drops fast.");
    await user.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(await screen.findByText(/TK-000001/i)).toBeInTheDocument();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ requesterId: 1, summary: "Laptop battery drains quickly" })
    );
  });

  it("disables the submit button and shows a busy state while submitting (UI-04)", async () => {
    let resolveFn!: (t: api.Ticket) => void;
    vi.spyOn(api, "createTicket").mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );
    const user = userEvent.setup();
    render(<CreateTicket {...REQUIRE} />);

    const comboboxes = await screen.findAllByRole("combobox");
    await user.selectOptions(comboboxes[0], "1");
    await user.selectOptions(comboboxes[1], "1");
    await user.type(screen.getByLabelText(/Summary/i), "Test ticket");
    await user.type(screen.getByLabelText(/Description/i), "Details here.");
    await user.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(screen.getByRole("button", { name: /Submitting/i })).toBeDisabled();
    resolveFn(TICKET);
  });

  it("shows a safe error state and preserves entered values on API failure (UI-03)", async () => {
    const err = new Error("boom") as Error & { fields?: Record<string, string> };
    err.fields = {};
    vi.spyOn(api, "createTicket").mockRejectedValue(err);
    const user = userEvent.setup();
    render(<CreateTicket {...REQUIRE} />);

    const comboboxes = await screen.findAllByRole("combobox");
    await user.selectOptions(comboboxes[0], "1");
    await user.selectOptions(comboboxes[1], "1");
    await user.type(screen.getByLabelText(/Summary/i), "Kept after failure");
    await user.type(screen.getByLabelText(/Description/i), "Still here.");
    await user.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(
      await screen.findByText(/Your entered values were preserved/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Summary/i)).toHaveValue("Kept after failure");
  });

  it("shows server field errors from the response (invalid category etc.)", async () => {
    const err = new Error("invalid") as Error & { fields?: Record<string, string> };
    err.fields = { categoryId: "Category does not exist or is inactive." };
    vi.spyOn(api, "createTicket").mockRejectedValue(err);
    const user = userEvent.setup();
    render(<CreateTicket {...REQUIRE} />);

    const comboboxes = await screen.findAllByRole("combobox");
    await user.selectOptions(comboboxes[0], "1");
    await user.selectOptions(comboboxes[1], "1");
    await user.type(screen.getByLabelText(/Summary/i), "A ticket");
    await user.type(screen.getByLabelText(/Description/i), "Details.");
    await user.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(
      await screen.findByText(/Category does not exist or is inactive/i)
    ).toBeInTheDocument();
  });
});