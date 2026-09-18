import { useEffect, useState } from "react";
import {
  ApiError,
  type AttachmentInfo,
  type AuthUser,
  type Priority,
  type StaffTicket,
  type StaffTicketDetailData,
  type Status,
  type TicketComment,
  type TicketNote,
  fetchStaffTicketDetail,
  postTicketComment,
  postTicketNote,
  updateStaffTicketOwner,
  updateStaffTicketPriority,
  updateStaffTicketStatus,
} from "./api.js";

// Lab 3 Issue 22 — IT Staff Ticket Detail (ui-spec.md §6, labs-sheet §8.4).
// Grouped Ticket information with only permitted operational fields editable:
// ownership (claim/assign/reassign), IT Priority and permitted status changes,
// plus Public Comments and visually distinct Internal Notes. Attachments and
// the Requester's resolution indication are surfaced read-only.

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

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

// specification.md §5.2 — the only statuses reachable from each current status.
const TRANSITIONS: Record<Status, Status[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

function formatDateTime(v: string): string {
  return new Date(v).toLocaleString();
}

interface Props {
  user: AuthUser;
  ticket: StaffTicket;
  onBack: () => void;
}

// A small append-only form shared by Public Comments and Internal Notes.
function AppendForm({
  id,
  label,
  placeholder,
  submitLabel,
  value,
  busy,
  error,
  onChange,
  onSubmit,
}: {
  id: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  value: string;
  busy: boolean;
  error: string | null;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <textarea
        id={id}
        className={`form-control ${error ? "is-invalid" : ""}`}
        rows={2}
        maxLength={2000}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <small className="text-danger d-block mt-1">{error}</small>}
      <button type="submit" className="btn btn-tok-primary btn-sm mt-2" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function AttachmentsList({ attachments }: { attachments: AttachmentInfo[] }) {
  if (attachments.length === 0) {
    return <p className="text-muted mb-0">No attachments on this ticket.</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>File</th>
            <th>Type</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {attachments.map((a) => (
            <tr key={a.id}>
              <td>{a.originalName}</td>
              <td className="text-muted small">{a.mimeType}</td>
              <td className="text-muted small">{(a.size / 1024).toFixed(1)} KB</td>
              <td className="text-muted small">{formatDateTime(a.uploadedAt)}</td>
              <td>
                {a.removedAt ? (
                  <span className="text-muted fst-italic">
                    Removed{a.removedReason ? ` — ${a.removedReason}` : ""}
                  </span>
                ) : (
                  <span className="text-success small">Active</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StaffTicketDetail({ user, ticket, onBack }: Props) {
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "failure">("loading");
  const [detail, setDetail] = useState<StaffTicketDetailData | null>(null);

  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  const [priorityValue, setPriorityValue] = useState<Priority>("MEDIUM");
  const [priorityBusy, setPriorityBusy] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);

  const [statusValue, setStatusValue] = useState<Status | "">("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [commentValue, setCommentValue] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [noteValue, setNoteValue] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadStatus("loading");
    fetchStaffTicketDetail(ticket.id)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setPriorityValue(data.itPriority);
        setStatusValue("");
        setLoadStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadStatus("failure");
      });
    return () => {
      cancelled = true;
    };
  }, [ticket.id]);

  function applyUpdatedSummary(updated: StaffTicket) {
    setDetail((d) =>
      d
        ? {
            ...d,
            owner: updated.owner,
            itPriority: updated.itPriority,
            currentStatus: updated.currentStatus,
            updatedAt: updated.updatedAt,
          }
        : d
    );
  }

  async function handleClaim() {
    if (!detail) return;
    setOwnerBusy(true);
    setOwnerError(null);
    try {
      const updated = await updateStaffTicketOwner(detail.id, user.id);
      applyUpdatedSummary(updated);
      setSelectedOwnerId("");
    } catch (e) {
      setOwnerError(e instanceof ApiError ? e.message : "Unable to update the ticket owner.");
    } finally {
      setOwnerBusy(false);
    }
  }

  async function handleAssign() {
    if (!detail || selectedOwnerId === "") return;
    setOwnerBusy(true);
    setOwnerError(null);
    try {
      const updated = await updateStaffTicketOwner(detail.id, Number(selectedOwnerId));
      applyUpdatedSummary(updated);
      setSelectedOwnerId("");
    } catch (e) {
      setOwnerError(e instanceof ApiError ? e.message : "Unable to update the ticket owner.");
    } finally {
      setOwnerBusy(false);
    }
  }

  async function handleSavePriority() {
    if (!detail) return;
    setPriorityBusy(true);
    setPriorityError(null);
    try {
      const updated = await updateStaffTicketPriority(detail.id, priorityValue);
      applyUpdatedSummary(updated);
    } catch (e) {
      setPriorityError(e instanceof ApiError ? e.message : "Unable to update IT Priority.");
    } finally {
      setPriorityBusy(false);
    }
  }

  async function handleUpdateStatus() {
    if (!detail || statusValue === "") return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      const updated = await updateStaffTicketStatus(detail.id, statusValue);
      applyUpdatedSummary(updated);
      setStatusValue("");
    } catch (e) {
      // A forbidden transition returns a specific 409 message (BR-09); surface
      // it instead of silently hiding the option (ui-spec §6).
      setStatusError(e instanceof ApiError ? e.message : "Unable to update the ticket status.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function handlePostComment() {
    if (!detail) return;
    if (commentValue.trim() === "") {
      setCommentError("Comment is required.");
      return;
    }
    setCommentBusy(true);
    setCommentError(null);
    try {
      const created = await postTicketComment(detail.id, commentValue.trim());
      setDetail((d) => (d ? { ...d, comments: [created, ...d.comments] } : d));
      setCommentValue("");
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      setCommentError(err.fields?.content ?? err.message);
    } finally {
      setCommentBusy(false);
    }
  }

  async function handlePostNote() {
    if (!detail) return;
    if (noteValue.trim() === "") {
      setNoteError("Note is required.");
      return;
    }
    setNoteBusy(true);
    setNoteError(null);
    try {
      const created = await postTicketNote(detail.id, noteValue.trim());
      setDetail((d) => (d ? { ...d, notes: [created, ...d.notes] } : d));
      setNoteValue("");
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      setNoteError(err.fields?.content ?? err.message);
    } finally {
      setNoteBusy(false);
    }
  }

  if (loadStatus === "loading") {
    return <p className="text-secondary">Loading ticket…</p>;
  }

  if (loadStatus === "failure" || !detail) {
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 mb-0">{ticket.ticketNumber}</h2>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            Back to Queue
          </button>
        </div>
        <p className="text-danger">Unable to load the ticket. Please try again later.</p>
      </div>
    );
  }

  const allowedTransitions: Status[] = TRANSITIONS[detail.currentStatus];
  const alreadyOwner = detail.owner?.id === user.id;

  return (
    <div>
      {/* Header: ticket number + back navigation to the queue */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 className="h4 mb-0">{detail.ticketNumber}</h2>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
          Back to Queue
        </button>
      </div>

      {/* Ticket information — grouped, read-only fields (ui-spec §6) */}
      <section className="card mb-4" aria-labelledby="staff-ticket-info-heading">
        <div className="card-body">
          <h3 id="staff-ticket-info-heading" className="h5 mb-3">
            Ticket Information
          </h3>
          <dl className="row mb-0 gx-3 gy-2">
            <dt className="col-md-3">Ticket Number</dt>
            <dd className="col-md-9 readonly-field px-2 rounded">{detail.ticketNumber}</dd>

            <dt className="col-md-3">Current Status</dt>
            <dd className="col-md-9">
              <span className={`badge ${STATUS_BADGES[detail.currentStatus]}`}>
                {detail.currentStatus}
              </span>
            </dd>

            <dt className="col-md-3">Requester</dt>
            <dd className="col-md-9 readonly-field px-2 rounded">{detail.requester.name}</dd>

            <dt className="col-md-3">Ticket Owner</dt>
            <dd className="col-md-9">
              {detail.owner ? (
                <span data-testid="ticket-owner">{detail.owner.name}</span>
              ) : (
                <em className="text-muted">Unassigned</em>
              )}
            </dd>

            <dt className="col-md-3">Category</dt>
            <dd className="col-md-9 readonly-field px-2 rounded">{detail.category.name}</dd>

            <dt className="col-md-3">Related System</dt>
            <dd className="col-md-9 readonly-field px-2 rounded">
              {detail.relatedSystem.name}
              <span className="text-muted small ms-2">({detail.relatedSystem.type})</span>
            </dd>

            <dt className="col-md-3">Requested Priority</dt>
            <dd className="col-md-9">
              <span className={`badge ${PRIORITY_BADGES[detail.requestedPriority]}`}>
                {detail.requestedPriority}
              </span>
            </dd>

            <dt className="col-md-3">IT Priority</dt>
            <dd className="col-md-9">
              <span className={`badge ${PRIORITY_BADGES[detail.itPriority]}`}>
                {detail.itPriority}
              </span>
            </dd>

            <dt className="col-md-3">Created</dt>
            <dd className="col-md-9">{formatDateTime(detail.createdAt)}</dd>

            <dt className="col-md-3">Last Updated</dt>
            <dd className="col-md-9">{formatDateTime(detail.updatedAt)}</dd>
          </dl>
        </div>
      </section>

      {/* Summary and Description — read-only for staff */}
      <section className="card mb-4" aria-labelledby="staff-ticket-summary-heading">
        <div className="card-body">
          <h3 id="staff-ticket-summary-heading" className="h5 mb-3">
            Summary &amp; Description
          </h3>
          <dl className="mb-0">
            <dt className="mb-1">Summary</dt>
            <dd className="readonly-field px-2 rounded mb-3">{detail.summary}</dd>
            <dt className="mb-1">Description</dt>
            <dd className="readonly-field px-2 rounded mb-0" style={{ whiteSpace: "pre-wrap" }}>
              {detail.description}
            </dd>
          </dl>
        </div>
      </section>

      {/* Requester "Problem Appears Resolved" indication (FR-11, BR-11) */}
      {detail.requesterIndicatedResolvedAt && (
        <div className="callout-success px-3 py-2 rounded mb-4" role="status" data-testid="requester-indication">
          <span className="fw-semibold">The Requester indicated this problem appears resolved.</span>
          <span className="text-muted d-block small">
            Recorded {formatDateTime(detail.requesterIndicatedResolvedAt)}. The status is unchanged;
            IT Staff remain responsible for formally resolving or closing the ticket.
          </span>
        </div>
      )}

      {/* Operational controls — ownership, IT Priority, status (ui-spec §6) */}
      <section className="card mb-4" aria-labelledby="staff-operations-heading">
        <div className="card-body">
          <h3 id="staff-operations-heading" className="h5 mb-3">
            Operations
          </h3>

          {/* Ownership: claim / assign / reassign (FR-14, BR-07) */}
          <div className="mb-4">
            <h4 className="h6">Ticket Ownership</h4>
            <div className="d-flex flex-wrap gap-2 align-items-end">
              <button
                type="button"
                className="btn btn-tok-primary btn-sm"
                onClick={handleClaim}
                disabled={ownerBusy || alreadyOwner}
              >
                {ownerBusy ? "Saving…" : alreadyOwner ? "You own this ticket" : "Claim ticket"}
              </button>
              <div>
                <label htmlFor="assign-owner" className="form-label mb-1">
                  Reassign to
                </label>
                <select
                  id="assign-owner"
                  className="form-select form-select-sm"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                >
                  <option value="">Select an eligible owner…</option>
                  {detail.availableOwners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAssign}
                disabled={ownerBusy || selectedOwnerId === ""}
              >
                Assign owner
              </button>
            </div>
            {ownerError && (
              <p className="text-danger small mt-2 mb-0" role="alert">
                {ownerError}
              </p>
            )}
          </div>

          {/* IT Priority (FR-15, BR-08) */}
          <div className="mb-4">
            <h4 className="h6">IT Priority</h4>
            <div className="d-flex flex-wrap gap-2 align-items-end">
              <div>
                <label htmlFor="it-priority" className="form-label mb-1">
                  IT Priority value
                </label>
                <select
                  id="it-priority"
                  className="form-select form-select-sm"
                  value={priorityValue}
                  onChange={(e) => setPriorityValue(e.target.value as Priority)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-tok-primary btn-sm"
                onClick={handleSavePriority}
                disabled={priorityBusy || priorityValue === detail.itPriority}
              >
                {priorityBusy ? "Saving…" : "Save IT Priority"}
              </button>
            </div>
            {priorityError && (
              <p className="text-danger small mt-2 mb-0" role="alert">
                {priorityError}
              </p>
            )}
          </div>

          {/* Status transition, restricted to the approved matrix (FR-16, BR-09) */}
          <div className="mb-0">
            <h4 className="h6">Status</h4>
            {allowedTransitions.length === 0 ? (
              <p className="text-muted small mb-0">
                No further status transitions are permitted from {detail.currentStatus}.
              </p>
            ) : (
              <div className="d-flex flex-wrap gap-2 align-items-end">
                <div>
                  <label htmlFor="status-transition" className="form-label mb-1">
                    New status
                  </label>
                  <select
                    id="status-transition"
                    className="form-select form-select-sm"
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value as Status | "")}
                  >
                    <option value="">Select a permitted status…</option>
                    {allowedTransitions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-tok-primary btn-sm"
                  onClick={handleUpdateStatus}
                  disabled={statusBusy || statusValue === ""}
                >
                  {statusBusy ? "Updating…" : "Update Status"}
                </button>
              </div>
            )}
            {statusError && (
              <p className="text-danger small mt-2 mb-0" role="alert">
                {statusError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Public Comments — visible to all three roles (FR-10, AC-17) */}
      <section className="card mb-4" aria-labelledby="staff-public-comments-heading">
        <div className="card-body">
          <h3 id="staff-public-comments-heading" className="h5 mb-3">
            Public Comments
          </h3>

          {detail.comments.length === 0 ? (
            <p className="text-muted mb-3">No public comments yet.</p>
          ) : (
            <ul className="list-unstyled mb-3" data-testid="staff-public-comments-list">
              {detail.comments.map((c) => (
                <li key={c.id} className="border rounded p-2 mb-2">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span className="fw-semibold text-body">{c.author.name}</span>
                    <span>{formatDateTime(c.createdAt)}</span>
                  </div>
                  <div>{c.content}</div>
                </li>
              ))}
            </ul>
          )}

          <AppendForm
            id="staff-comment-content"
            label="Add a public comment"
            placeholder="Visible to the Requester."
            submitLabel="Post Comment"
            value={commentValue}
            busy={commentBusy}
            error={commentError}
            onChange={(v) => {
              setCommentValue(v);
              if (commentError) setCommentError(null);
            }}
            onSubmit={handlePostComment}
          />
        </div>
      </section>

      {/* Internal Notes — visually distinct + explicit marker (AC-17, ui-spec §6) */}
      <section className="card mb-4" aria-labelledby="staff-internal-notes-heading">
        <div className="card-body">
          <h3 id="staff-internal-notes-heading" className="h5 mb-1">
            Internal Notes
          </h3>
          <p className="internal-note-marker small mb-3">
            Internal — visible to IT Staff and Administrators only. Never shown to the Requester.
          </p>

          {detail.notes.length === 0 ? (
            <p className="text-muted mb-3">No internal notes yet.</p>
          ) : (
            <ul className="list-unstyled mb-3" data-testid="staff-internal-notes-list">
              {detail.notes.map((n) => (
                <li key={n.id} className="internal-note-panel rounded p-2 mb-2">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span className="fw-semibold text-body">
                      {n.author.name} · <span className="internal-note-marker">Internal</span>
                    </span>
                    <span>{formatDateTime(n.createdAt)}</span>
                  </div>
                  <div>{n.content}</div>
                </li>
              ))}
            </ul>
          )}

          <AppendForm
            id="staff-note-content"
            label="Add an internal note"
            placeholder="Private — not visible to the Requester."
            submitLabel="Save Note"
            value={noteValue}
            busy={noteBusy}
            error={noteError}
            onChange={(v) => {
              setNoteValue(v);
              if (noteError) setNoteError(null);
            }}
            onSubmit={handlePostNote}
          />
        </div>
      </section>

      {/* Attachments — continuity of the existing Ticket attachments (read-only) */}
      <section className="card mb-4" aria-labelledby="staff-attachments-heading">
        <div className="card-body">
          <h3 id="staff-attachments-heading" className="h5 mb-3">
            Attachments
          </h3>
          <AttachmentsList attachments={detail.attachments} />
        </div>
      </section>
    </div>
  );
}
