import { useEffect, useState } from "react";
import {
  fetchDevelopmentRequesters,
  DevelopmentRequester,
  MyTicket,
} from "./api.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";

// Requester selection screen for Lab 2 testing (NOT a real login screen).
// Authentication and role-based access arrive in Lab 3.
function RequesterSelection({ onSelect }: { onSelect: (r: DevelopmentRequester) => void }) {
  const [status, setStatus] = useState<"loading" | "empty" | "error" | "ready">("loading");
  const [requesterId, setRequesterId] = useState("");
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchDevelopmentRequesters()
      .then((items) => {
        if (cancelled) return;
        setRequesters(items);
        setStatus(items.length === 0 ? "empty" : "ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleContinue() {
    const requester = requesters.find((r) => String(r.id) === requesterId);
    if (requester) onSelect(requester);
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-1">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>
      <p className="text-muted mb-4">
        Select a Development Requester to test requester-specific ticket behavior. This is not a
        login screen; authentication and role-based access will be introduced in Lab 3.
      </p>

      {status === "loading" && <p className="text-secondary">Loading development requesters…</p>}

      {status === "empty" && (
        <p className="text-warning">There are no active development requesters.</p>
      )}

      {status === "error" && (
        <p className="text-danger">
          Unable to load development requesters. Please try again later.
        </p>
      )}

      {status === "ready" && (
        <form
          className="g-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleContinue();
          }}
        >
          <div className="mb-3">
            <label htmlFor="development-requester" className="form-label">
              Development Requester
            </label>
            <select
              id="development-requester"
              className="form-select"
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
            >
              <option value="">Select a requester…</option>
              {requesters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
<button
          type="submit"
          className="btn btn-tok-primary"
          disabled={requesterId === ""}
        >
          Continue
        </button>
        </form>
      )}
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState<DevelopmentRequester | null>(null);
  const [view, setView] = useState<"my-tickets" | "create-ticket" | "ticket-detail">(
    "my-tickets"
  );
  const [selectedTicket, setSelectedTicket] = useState<MyTicket | null>(null);

  if (selected === null) {
    return <RequesterSelection onSelect={setSelected} />;
  }

  const myTicketsActive = view !== "create-ticket";

  return (
    <div className="app-shell">
      <header className="app-header py-3 mb-4" style={{ background: "#006B3C" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h1 className="h4 mb-0 text-white">
                TokTickIT <span className="opacity-75">IT Service Desk</span>
              </h1>
              <div className="text-white-50 small">
                Selected Requester: <strong className="text-white">{selected.name}</strong>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-tok-secondary"
              onClick={() => {
                setSelectedTicket(null);
                setView("my-tickets");
                setSelected(null);
              }}
            >
              Change Requester
            </button>
          </div>

          <nav className="nav nav-pills mt-3" aria-label="Primary navigation">
            <button
              type="button"
              className={`nav-link ${myTicketsActive ? "active" : ""}`}
              style={myTicketsActive ? { background: "#0B7A46" } : { color: "#fff" }}
              onClick={() => setView("my-tickets")}
              aria-current={myTicketsActive ? "page" : undefined}
            >
              My Tickets
            </button>
            <button
              type="button"
              className={`nav-link ${view === "create-ticket" ? "active" : ""}`}
              style={view === "create-ticket" ? { background: "#0B7A46" } : { color: "#fff" }}
              onClick={() => setView("create-ticket")}
              aria-current={view === "create-ticket" ? "page" : undefined}
            >
              Create Ticket
            </button>
          </nav>
        </div>
      </header>

      <div className="container" style={{ maxWidth: 720 }}>
        {view === "create-ticket" ? (
          <CreateTicket requester={selected} onViewTickets={() => setView("my-tickets")} />
        ) : view === "ticket-detail" && selectedTicket ? (
          <TicketDetail
            requester={selected}
            ticket={selectedTicket}
            onBack={() => setView("my-tickets")}
          />
        ) : (
          <MyTickets
            key={selected.id}
            requester={selected}
            onCreate={() => setView("create-ticket")}
            onViewTicket={(t) => {
              setSelectedTicket(t);
              setView("ticket-detail");
            }}
          />
        )}
      </div>
    </div>
  );
}