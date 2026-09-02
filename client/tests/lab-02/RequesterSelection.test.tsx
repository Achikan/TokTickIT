import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const ACTIVE_REQUESTERS = [
  { id: 1, name: "Alice Anderson", email: "alice.anderson@example.com" },
  { id: 2, name: "Bob Brown", email: "bob.brown@example.com" },
  { id: 3, name: "Carol Chen", email: "carol.chen@example.com" },
  { id: 4, name: "David Diaz", email: "david.diaz@example.com" },
];

describe("App shell - Development Requester Selection", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      filtersApplied: {},
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
  });

  it("shows the requester selection screen when no requester is selected", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue(ACTIVE_REQUESTERS);
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    expect(screen.getByText(/lab 3/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Continue/i })
    ).toBeInTheDocument();
  });

  it("shows a loading state while requesters are being fetched", () => {
    let resolveFn!: (v: api.DevelopmentRequester[]) => void;
    vi.spyOn(api, "fetchDevelopmentRequesters").mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );
    render(<App />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    resolveFn(ACTIVE_REQUESTERS);
  });

  it("shows an empty state when there are no active requesters", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByText(/no active development requesters/i)).toBeInTheDocument();
  });

  it("shows a safe error state when the API fails", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockRejectedValue(new Error("network down"));
    render(<App />);
    expect(await screen.findByText(/unable to load development requesters/i)).toBeInTheDocument();
  });

  it("stores the selected requester and shows it in the shell with a Change Requester action", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue(ACTIVE_REQUESTERS);
    const user = userEvent.setup();
    render(<App />);

    const combobox = await screen.findByRole("combobox", {
      name: /Development Requester/i,
    });
    await user.selectOptions(combobox, "2");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(await screen.findByText(/Selected Requester/i)).toBeInTheDocument();
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change Requester/i })).toBeInTheDocument();
  });

  it("returns to the selection screen when Change Requester is pressed", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue(ACTIVE_REQUESTERS);
    const user = userEvent.setup();
    render(<App />);

    const combobox = await screen.findByRole("combobox", {
      name: /Development Requester/i,
    });
    await user.selectOptions(combobox, "1");
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await user.click(await screen.findByRole("button", { name: /Change Requester/i }));
    expect(
      await screen.findByRole("combobox", { name: /Development Requester/i })
    ).toBeInTheDocument();
  });
});