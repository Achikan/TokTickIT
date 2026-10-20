import { useEffect, useState } from "react";
import type { AuthUser } from "./api.js";

interface TicketRef {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  itPriority: string;
  requestedPriority: string;
  updatedAt: string;
  ownerId: number | null;
}

interface StaffDashboardData {
  metrics: {
    unassigned: number;
    ownedByMe: number;
    byStatus: Record<string, number>;
    byItPriority: Record<string, number>;
  };
  lists: {
    recentlyUpdated: TicketRef[];
    urgentHigh: TicketRef[];
  };
  administrator?: {
    userCounts: { total: number; active: number; requesters: number; staff: number; admins: number };
  };
}

const STATUS_ORDER = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const PRIO_ORDER = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function formatDateTime(v: string) {
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function statusBadge(status: string) {
  return <span className={`badge status-badge status-${status.toLowerCase().replace(/_/g, "-")}`}>{status}</span>;
}

function prioBadge(p: string) {
  const cls: Record<string, string> = { LOW: "badge-priority-low", MEDIUM: "badge-priority-medium", HIGH: "badge-priority-high", URGENT: "badge-priority-urgent" };
  return <span className={`badge ${cls[p] || "badge-priority-medium"}`}>{p}</span>;
}

export default function StaffDashboard({ user, onSelectTicket, onViewQueue }: { user: AuthUser; onSelectTicket?: (id: number) => void; onViewQueue?: (filters: Record<string, string>) => void }) {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const headers = new Headers();
      headers.set("X-CSRF-Protected", "1");
      const res = await fetch("/api/staff/dashboard", { credentials: "include", headers });
      if (res.status === 403) { setStatus("forbidden"); return; }
      if (res.status === 401) { setStatus("error"); setErrMsg("Authentication required."); return; }
      if (!res.ok) { setStatus("error"); setErrMsg("Unable to load the staff dashboard."); return; }
      const body = (await res.json()) as StaffDashboardData;
      setData(body);
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrMsg("Unable to load the staff dashboard.");
    }
  }

  useEffect(() => { load(); }, []);

  function goQueue(filters: Record<string, string>) {
    if (onViewQueue) onViewQueue(filters);
  }
  function goDetail(id: number) {
    if (onSelectTicket) onSelectTicket(id);
  }

  if (status === "loading") {
    return (
      <div className="container py-4">
        <h1 className="h3 mb-3">IT Staff Dashboard</h1>
        <div className="row g-3 mb-3">
          {[1,2,3,4].map((i) => <div key={i} className="col-6 col-lg-3"><div className="card h-100"><div className="card-body"><div className="placeholder-glow"><span className="placeholder col-8"></span></div></div></div></div>)}
        </div>
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="container py-4">
        <h1 className="h3 mb-3">IT Staff Dashboard</h1>
        <div className="alert alert-warning">You do not have permission to view the staff dashboard.</div>
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="container py-4">
        <h1 className="h3 mb-3">IT Staff Dashboard</h1>
        <div className="alert alert-danger">{errMsg || "Unable to load the staff dashboard."}</div>
        <button type="button" className="btn btn-tok-primary" onClick={load}>Retry</button>
      </div>
    );
  }

  const m = data.metrics;
  const total = Object.values(m.byStatus).reduce((a,b)=>a+b,0);

  return (
    <div className="container py-4">
      <header className="mb-4">
        <h1 className="h3 mb-1">IT Staff Dashboard</h1>
        <p className="text-muted mb-0">Operational overview — concise metrics linked to the queue.</p>
      </header>

      <section aria-label="Key metrics" className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <button type="button" className="card h-100 text-start w-100 dashboard-card" onClick={() => goQueue({ ownerId: "unassigned" })}>
            <div className="card-body">
              <div className="text-muted small">Unassigned Tickets</div>
              <div className="display-6">{m.unassigned}</div>
              <div className="small text-tok-green">View queue →</div>
            </div>
          </button>
        </div>
        <div className="col-6 col-lg-3">
          <button type="button" className="card h-100 text-start w-100 dashboard-card" onClick={() => goQueue({ ownerId: String(user.id) })}>
            <div className="card-body">
              <div className="text-muted small">Owned by me</div>
              <div className="display-6">{m.ownedByMe}</div>
              <div className="small text-tok-green">View my tickets →</div>
            </div>
          </button>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-semibold">Tickets by status</div>
                <div className="text-muted small">Total {total}</div>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <button key={s} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => goQueue({ status: s })}>
                    {statusBadge(s)} <span className="ms-1">{m.byStatus[s] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Priority and admin" className="row g-3 mb-4">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="fw-semibold mb-2">Tickets by IT Priority</div>
              <div className="d-flex flex-wrap gap-2">
                {PRIO_ORDER.map((p) => (
                  <button key={p} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => goQueue({ itPriority: p })}>
                    {prioBadge(p)} <span className="ms-1">{m.byItPriority[p] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {user.role === "ADMIN" && data.administrator && (
          <div className="col-12 col-lg-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="fw-semibold mb-2">User accounts (concise)</div>
                <div className="row g-2">
                  <div className="col-6"><div className="text-muted small">Total</div><div className="fs-5">{data.administrator.userCounts.total}</div></div>
                  <div className="col-6"><div className="text-muted small">Active</div><div className="fs-5">{data.administrator.userCounts.active}</div></div>
                  <div className="col-4"><div className="text-muted small">Requesters</div><div>{data.administrator.userCounts.requesters}</div></div>
                  <div className="col-4"><div className="text-muted small">IT Staff</div><div>{data.administrator.userCounts.staff}</div></div>
                  <div className="col-4"><div className="text-muted small">Admins</div><div>{data.administrator.userCounts.admins}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Recent tickets" className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-transparent fw-semibold">Recently Updated (last 7 days)</div>
            <div className="card-body p-0">
              {data.lists.recentlyUpdated.length === 0 ? (
                <p className="text-muted small p-3 mb-0">No recently updated tickets.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {data.lists.recentlyUpdated.map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <button type="button" className="btn btn-link p-0" onClick={() => goDetail(t.id)}>{t.ticketNumber}</button>
                        <div className="text-muted small text-truncate" style={{ maxWidth: 320 }}>{t.summary}</div>
                      </div>
                      <div className="text-end">
                        {statusBadge(t.currentStatus)}
                        <div className="text-muted small">{formatDateTime(t.updatedAt)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-transparent fw-semibold">Urgent / High Priority</div>
            <div className="card-body p-0">
              {data.lists.urgentHigh.length === 0 ? (
                <p className="text-muted small p-3 mb-0">No urgent/high priority tickets.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {data.lists.urgentHigh.map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <button type="button" className="btn btn-link p-0" onClick={() => goDetail(t.id)}>{t.ticketNumber}</button>
                        <div className="text-muted small text-truncate" style={{ maxWidth: 320 }}>{t.summary}</div>
                      </div>
                      <div className="text-end">
                        {prioBadge(t.itPriority)}
                        <div className="text-muted small">{statusBadge(t.currentStatus)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
