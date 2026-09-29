import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const ALICE: api.AuthUser = {
  id: 1,
  name: "Alice Anderson",
  email: "alice.anderson@example.com",
  role: "REQUESTER",
  requiresPasswordChange: false,
};

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the TokTickIT heading on the login screen when signed out", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(null);
    render(<App />);
    expect(await screen.findByText(/TokTickIT/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/Email/i)).toBeInTheDocument();
  });

  it("enters the shell when a session is already active", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(ALICE);
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      filtersApplied: {},
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    render(<App />);

    expect(await screen.findByText(/Signed in/i)).toBeInTheDocument();
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
  });

  it("falls back to the login screen when the session check fails", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockRejectedValue(new Error("network down"));
    render(<App />);
    expect(await screen.findByLabelText(/Email/i)).toBeInTheDocument();
  });
});
