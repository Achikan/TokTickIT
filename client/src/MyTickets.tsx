import { useEffect, useState } from "react";
import {
  Category,
  DevelopmentRequester,
  MyTicket,
  Priority,
  Status,
  TicketQuery,
  fetchCategories,
  fetchMyTickets,
} from "./api.js";

const PRIORITIES: ("LOW" | "MEDIUM" | "HIGH" | "URGENT")[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const STATUSES: Status[] = ["SUBMITTED", "IN_PROGRESS", "RESOLVED"];

const PRIORITY_BADGES: Record<Priority, string> = {
  LOW: "badge-priority-low",
  MEDIUM: "badge-priority-medium",
  HIGH: "badge-priority-high",
  URGENT: "badge-priority-urgent",
};

const STATUS_BADGES: Record<Status, string> = {
  SUBMITTED: "badge-status-submitted",
  IN_PROGRESS: "badge-status-in-progress",
  RESOLVED: "badge-status-resolved",
};

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString();
}

interface Props {
  requester: DevelopmentRequester;
  onCreate: () => void;
  onViewTicket?: (t: MyTicket) => void;
}

type ListStatus = "loading" | "ready" | "failure";

export default function MyTickets({ requester, onCreate, onViewTicket }: Props) {
  const [listStatus, setListStatus] = useState<ListStatus>("loading");
  const [items, setItems] = useState<MyTicket[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [filtersApplied, setFiltersApplied] = useState<Record<string, unknown>>({});
  const [categories, setCategories] = useState<Category[]>([]);

  const [query, setQuery] = useState<TicketQuery>({ page: 1, pageSize: 10, sort: "-createdAt" });

  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((cats) => !cancelled && setCategories(cats))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setListStatus("loading");
    fetchMyTickets(requester.id, query)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setPagination(res.pagination);
        setFiltersApplied(res.filtersApplied);
        setListStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setListStatus("failure");
      });
    return () => {
      cancelled = true;
    };
  }, [requester.id, query]);

  const hasFilters = Object.keys(filtersApplied).length > 0 || (query.search ?? "") !== "";

  function applyPatch(patch: Partial<TicketQuery>) {
    setQuery((q) => ({ ...q, ...patch, page: 1 }));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyPatch({ search: searchInput.trim() === "" ? undefined : searchInput.trim() });
  }

  function goToPage(page: number) {
    setQuery((q) => ({ ...q, page }));
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 className="h4 mb-0">My Tickets</h2>
        <button
          type="button"
          className="btn btn-tok-primary"
          onClick={onCreate}
          aria-label="Create a new ticket"
        >
          Create Ticket
        </button>
      </div>

      {listStatus === "loading" && <p className="text-secondary">Loading your tickets…</p>}

      {listStatus === "failure" && (
        <p className="text-danger">
          Unable to load your tickets. Please try again later.
        </p>
      )}

      {listStatus === "ready" && (
        <>
          {/* Search, filters, sort */}
          <form
            className="row g-2 mb-3 align-items-end"
            onSubmit={handleSearch}
            aria-label="Ticket search and filters"
          >
            <div className="col-md-4">
              <label htmlFor="ticket-search" className="form-label">
                Search
              </label>
              <input
                id="ticket-search"
                className="form-control"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search your tickets…"
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="filter-category" className="form-label">
                Category
              </label>
              <select
                id="filter-category"
                className="form-select"
                value={query.categoryId ?? ""}
                onChange={(e) =>
                  applyPatch({
                    categoryId: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="filter-status" className="form-label">
                Status
              </label>
              <select
                id="filter-status"
                className="form-select"
                value={query.status ?? ""}
                onChange={(e) =>
                  applyPatch({ status: (e.target.value || undefined) as Status | undefined })
                }
              >
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label htmlFor="filter-priority" className="form-label">
                Priority
              </label>
              <select
                id="filter-priority"
                className="form-select"
                value={query.requestedPriority ?? ""}
                onChange={(e) =>
                  applyPatch({
                    requestedPriority: (e.target.value || undefined) as
                      | Priority
                      | undefined,
                  })
                }
              >
                <option value="">All</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="filter-sort" className="form-label">
                Sort
              </label>
              <select
                id="filter-sort"
                className="form-select"
                value={query.sort ?? "-createdAt"}
                onChange={(e) => applyPatch({ sort: e.target.value })}
              >
                <option value="-createdAt">Newest first</option>
                <option value="createdAt">Oldest first</option>
                <option value="summary">Summary A–Z</option>
                <option value="-summary">Summary Z–A</option>
                <option value="-updatedAt">Recently updated</option>
                <option value="+ticketNumber">Ticket Number A–Z</option>
                <option value="-ticketNumber">Ticket Number Z–A</option>
              </select>
            </div>
            <div className="col-md-2 d-flex gap-2">
              <button type="submit" className="btn btn-secondary flex-grow-1">
                Search
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setSearchInput("");
                  setQuery({ page: 1, pageSize: 10, sort: "-createdAt" });
                }}
              >
                Reset
              </button>
            </div>
          </form>

          {/* Distinct empty vs no-results states (AC-14) */}
          {pagination.total === 0 && !hasFilters && (
            <div className="alert alert-secondary" role="status">
              You don't have any tickets yet. Use "Create Ticket" to submit your first
              request.
            </div>
          )}

          {pagination.total === 0 && hasFilters && (
            <div className="alert alert-warning" role="status">
              No tickets match your current search and filters. Try adjusting them.
            </div>
          )}

          {pagination.total > 0 && (
            <>
              <p className="text-muted small mb-2">
                {pagination.total} ticket{pagination.total === 1 ? "" : "s"} · Page{" "}
                {pagination.page} of {pagination.totalPages} · sorted by{" "}
                <span className="fw-semibold">{query.sort}</span>
              </p>

              {/* Desktop table */}
              <div className="table-responsive d-none d-md-block">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Ticket Number</th>
                      <th scope="col">Summary</th>
                      <th scope="col">Category</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((t) => (
                      <tr key={t.id}>
                        <td className="text-nowrap fw-semibold">
                          {onViewTicket ? (
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
                              onClick={() => onViewTicket(t)}
                              aria-label={`Open ticket ${t.ticketNumber}`}
                            >
                              {t.ticketNumber}
                            </button>
                          ) : (
                            t.ticketNumber
                          )}
                        </td>
                        <td>{t.summary}</td>
                        <td>{t.category.name}</td>
                        <td>
                          <span
                            className={`badge ${PRIORITY_BADGES[t.requestedPriority]}`}
                            title={`Requested priority ${t.requestedPriority}`}
                          >
                            {t.requestedPriority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[t.currentStatus]}`}>
                            {t.currentStatus}
                          </span>
                        </td>
                        <td className="text-nowrap text-muted">
                          {formatUpdatedAt(t.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="list-unstyled d-md-none">
                {items.map((t) => (
                  <li key={t.id} className="card mb-2">
                    <button
                      type="button"
                      className={`card-body py-2 text-start w-100 border-0 ${
                        onViewTicket ? "" : "bg-transparent"
                      }`}
                      onClick={() => onViewTicket?.(t)}
                      disabled={!onViewTicket}
                      aria-label={`Open ticket ${t.ticketNumber}`}
                    >
                      <div className="fw-semibold">{t.ticketNumber}</div>
                      <div className="mb-2">{t.summary}</div>
                      <div className="small text-muted mb-2">
                        {t.category.name} · Updated {formatUpdatedAt(t.updatedAt)}
                      </div>
                      <div className="d-flex gap-2">
                        <span className={`badge ${PRIORITY_BADGES[t.requestedPriority]}`}>
                          {t.requestedPriority}
                        </span>
                        <span className={`badge ${STATUS_BADGES[t.currentStatus]}`}>
                          {t.currentStatus}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <nav aria-label="Ticket list pagination">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${pagination.page <= 1 ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </button>
                  </li>
                  <li className="page-item disabled">
                    <span className="page-link">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                  </li>
                  <li
                    className={`page-item ${
                      pagination.page >= pagination.totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </>
          )}
        </>
      )}
    </div>
  );
}