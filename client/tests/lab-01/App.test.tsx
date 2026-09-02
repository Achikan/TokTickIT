import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      filtersApplied: {},
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
  });

  it("renders the TokTickIT heading", () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue([]);
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("enters the shell only after a Development Requester is selected", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue([
      { id: 1, name: "Alice Anderson", email: "alice.anderson@example.com" },
    ]);
    const user = userEvent.setup();
    render(<App />);

    const combobox = await screen.findByRole("combobox", {
      name: /Development Requester/i,
    });
    await user.selectOptions(combobox, "1");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText(/Selected Requester/i)).toBeInTheDocument();
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change Requester/i })).toBeInTheDocument();
  });

  it("returns to the requester selection screen when the API is unavailable", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockRejectedValue(new Error("network down"));
    render(<App />);
    expect(
      await screen.findByText(/Unable to load development requesters/i)
    ).toBeInTheDocument();
  });
});