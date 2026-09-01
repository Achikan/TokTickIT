import { useEffect, useState } from "react";
import {
  fetchDevelopmentRequesters,
  DevelopmentRequester,
} from "./api.js";

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
            className="btn btn-success"
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

  if (selected === null) {
    return <RequesterSelection onSelect={setSelected} />;
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-1">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>
      <p className="mb-4">
        Selected Requester:{" "}
        <strong>{selected.name}</strong>{" "}
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm ms-2"
          onClick={() => setSelected(null)}
        >
          Change Requester
        </button>
      </p>
      <p className="text-secondary">
        Ticket screens (Create Ticket, My Tickets, Ticket Detail) are implemented in the next
        Lab 2 issues.
      </p>
    </div>
  );
}