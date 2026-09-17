import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// UI-05, UI-06 — Mandatory change password (ui-spec.md §3.2, AC-02/AC-07).

const GATED: api.AuthUser = {
  id: 2,
  name: "Bob Brown",
  email: "bob.brown@example.com",
  role: "REQUESTER",
  requiresPasswordChange: true,
};

const UNGATED: api.AuthUser = { ...GATED, requiresPasswordChange: false };

async function showChangePassword() {
  render(<App />);
  return screen.findByRole("heading", { name: /Change your password/i });
}

describe("Mandatory change password (UI-05, UI-06)", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(GATED);
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      filtersApplied: {},
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-05: gates the app and reports policy, mismatch, and same-as-current errors near the fields", async () => {
    const changeSpy = vi.spyOn(api, "changePassword");
    const user = userEvent.setup();
    await showChangePassword();

    expect(screen.queryByRole("heading", { name: /My Tickets/i })).not.toBeInTheDocument();

    const current = screen.getByLabelText(/Current Password/i);
    const next = screen.getByLabelText(/^New Password/i);
    const confirm = screen.getByLabelText(/Confirm New Password/i);

    await user.type(current, "LostPass!23");
    await user.type(next, "weak");
    await user.type(confirm, "different");
    await user.click(screen.getByRole("button", { name: /Update Password/i }));

    expect(await screen.findByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(changeSpy).not.toHaveBeenCalled();

    await user.clear(next);
    await user.type(next, "LostPass!23");
    await user.type(confirm, "LostPass!23");
    await user.click(screen.getByRole("button", { name: /Update Password/i }));

    expect(
      await screen.findByText(/must be different from the current password/i)
    ).toBeInTheDocument();
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it("UI-06: a valid change opens the role home with confirmation", async () => {
    const changeSpy = vi.spyOn(api, "changePassword").mockResolvedValue(UNGATED);
    const user = userEvent.setup();
    await showChangePassword();

    await user.type(screen.getByLabelText(/Current Password/i), "LostPass!23");
    await user.type(screen.getByLabelText(/^New Password/i), "NewPass!234");
    await user.type(screen.getByLabelText(/Confirm New Password/i), "NewPass!234");
    await user.click(screen.getByRole("button", { name: /Update Password/i }));

    expect(await screen.findByText(/Password updated/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
    expect(changeSpy).toHaveBeenCalledWith("LostPass!23", "NewPass!234", "NewPass!234");
  });
});
