import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// UI-01..04, UI-07, UI-08 — Login + shell + logout (ui-spec.md §3.1, §3.3).

const REQUESTER: api.AuthUser = {
  id: 1,
  name: "Alice Anderson",
  email: "alice.anderson@example.com",
  role: "REQUESTER",
  requiresPasswordChange: false,
};

const STAFF: api.AuthUser = {
  id: 50,
  name: "Dan Staff",
  email: "dan.staff@example.com",
  role: "IT_STAFF",
  requiresPasswordChange: false,
};

const ADMIN: api.AuthUser = {
  id: 60,
  name: "Henri Admin",
  email: "henri.admin@example.com",
  role: "ADMIN",
  requiresPasswordChange: false,
};

async function showLogin() {
  render(<App />);
  return screen.findByLabelText(/Email/i);
}

describe("Login screen (UI-01..04, UI-07, UI-08)", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(null);
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

  it("UI-01: shows near-field validation and prevents double submit while busy", async () => {
    let resolveLogin!: (user: api.AuthUser) => void;
    const loginSpy = vi.spyOn(api, "login").mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    const user = userEvent.setup();
    await showLogin();

    await user.click(screen.getByRole("button", { name: /Sign In/i }));
    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Email/i), REQUESTER.email);
    await user.type(screen.getByLabelText(/Password/i), "LostPass!23");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    const busyButton = screen.getByRole("button", { name: /Signing in…/i });
    expect(busyButton).toBeDisabled();
    await user.click(busyButton);
    expect(loginSpy).toHaveBeenCalledTimes(1);

    resolveLogin(REQUESTER);
    expect(await screen.findByRole("heading", { name: /My Tickets/i })).toBeInTheDocument();
  });

  it.each([
    ["REQUESTER", REQUESTER, /My Tickets/i],
    ["IT_STAFF", STAFF, /Ticket Queue/i],
    ["ADMIN", ADMIN, /User Management/i],
  ] as const)("UI-02: routes a %s to their role home with a role badge", async (_role, account, heading) => {
    vi.spyOn(api, "login").mockResolvedValue(account);
    const user = userEvent.setup();
    await showLogin();

    await user.type(screen.getByLabelText(/Email/i), account.email);
    await user.type(screen.getByLabelText(/Password/i), "DevPass!23");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText(account.name)).toBeInTheDocument();
    expect(
      screen.getByText(
        account.role === "IT_STAFF" ? "IT Staff" : account.role === "ADMIN" ? "Administrator" : "Requester"
      )
    ).toBeInTheDocument();
  });

  it("UI-03: shows a safe inactive-account message", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError(
        "This account is not active. Contact an administrator.",
        403,
        "ACCOUNT_INACTIVE"
      )
    );
    const user = userEvent.setup();
    await showLogin();

    await user.type(screen.getByLabelText(/Email/i), "evan.east@example.com");
    await user.type(screen.getByLabelText(/Password/i), "LostPass!23");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(
      await screen.findByText(/This account is not active. Contact an administrator./i)
    ).toBeInTheDocument();
  });

  it("UI-04: failure shows a generic message and preserves the email, clearing the password", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError("Invalid email or password.", 401, "UNAUTHORIZED")
    );
    const user = userEvent.setup();
    const emailInput = (await showLogin()) as HTMLInputElement;
    await user.type(emailInput, "alice.anderson@example.com");
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    await user.type(passwordInput, "WrongPass!23");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByText(/Invalid email or password./i)).toBeInTheDocument();
    expect(emailInput).toHaveValue("alice.anderson@example.com");
    expect(passwordInput).toHaveValue("");
  });

  it("UI-07: shell presents only the destinations permitted for the role", async () => {
    vi.spyOn(api, "login").mockResolvedValue(STAFF);
    const user = userEvent.setup();
    await showLogin();

    await user.type(screen.getByLabelText(/Email/i), STAFF.email);
    await user.type(screen.getByLabelText(/Password/i), "DevPass!23");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByRole("button", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "My Tickets" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Ticket" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();
  });

  it("UI-08: logout returns to the login screen and drops authenticated access", async () => {
    vi.spyOn(api, "login").mockResolvedValue(STAFF);
    const logoutSpy = vi.spyOn(api, "logout").mockResolvedValue();
    const user = userEvent.setup();
    await showLogin();

    await user.type(screen.getByLabelText(/Email/i), STAFF.email);
    await user.type(screen.getByLabelText(/Password/i), "DevPass!23");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));
    await screen.findByRole("heading", { name: /Ticket Queue/i });

    await user.click(screen.getByRole("button", { name: /Logout/i }));

    expect(await screen.findByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Ticket Queue/i })).not.toBeInTheDocument();
    expect(logoutSpy).toHaveBeenCalled();
  });
});
