import { useEffect, useState } from "react";
import {
  type Category,
  type Priority,
  type Status,
  type StaffQueueQuery,
  type StaffTicket,
  type AuthUser,
  fetchCategories,
  fetchStaffQueue,
} from "./api.js";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUSES: Status[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

const PRIORITY_BADGES: Record<Priority, string> = {
  LOW: "badge-priority-low",
  MEDIUM: "badge-priority-medium",
  HIGH: "badge-priority-high",
  URGENT: "badge-priority-urgent",
};

const STATUS_BADGES: Record<Status, string> = {
  NEW: "badge-status-new",
  OPEN: "badge-status-open",
  IN_PROGRESS: "badge-status-in-progress",
  WAITING_FOR_REQUESTER: "badge-status-waiting",
  RESOLVED: "badge-status-resolved",
  CLOSED: "badge-status-closed",
  REOPENED: "badge-status-reopened",
  CANCELLED: "badge-status-cancelled",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

// Issue 21 — IT Staff Ticket Queue (ui-spec.md §5, labs-sheet §8.3).
// Responsive queue: desktop table + card representation on smaller screens,
// badges for status and both priorities, owner / "Unassigned", search,
// filters, sorting, pagination, and distinct loading/empty/no-results/failure
// feedback (AC-13, AC-24).
interface Props {
  user: AuthUser;
  onOpenTicket?: (ticket: StaffTicket) => void;
}

type ListStatus = "loading" | "ready" | "failure";

export default function StaffTicketQueue({ user: _user, onOpenTicket }: Props) {
  const [listStatus, setListStatus] = useState<ListStatus>("loading");
  const [items, setItems] = useState<StaffTicket[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [filtersApplied, setFiltersApplied] = useState<Record<string, unknown>>({});
  const [categories, setCategories] = useState<Category[]>([]);

  const [query, setQuery] = useState<StaffQueueQuery>({ page: 1, pageSize: 10, sort: "-updatedAt" });

  const [searchInput, setSearchInput] = useState("");
  const [ownerInput, setOwnerInput] = useState("");

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
    fetchStaffQueue(query)
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
  }, [query]);

  const hasFilters =
    Object.keys(filtersApplied).length > 0 ||
    (query.search ?? "") !== "" ||
    (query.ownerId ?? "") !== "";

  function applyPatch(patch: Partial<StaffQueueQuery>) {
    setQuery((q) => ({ ...q, ...patch, page: 1 }));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyPatch({
      search: searchInput.trim() === "" ? undefined : searchInput.trim(),
      ownerId: ownerInput.trim() === "" ? undefined : ownerInput.trim(),
    });
  }

  function goToPage(page: number) {
    setQuery((q) => ({ ...q, page }));
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 id="staff-queue-heading" className="h4 mb-0">
          Ticket Queue
        </h2>
      </div>

      {listStatus === "loading" && <p className="text-secondary">Loading the ticket queue…</p>}

      {listStatus === "failure" && (
        <p className="text-danger">
          Unable to load the ticket queue. Please try again later.
        </p>
      )}

      {listStatus === "ready" && (
        <>
          {/* Search, filters, sort */}
          <form
            className="row g-2 mb-3 align-items-end"
            onSubmit={handleSearch}
            aria-label="Queue search and filters"
          >
            <div className="col-md-4">
              <label htmlFor="queue-search" className="form-label">
                Search
              </label>
              <input
                id="queue-search"
                className="form-control"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Summary, description or ticket number"
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="filter-owner" className="form-label">
                Owner
              </label>
              <input
                id="filter-owner"
                className="form-control"
                value={ownerInput}
                onChange={(e) => setOwnerInput(e.target.value)}
                placeholder='Owner id, or "unassigned"'
              />
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
                  setOwnerInput("");
                  setQuery({ page: 1, pageSize: 10, sort: "-updatedAt" });
                }}
              >
                Reset
              </button>
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
            <div className="col-md-3">
              <label htmlFor="filter-requested-priority" className="form-label">
                Requested Priority
              </label>
              <select
                id="filter-requested-priority"
                className="form-select"
                value={query.requestedPriority ?? ""}
                onChange={(e) =>
                  applyPatch({
                    requestedPriority: (e.target.value || undefined) as Priority | undefined,
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
              <label htmlFor="filter-it-priority" className="form-label">
                IT Priority
              </label>
              <select
                id="filter-it-priority"
                className="form-select"
                value={query.itPriority ?? ""}
                onChange={(e) =>
                  applyPatch({ itPriority: (e.target.value || undefined) as Priority | undefined })
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
                value={query.sort ?? "-updatedAt"}
                onChange={(e) => applyPatch({ sort: e.target.value })}
              >
                <option value="-updatedAt">Recently updated</option>
                <option value="+updatedAt">Least recently updated</option>
                <option value="-createdAt">Newest first</option>
                <option value="+createdAt">Oldest first</option>
                <option value="+ticketNumber">Ticket Number A–Z</option>
                <option value="-ticketNumber">Ticket Number Z–A</option>
                <option value="+summary">Summary A–Z</option>
                <option value="-summary">Summary Z–A</option>
                <option value="+itPriority">IT Priority low → high</option>
                <option value="-itPriority">IT Priority high → low</option>
              </select>
            </div>
          </form>

          {/* Distinct empty vs no-results states (AC-24) */}
          {pagination.total === 0 && !hasFilters && (
            <div className="alert alert-secondary" role="status">
              No tickets in the queue yet. New requests will appear here as they are submitted.
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

              {/* Desktop table (justified column set — ui-spec §5) */}
              <div className="table-responsive d-none d-md-block">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Ticket Number</th>
                      <th scope="col">Summary</th>
                      <th scope="col">Category</th>
                      <th scope="col">Requested Priority</th>
                      <th scope="col">IT Priority</th>
                      <th scope="col">Current Status</th>
                      <th scope="col">Ticket Owner</th>
                      <th scope="col">Created</th>
                      <th scope="col">Last Updated</th>
                      <th scope="col">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((t) => (
                      <tr key={t.id}>
                        <td className="text-nowrap fw-semibold">{t.ticketNumber}</td>
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
                          <span
                            className={`badge ${PRIORITY_BADGES[t.itPriority]}`}
                            title={`IT priority ${t.itPriority}`}
                          >
                            {t.itPriority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[t.currentStatus]}`}>
                            {t.currentStatus}
                          </span>
                        </td>
                        <td>{t.owner ? t.owner.name : <em className="text-muted">Unassigned</em>}</td>
                        <td className="text-nowrap text-muted">{formatDate(t.createdAt)}</td>
                        <td className="text-nowrap text-muted">{formatDate(t.updatedAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-tok-primary"
                            onClick={() => onOpenTicket?.(t)}
                            aria-label={`Open ticket ${t.ticketNumber}`}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Smaller-screen card representation */}
              <ul className="list-unstyled d-md-none">
                {items.map((t) => (
                  <li key={t.id} className="card mb-2">
                    <div className="card-body py-2">
                      <div className="fw-semibold">{t.ticketNumber}</div>
                      <div className="mb-2">{t.summary}</div>
                      <div className="small text-muted mb-2">
                        {t.category.name} · {t.owner ? t.owner.name : "Unassigned"} · Created{" "}
                        {formatDate(t.createdAt)}
                      </div>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <span
                          className={`badge ${PRIORITY_BADGES[t.requestedPriority]}`}
                          title={`Requested priority ${t.requestedPriority}`}
                        >
                          Requested {t.requestedPriority}
                        </span>
                        <span
                          className={`badge ${PRIORITY_BADGES[t.itPriority]}`}
                          title={`IT priority ${t.itPriority}`}
                        >
                          IT {t.itPriority}
                        </span>
                        <span className={`badge ${STATUS_BADGES[t.currentStatus]}`}>
                          {t.currentStatus}
                        </span>
                        {onOpenTicket && (
                          <button
                            type="button"
                            className="btn btn-sm btn-tok-primary ms-auto"
                            onClick={() => onOpenTicket(t)}
                            aria-label={`Open ticket ${t.ticketNumber}`}
                          >
                            Open
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <nav aria-label="Queue pagination">
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