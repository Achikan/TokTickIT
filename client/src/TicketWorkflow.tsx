import { useEffect, useRef, useState } from "react";
import { ApiError, type StaffTicket, type Status, updateStaffTicketStatus } from "./api.js";

// Lab 4 Issue 33 — Ticket Workflow controls (ui-spec.md §6, FR-13/FR-14,
// BR-09/BR-11/BR-12). A row of labelled action buttons offers ONLY the status
// transitions the §5.2 matrix permits from the Ticket's current status, so an
// illegal option is never presented. The backend (Issue 32) stays the authority:
// a forbidden transition, the BR-11 resolution gate and a stale update are all
// surfaced as inline, recoverable feedback without losing the screen.

// specification.md §5.2 — the only statuses reachable from each current status.
export const WORKFLOW_TRANSITIONS: Record<Status, Status[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

// Human verb labels for the transition buttons (ui-spec §6).
const TRANSITION_LABELS: Record<Status, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "Start Progress",
  WAITING_FOR_REQUESTER: "Set Waiting for Requester",
  RESOLVED: "Resolve",
  CLOSED: "Close",
  REOPENED: "Reopen",
  CANCELLED: "Cancel Ticket",
};

export function transitionLabel(to: Status): string {
  return TRANSITION_LABELS[to];
}

const FORBIDDEN_MESSAGE = "That status change is no longer allowed. The list has been refreshed.";
const GATE_REMEDY = "Record at least one action on this ticket before resolving.";
const RESOLVE_PRE_CHECK = "Record at least one Action Taken first.";
const STALE_MESSAGE = "This ticket was changed by someone else. Reload it and try again.";
const SAFE_FAILURE = "Unable to update the ticket status. Please try again.";

type WorkflowError =
  | { kind: "forbidden" }
  | { kind: "gate" }
  | { kind: "stale" }
  | { kind: "generic"; message: string };

interface Props {
  ticketId: number;
  currentStatus: Status;
  // The `updatedAt` the caller last read; sent so a concurrent write is a safe
  // 409 STALE_UPDATE rather than a silent overwrite (D-1, BR-12).
  expectedUpdatedAt: string;
  // Recorded Actions on this Ticket; drives the client-side resolve pre-check
  // (the backend gate remains the authority, BR-11).
  actionsCount: number;
  onTransitioned: (ticket: StaffTicket) => void;
  // Re-reads the Ticket so the offered control set reflects server state. Called
  // after a forbidden transition ("list has been refreshed") and by the stale
  // update "Reload ticket" recovery action.
  onReloadTicket: () => void;
}

export default function TicketWorkflow({
  ticketId,
  currentStatus,
  expectedUpdatedAt,
  actionsCount,
  onTransitioned,
  onReloadTicket,
}: Props) {
  const [busyTarget, setBusyTarget] = useState<Status | null>(null);
  const [error, setError] = useState<WorkflowError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // A new current status means a new set of choices; clear transient cancel mode.
  useEffect(() => {
    setConfirmingCancel(false);
  }, [currentStatus]);

  // Move focus to the confirmation button so the destructive step is keyboard
  // operable without a mouse (ui-spec §9).
  useEffect(() => {
    if (confirmingCancel) confirmRef.current?.focus();
  }, [confirmingCancel]);

  const allowed = WORKFLOW_TRANSITIONS[currentStatus];
  const busy = busyTarget !== null;

  async function transition(to: Status) {
    setBusyTarget(to);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateStaffTicketStatus(ticketId, to, expectedUpdatedAt);
      onTransitioned(updated);
      setSuccess(`Status updated to ${to}.`);
      setConfirmingCancel(false);
      headingRef.current?.focus();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "FORBIDDEN_TRANSITION") {
          setError({ kind: "forbidden" });
          // The matrix moved under us: refresh to the current control set.
          onReloadTicket();
        } else if (e.code === "RESOLUTION_GATE") {
          setError({ kind: "gate" });
        } else if (e.code === "STALE_UPDATE") {
          setError({ kind: "stale" });
        } else {
          setError({ kind: "generic", message: e.message || SAFE_FAILURE });
        }
      } else {
        setError({ kind: "generic", message: SAFE_FAILURE });
      }
    } finally {
      setBusyTarget(null);
    }
  }

  function renderButton(to: Status) {
    const label = TRANSITION_LABELS[to];
    const isResolve = to === "RESOLVED";
    const isCancel = to === "CANCELLED";
    const gated = isResolve && actionsCount === 0;
    const busyLabel = busyTarget === to ? "Updating…" : label;

    if (isCancel && confirmingCancel) {
      return (
        <span key={to} className="d-inline-flex flex-wrap gap-2" data-testid="cancel-confirm">
          <button
            ref={confirmRef}
            type="button"
            className="btn btn-tok-danger btn-sm"
            onClick={() => transition(to)}
            disabled={busy}
          >
            {busyTarget === to ? "Updating…" : "Confirm cancel?"}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setConfirmingCancel(false)}
            disabled={busy}
          >
            Keep ticket
          </button>
        </span>
      );
    }

    return (
      <button
        key={to}
        type="button"
        className={`btn btn-sm ${isCancel ? "btn-outline-danger" : "btn-tok-primary"}`}
        onClick={() => (isCancel ? setConfirmingCancel(true) : transition(to))}
        disabled={busy || gated}
        aria-describedby={gated ? "resolve-gate-hint" : undefined}
        title={gated ? RESOLVE_PRE_CHECK : undefined}
        data-transition={to}
      >
        {busyLabel}
      </button>
    );
  }

  return (
    <div className="mb-0" data-testid="ticket-workflow">
      <h4 className="h6" ref={headingRef} tabIndex={-1}>
        Status
      </h4>

      {allowed.length === 0 ? (
        <p className="text-muted small mb-0" data-testid="workflow-terminal">
          No further status transitions are permitted from {currentStatus}.
        </p>
      ) : (
        <div
          className="workflow-actions d-flex flex-wrap gap-2"
          role="group"
          aria-label="Status transitions"
          data-testid="workflow-actions"
        >
          {allowed.map(renderButton)}
        </div>
      )}

      {/* BR-11 pre-check: the Resolve choice is offered but visibly unavailable
          until at least one Action exists (server gate is the authority). */}
      {allowed.includes("RESOLVED") && actionsCount === 0 && (
        <small id="resolve-gate-hint" className="form-text text-muted d-block mt-2">
          {RESOLVE_PRE_CHECK}
        </small>
      )}

      {/* Success: inline confirmation; the Ticket summary/status badge in the
          parent refreshes in place from the same response (FR-13). */}
      {success && (
        <div className="callout-success px-3 py-2 small mt-3" role="status" data-testid="workflow-success">
          {success}
        </div>
      )}

      {error?.kind === "forbidden" && (
        <div
          className="callout-warning px-3 py-2 small mt-3"
          role="status"
          data-testid="workflow-forbidden"
        >
          {FORBIDDEN_MESSAGE}
        </div>
      )}

      {error?.kind === "gate" && (
        <div className="callout-error px-3 py-2 small mt-3" role="status" data-testid="workflow-gate">
          {GATE_REMEDY}
        </div>
      )}

      {error?.kind === "stale" && (
        <div className="callout-warning px-3 py-2 small mt-3" role="status" data-testid="workflow-stale">
          <span>{STALE_MESSAGE}</span>{" "}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm ms-1"
            onClick={onReloadTicket}
          >
            Reload ticket
          </button>
        </div>
      )}

      {error?.kind === "generic" && (
        <p className="text-tok-error small mt-3 mb-0" role="alert" data-testid="workflow-error">
          {error.message}
        </p>
      )}
    </div>
  );
}
