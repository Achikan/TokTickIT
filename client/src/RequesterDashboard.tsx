import { useEffect, useState } from "react";
import type { AuthUser } from "./api.js";

interface TicketRef {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  itPriority: string;
  requestedPriority: string;
  owner: { id: number; name: string } | null;
  updatedAt: string;
}

interface RequesterDashboardData {
  generatedAt: string;
  metrics: {
    openCount: number;
    waitingForRequesterCount: number;
  };
  recentlyUpdated: { items: TicketRef[] };
  recentlyResolved: { items: TicketRef[] };
  drilldown: {
    open: string;
    waitingForRequester: string;
    recentlyUpdated: string;
    recentlyResolved: string;
  };
}

function formatDateTime(v: string) {
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function statusBadge(status: string) {
  const cls: Record<string, string> = {
    NEW: "badge-status-new",
    OPEN: "badge-status-open",
    IN_PROGRESS: "badge-status-in-progress",
    WAITING_FOR_REQUESTER: "badge-status-waiting",
    RESOLVED: "badge-status-resolved",
    CLOSED: "badge-status-closed",
    REOPENED: "badge-status-reopened",
    CANCELLED: "badge-status-cancelled",
  };
  return <span className={`badge ${cls[status] || "badge-status-new"}`}>{status}</span>;
}

export default function RequesterDashboard({ user, onViewTickets, onViewTicket }: { user: AuthUser; onViewTickets?: (filters?: Record<string, string>) => void; onViewTicket?: (ticket: any) => void }) {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

  async function load() {
    setStatus("loading");
    setErrMsg("");
    try {
      const headers = new Headers();
      headers.set("X-CSRF-Protected", "1");
      const res = await fetch("/api/requester/dashboard", { credentials: "include", headers });
      if (res.status === 403) { setStatus("forbidden"); return; }
      if (res.status === 401) { setStatus("error"); setErrMsg("Authentication required."); return; }
      if (!res.ok) { setStatus("error"); setErrMsg("Unable to load the requester dashboard."); return; }
      const body = (await res.json()) as RequesterDashboardData;
      setData(body);
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrMsg("Unable to load the requester dashboard.");
    }
  }

  useEffect(() => { load(); }, []);

  if (status === "loading") {
    return (
      <div className="container py-4">
        <h1 className="h3 mb-3">My Dashboard</h1>
        <div className="row g-3 mb-3">
          {[1,2].map((i) => <div key={i} className="col-12 col-md-6"><div className="card h-100"><div className="card-body"><div className="placeholder-glow"><span className="placeholder col-6"></span></div></div></div></div>)}
        </div>
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="container py-4">
        <h1 className="h3 mb-3">My Dashboard</h1>
        <div className="alert alert-warning">You do not have permission to view the requester dashboard.</div>
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="container py-4">
        <h1 className="h3 mb-3">My Dashboard</h1>
        <div className="alert alert-danger">{errMsg || "Unable to load the requester dashboard."}</div>
        <button type="button" className="btn btn-tok-primary" onClick={load}>Retry</button>
      </div>
    );
  }

  const m = data.metrics;

  function goTickets(filters?: Record<string, string>) {
    if (onViewTickets) onViewTickets(filters);
  }
  function goDetail(t: TicketRef) {
    if (onViewTicket) onViewTicket(t);
  }

  return (
    <div className="container py-4">
      <header className="mb-4">
        <h1 className="h3 mb-1">My Dashboard</h1>
        <p className="text-muted mb-0">Overview of your tickets.</p>
      </header>

      <section aria-label="Metrics" className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <a
            className="card h-100 text-start w-100 dashboard-card text-decoration-none text-body"
            href={data.drilldown?.open || "/api/tickets?status=OPEN"}
            aria-label="My Open Tickets"
            onClick={(e) => {
              e.preventDefault();
              goTickets({ status: "OPEN" });
            }}
          >
            <div className="card-body">
              <div className="text-muted small">My Open Tickets</div>
              <div className="display-6">{m.openCount ?? 0}</div>
              <div className="small text-tok-green">View my tickets →</div>
            </div>
          </a>
        </div>
        <div className="col-12 col-md-6">
          <a
            className="card h-100 text-start w-100 dashboard-card text-decoration-none text-body border-warning"
            href={data.drilldown?.waitingForRequester || "/api/tickets?status=WAITING_FOR_REQUESTER"}
            aria-label="Waiting for Me"
            onClick={(e) => {
              e.preventDefault();
              goTickets({ status: "WAITING_FOR_REQUESTER" });
            }}
          >
            <div className="card-body">
              <div className="text-muted small"><span className="badge bg-warning text-dark">Waiting for Me</span></div>
              <div className="display-6">{m.waitingForRequesterCount ?? 0}</div>
              <div className="small text-tok-green">View my tickets →</div>
            </div>
          </a>
        </div>
      </section>

      <section aria-label="Recent tickets" className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-transparent fw-semibold">Recently Updated (last 7 days)</div>
            <div className="card-body p-0">
              {(data.recentlyUpdated?.items ?? []).length === 0 ? (
                <p className="text-muted small p-3 mb-0">No recently updated tickets.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {(data.recentlyUpdated?.items ?? []).map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <button type="button" className="btn btn-link p-0" onClick={() => goDetail(t)}>{t.ticketNumber}</button>
                        <div className="text-muted small text-truncate" style={{ maxWidth: 320 }} title={t.summary}>{t.summary}</div>
                      </div>
                      <div className="text-end">
                        {statusBadge(t.currentStatus)}
                        <div className="text-muted small"><time dateTime={t.updatedAt}>{formatDateTime(t.updatedAt)}</time></div>
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
            <div className="card-header bg-transparent fw-semibold text-success">Recently Resolved (last 7 days)</div>
            <div className="card-body p-0">
              {(data.recentlyResolved?.items ?? []).length === 0 ? (
                <p className="text-muted small p-3 mb-0">No recently resolved tickets.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {(data.recentlyResolved?.items ?? []).map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <button type="button" className="btn btn-link p-0" onClick={() => goDetail(t)}>{t.ticketNumber}</button>
                        <div className="text-muted small text-truncate" style={{ maxWidth: 320 }} title={t.summary}>{t.summary}</div>
                      </div>
                      <div className="text-end">
                        {statusBadge(t.currentStatus)}
                        <div className="text-muted small"><time dateTime={t.updatedAt}>{formatDateTime(t.updatedAt)}</time></div>
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
