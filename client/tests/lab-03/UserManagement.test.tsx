import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserManagement from "../../src/UserManagement.js";
import * as api from "../../src/api.js";

// Lab 3 Issue 23 — Administrator User Management UI (tests.md §2, UI-15..UI-18).
//   UI-15 list + search + optional role filter (AC-18, FR-19).
//   UI-16 create + edit validation and set-new-initial-password (AC-19, AC-20).
//   UI-17 self / last-Administrator safety feedback (AC-21, BR-18, BR-19).
//   UI-18 forbidden / safe-failure feedback and distinct empty vs no-results.

const ADMIN: api.AuthUser = {
  id: 1,
  name: "Henri Ito",
  email: "henri.ito@example.com",
  role: "ADMIN",
  requiresPasswordChange: false,
};

const USERS: api.AdminUser[] = [
  {
    id: 1,
    name: "Henri Ito",
    email: "henri.ito@example.com",
    role: "ADMIN",
    active: true,
    requiresPasswordChange: false,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: 2,
    name: "Alice Anderson",
    email: "alice.anderson@example.com",
    role: "REQUESTER",
    active: true,
    requiresPasswordChange: true,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: 7,
    name: "Gina Grant",
    email: "gina.grant@example.com",
    role: "IT_STAFF",
    active: false,
    requiresPasswordChange: false,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
];

function listResponse(items: api.AdminUser[]): api.AdminUserListResponse {
  return { items, filtersApplied: {} };
}

describe("UserManagement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("UI-15: list, search and role filter", () => {
    beforeEach(() => {
      vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(listResponse(USERS));
    });

    it("renders Name, Email, Role badge, Status and Edit for every user", async () => {
      render(<UserManagement user={ADMIN} />);

      const table = await screen.findByRole("table");
      expect(within(table).getByText("Henri Ito")).toBeInTheDocument();
      expect(within(table).getByText("alice.anderson@example.com")).toBeInTheDocument();
      expect(within(table).getByText("Gina Grant")).toBeInTheDocument();

      // Role text is always present alongside the tint (never colour alone).
      expect(within(table).getByText("Administrator")).toBeInTheDocument();
      expect(within(table).getByText("Requester")).toBeInTheDocument();
      expect(within(table).getByText("IT Staff")).toBeInTheDocument();

      // Active / Inactive status labels.
      expect(within(table).getAllByText("Active").length).toBe(2);
      expect(within(table).getByText("Inactive")).toBeInTheDocument();

      expect(
        screen.getAllByRole("button", { name: /Edit user/i }).length
      ).toBeGreaterThanOrEqual(3);
    });

    it("submits search and the optional role filter together, then resets", async () => {
      const fetchSpy = vi.spyOn(api, "fetchAdminUsers");
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);
      await screen.findByRole("table");

      await user.type(screen.getByRole("textbox", { name: /Search/i }), "henri");
      await user.selectOptions(screen.getByLabelText(/Role/i), "ADMIN");
      await user.click(screen.getByRole("button", { name: /^Search$/i }));

      expect(fetchSpy).toHaveBeenLastCalledWith({ search: "henri", role: "ADMIN" });

      await user.click(screen.getByRole("button", { name: /Reset/i }));
      expect(fetchSpy).toHaveBeenLastCalledWith({});
    });
  });

  describe("UI-16: create, edit and set initial password", () => {
    beforeEach(() => {
      vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(listResponse(USERS));
    });

    it("creates a user with an initial password and confirms the mandatory change", async () => {
      const createSpy = vi
        .spyOn(api, "createAdminUser")
        .mockResolvedValue({ ...USERS[1], id: 99, name: "Nora New" });
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);
      await screen.findByRole("table");

      await user.click(screen.getByRole("button", { name: /Create user/i }));
      const panel = screen.getByRole("region", { name: "Create user" });

      await user.type(within(panel).getByLabelText("Name"), "Nora New");
      await user.type(within(panel).getByLabelText("Email"), "nora.new@example.com");
      await user.type(within(panel).getByLabelText(/Initial password/i), "DevPass!23");
      await user.click(within(panel).getByRole("button", { name: "Create user" }));

      expect(createSpy).toHaveBeenCalledWith({
        name: "Nora New",
        email: "nora.new@example.com",
        role: "REQUESTER",
        active: true,
        initialPassword: "DevPass!23",
      });
      expect(await screen.findByText(/must change the initial password/i)).toBeInTheDocument();
    });

    it("surfaces per-field validation errors returned by the API", async () => {
      vi.spyOn(api, "createAdminUser").mockRejectedValue(
        new api.ApiError("Please correct the highlighted fields.", 409, "DUPLICATE_EMAIL", {
          email: "A user with this email already exists.",
        })
      );
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);
      await screen.findByRole("table");

      await user.click(screen.getByRole("button", { name: /Create user/i }));
      const panel = screen.getByRole("region", { name: "Create user" });
      await user.type(within(panel).getByLabelText("Name"), "Nora New");
      await user.type(within(panel).getByLabelText("Email"), "alice.anderson@example.com");
      await user.type(within(panel).getByLabelText(/Initial password/i), "DevPass!23");
      await user.click(within(panel).getByRole("button", { name: "Create user" }));

      expect(
        await within(panel).findByText(/Please correct the highlighted fields/i)
      ).toBeInTheDocument();
      expect(within(panel).getAllByText(/already exists/i).length).toBeGreaterThan(0);
    });

    it("edits name/email/role/activation and notifies the shell on a self-edit", async () => {
      const updateSpy = vi
        .spyOn(api, "updateAdminUser")
        .mockResolvedValue({ ...USERS[0], name: "Henri San", email: "henri.san@example.com" });
      const onSelfUpdated = vi.fn();
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} onSelfUpdated={onSelfUpdated} />);
      await screen.findByRole("table");

      await user.click(
        screen.getAllByRole("button", { name: "Edit user Henri Ito" })[0]
      );
      const panel = screen.getByRole("region", { name: "Edit user" });
      const nameInput = within(panel).getByLabelText("Name");
      await user.clear(nameInput);
      await user.type(nameInput, "Henri San");
      await user.selectOptions(within(panel).getByLabelText(/Role/i), "ADMIN");
      await user.click(within(panel).getByRole("button", { name: "Save changes" }));

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "Henri San", role: "ADMIN" })
      );
      expect(onSelfUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, name: "Henri San" })
      );
    });

    it("sets a new initial password for an existing user", async () => {
      const pwSpy = vi.spyOn(api, "setAdminInitialPassword").mockResolvedValue({
        id: 2,
        name: "Alice Anderson",
        requiresPasswordChange: true,
      });
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);
      await screen.findByRole("table");

      await user.click(
        screen.getAllByRole("button", { name: "Edit user Alice Anderson" })[0]
      );
      const panel = screen.getByRole("region", { name: "Edit user" });
      await user.type(
        within(panel).getByLabelText(/New initial password/i),
        "ResetPass!23"
      );
      await user.click(
        within(panel).getByRole("button", { name: /Set new initial password/i })
      );

      expect(pwSpy).toHaveBeenCalledWith(2, "ResetPass!23");
      expect(await screen.findByText(/new initial password was set/i)).toBeInTheDocument();
    });

    it("surfaces the specific field error when the new initial password breaks policy", async () => {
      vi.spyOn(api, "setAdminInitialPassword").mockRejectedValue(
        new api.ApiError("Invalid input.", 400, "VALIDATION_ERROR", {
          newInitialPassword: "Password must be at least 8 characters.",
        })
      );
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);
      await screen.findByRole("table");

      await user.click(
        screen.getAllByRole("button", { name: "Edit user Alice Anderson" })[0]
      );
      const panel = screen.getByRole("region", { name: "Edit user" });
      await user.type(within(panel).getByLabelText(/New initial password/i), "weak");
      await user.click(
        within(panel).getByRole("button", { name: /Set new initial password/i })
      );

      expect(
        await within(panel).findByText(/Password must be at least 8 characters/i)
      ).toBeInTheDocument();
      expect(within(panel).queryByText(/^Invalid input\.$/)).not.toBeInTheDocument();
    });
  });

  describe("UI-17: self / last-Administrator safety feedback (AC-21)", () => {
    beforeEach(() => {
      vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(listResponse(USERS));
    });

    it("shows the self-deactivation conflict message without crashing", async () => {
      vi.spyOn(api, "updateAdminUser").mockRejectedValue(
        new api.ApiError(
          "You cannot deactivate your own account.",
          409,
          "SELF_DEACTIVATION"
        )
      );
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);
      await screen.findByRole("table");

      await user.click(
        screen.getAllByRole("button", { name: "Edit user Henri Ito" })[0]
      );
      const panel = screen.getByRole("region", { name: "Edit user" });
      await user.click(within(panel).getByLabelText(/Active \(account can sign in\)/i));
      await user.click(within(panel).getByRole("button", { name: "Save changes" }));

      expect(
        await within(panel).findByText(/cannot deactivate your own account/i)
      ).toBeInTheDocument();
    });

    it("shows the last active Administrator protection message", async () => {
      vi.spyOn(api, "updateAdminUser").mockRejectedValue(
        new api.ApiError(
          "The last active Administrator cannot be deactivated or demoted.",
          409,
          "LAST_ADMIN"
        )
      );
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);
      await screen.findByRole("table");

      await user.click(
        screen.getAllByRole("button", { name: "Edit user Henri Ito" })[0]
      );
      const panel = screen.getByRole("region", { name: "Edit user" });
      await user.selectOptions(within(panel).getByLabelText(/Role/i), "REQUESTER");
      await user.click(within(panel).getByRole("button", { name: "Save changes" }));

      expect(
        await within(panel).findByText(/last active Administrator/i)
      ).toBeInTheDocument();
    });
  });

  describe("UI-18: loading, forbidden / safe failure and empty states", () => {
    it("shows a loading state while users are being fetched", async () => {
      let resolveList!: (res: api.AdminUserListResponse) => void;
      vi.spyOn(api, "fetchAdminUsers").mockReturnValue(
        new Promise((resolve) => {
          resolveList = resolve;
        })
      );

      render(<UserManagement user={ADMIN} />);
      expect(screen.getByText(/Loading users…/i)).toBeInTheDocument();

      resolveList(listResponse(USERS));
      expect(await screen.findByRole("table")).toBeInTheDocument();
    });

    it("shows a safe failure state when the list call fails", async () => {
      vi.spyOn(api, "fetchAdminUsers").mockRejectedValue(
        new api.ApiError("Administrator access is required.", 403, "FORBIDDEN")
      );

      render(<UserManagement user={ADMIN} />);
      expect(await screen.findByText(/Unable to load users/i)).toBeInTheDocument();
    });

    it("shows the forbidden message when a mutation is rejected", async () => {
      vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(listResponse(USERS));
      vi.spyOn(api, "updateAdminUser").mockRejectedValue(
        new api.ApiError("Administrator access is required.", 403, "FORBIDDEN")
      );
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);
      await screen.findByRole("table");

      await user.click(
        screen.getAllByRole("button", { name: "Edit user Alice Anderson" })[0]
      );
      const panel = screen.getByRole("region", { name: "Edit user" });
      await user.click(within(panel).getByRole("button", { name: "Save changes" }));

      expect(
        await within(panel).findByText(/Administrator access is required/i)
      ).toBeInTheDocument();
    });

    it("distinguishes an empty directory from no search results", async () => {
      vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(listResponse([]));
      const user = userEvent.setup();
      render(<UserManagement user={ADMIN} />);

      expect(await screen.findByText(/No users found\./i)).toBeInTheDocument();

      await user.type(screen.getByRole("textbox", { name: /Search/i }), "zzz");
      await user.click(screen.getByRole("button", { name: /^Search$/i }));

      expect(
        await screen.findByText(/No users match your search and filters/i)
      ).toBeInTheDocument();
    });
  });
});
