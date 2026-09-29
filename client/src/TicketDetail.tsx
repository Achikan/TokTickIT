import { useEffect, useRef, useState } from "react";
import {
  AuthUser,
  AttachmentInfo,
  MyTicket,
  Priority,
  Status,
  TicketComment,
  TicketDetail as TicketDetailType,
  downloadAttachment,
  fetchTicketComments,
  fetchTicketDetail,
  indicateProblemResolved,
  postTicketComment,
  removeAttachment,
  uploadAttachment,
} from "./api.js";

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

interface Props {
  requester: AuthUser;
  ticket: MyTicket;
  onBack: () => void;
}

function formatDateTime(v: string) {
  return new Date(v).toLocaleString();
}

type UploadPhase = "idle" | "busy";

function AttachmentSection({
  ticketId,
  attachments,
  onUploaded,
  onUpdated,
}: {
  ticketId: number;
  attachments: AttachmentInfo[];
  onUploaded: (a: AttachmentInfo) => void;
  onUpdated: (a: AttachmentInfo) => void;
}) {
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [unavailableError, setUnavailableError] = useState<string | null>(null);
  const [removingTarget, setRemovingTarget] = useState<AttachmentInfo | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploadPhase("busy");
    setUploadError(null);
    try {
      const created = await uploadAttachment(ticketId, selectedFile);
      onUploaded(created);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      setUploadError(err.fields?.file ?? err.message);
    } finally {
      setUploadPhase("idle");
    }
  }

  async function handleDownload(a: AttachmentInfo) {
    setDownloadingId(a.id);
    setUnavailableError(null);
    try {
      const { blob, filename } = await downloadAttachment(a);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "UNAVAILABLE") setUnavailableError(a.originalName);
    } finally {
      setDownloadingId(null);
    }
  }

  function startRemove(a: AttachmentInfo) {
    setRemoveError(null);
    setRemovalReason("");
    setRemovingTarget(a);
  }

  function cancelRemove() {
    setRemovingTarget(null);
    setRemovalReason("");
  }

  async function confirmRemove() {
    if (!removingTarget) return;
    if (removalReason.trim() === "") {
      setRemoveError("A removal reason is required.");
      return;
    }
    const a = removingTarget;
    setRemovingId(a.id);
    setRemoveError(null);
    try {
      const updated = await removeAttachment(a.id, removalReason.trim());
      onUpdated(updated);
      cancelRemove();
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      setRemoveError(err.fields?.removedReason ?? err.message);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="h5 mb-0">Attachments</h3>
        </div>

        {/* Upload control — placed logically within Ticket Detail (ui-spec §6) */}
        <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center mb-3">
          <input
            ref={fileInputRef}
            type="file"
            data-testid="attachment-file-input"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] ?? null);
              setUploadError(null);
            }}
          />
          <button
            type="button"
            className="btn btn-tok-primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploadPhase === "busy"}
          >
            {uploadPhase === "busy" ? "Uploading…" : "Upload Attachment"}
          </button>
          {selectedFile && uploadPhase !== "busy" && (
            <span className="text-muted small" data-testid="selected-file-name">
              Selected: {selectedFile.name}
            </span>
          )}
        </div>
        {uploadError && <p className="text-danger small">{uploadError}</p>}
        {removeError && <p className="text-danger small">{removeError}</p>}
        {unavailableError && (
          <p className="callout-warning px-2 py-1 small mb-3" role="alert">
            The file "{unavailableError}" is not available on the server.
          </p>
        )}

        {removingTarget && (
          <div className="border rounded p-3 mb-3" data-testid="removal-reason-panel">
            <label htmlFor="removal-reason" className="form-label fw-semibold">
              Removal reason for "{removingTarget.originalName}"
            </label>
            <textarea
              id="removal-reason"
              className="form-control"
              rows={2}
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="e.g. Wrong file — Attached to the wrong ticket"
            />
            <div className="d-flex gap-2 mt-2">
              <button
                type="button"
                className="btn btn-tok-danger btn-sm"
                onClick={confirmRemove}
                disabled={removingId !== null}
              >
                {removingId !== null ? "Removing…" : "Confirm Removal"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={cancelRemove}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {attachments.length === 0 ? (
          <p className="text-muted mb-0">No attachments yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((a) => {
                  const isRemoved = a.removedAt !== null;
                  const isDownloading = downloadingId === a.id;
                  const isRemoving = removingId === a.id;
                  return (
                    <tr key={a.id}>
                      <td>{a.originalName}</td>
                      <td className="text-muted small">{a.mimeType}</td>
                      <td className="text-muted small">{(a.size / 1024).toFixed(1)} KB</td>
                      <td className="text-muted small">{formatDateTime(a.uploadedAt)}</td>
                      <td>
                        {isRemoved ? (
                          <span className="text-muted fst-italic">
                            Removed{a.removedReason ? ` — ${a.removedReason}` : ""}
                          </span>
                        ) : (
                          <span className="text-success small">Active</span>
                        )}
                      </td>
                      <td>
                        {isRemoved ? (
                          <span className="text-muted fst-italic small">Blocked</span>
                        ) : (
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => handleDownload(a)}
                              disabled={isDownloading || isRemoving}
                            >
                              {isDownloading ? "Downloading…" : "Download"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-tok-danger btn-sm"
                              onClick={() => startRemove(a)}
                              disabled={isDownloading || isRemoving}
                            >
                              {isRemoving ? "Removing…" : "Remove"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// Issue 20 — Public Comments + "Problem Appears Resolved" (Lab 3 sheet §8.2).
// The Requester communicates on their Ticket but never formally Resolves/Closes.
function CommunicationSection({
  ticketId,
  comments,
  onPosted,
  requesterName,
}: {
  ticketId: number;
  comments: TicketComment[];
  onPosted: (c: TicketComment) => void;
  requesterName: string;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (content.trim() === "") {
      setError("Comment is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await postTicketComment(ticketId, content.trim());
      onPosted(created);
      setContent("");
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      setError(err.fields?.content ?? err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mb-4" aria-labelledby="public-comments-heading">
      <div className="card-body">
        <h3 id="public-comments-heading" className="h5 mb-3">
          Public Comments
        </h3>

        {comments.length === 0 ? (
          <p className="text-muted mb-3">No comments yet.</p>
        ) : (
          <ul className="list-unstyled mb-3" data-testid="public-comments-list">
            {comments.map((c) => (
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

        <form onSubmit={handleSubmit} aria-label="Post a public comment">
          <label htmlFor="comment-content" className="form-label">
            Add a comment
          </label>
          <textarea
            id="comment-content"
            className={`form-control ${error ? "is-invalid" : ""}`}
            rows={3}
            maxLength={2000}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            placeholder={`Comment as ${requesterName}`}
          />
          {error && <small className="text-danger d-block mt-1">{error}</small>}
          <button
            type="submit"
            className="btn btn-tok-primary mt-2"
            disabled={busy}
          >
            {busy ? "Posting…" : "Post Comment"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default function TicketDetail({ requester, ticket, onBack }: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "failure">("loading");
  const [detail, setDetail] = useState<TicketDetailType | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [indicateBusy, setIndicateBusy] = useState(false);
  const [indicateError, setIndicateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([fetchTicketDetail(ticket.id), fetchTicketComments(ticket.id)])
      .then(([data, items]) => {
        if (!cancelled) {
          setDetail(data);
          setComments(items);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("failure");
      });
    return () => {
      cancelled = true;
    };
  }, [ticket.id]);

  async function handleIndicateResolved() {
    setIndicateBusy(true);
    setIndicateError(null);
    try {
      const updated = await indicateProblemResolved(detail!.id);
      setDetail((d) =>
        d
          ? {
              ...d,
              currentStatus: updated.currentStatus,
              requesterIndicatedResolvedAt: updated.requesterIndicatedResolvedAt,
            }
          : d
      );
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      setIndicateError(err.fields?.content ?? err.message);
    } finally {
      setIndicateBusy(false);
    }
  }

  if (status === "loading") {
    return <p className="text-secondary">Loading ticket…</p>;
  }

  if (status === "failure") {
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 mb-0">Ticket {ticket.ticketNumber}</h2>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
            Back to My Tickets
          </button>
        </div>
        <p className="text-danger">
          Unable to load the ticket details. Please try again later.
        </p>
      </div>
    );
  }

  if (!detail) return null;

  const handleUploaded = (a: AttachmentInfo) => {
    setDetail((d) => (d ? { ...d, attachments: [a, ...d.attachments] } : d));
  };

  const handleUpdated = (a: AttachmentInfo) => {
    setDetail((d) =>
      d
        ? { ...d, attachments: d.attachments.map((x) => (x.id === a.id ? a : x)) }
        : d
    );
  };

  const alreadyIndicated = detail.requesterIndicatedResolvedAt !== null;

  return (
    <div>
      {/* Header: ticket number + back navigation */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">
          {detail.ticketNumber}
        </h2>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
          Back to My Tickets
        </button>
      </div>

      {/* Ticket Information — read-only field grouping (ui-spec §11) */}
      <section className="card mb-4">
        <div className="card-body">
          <h3 className="h5 mb-3">Ticket Information</h3>
          <dl className="row mb-0 gx-3 gy-2">
            {/* System-generated read-only */}
            <dt className="col-md-3">Ticket Number</dt>
            <dd className="col-md-9 readonly-field px-2 rounded">{detail.ticketNumber}</dd>

            <dt className="col-md-3">Current Status</dt>
            <dd className="col-md-9">
              <span className={`badge ${STATUS_BADGES[detail.currentStatus]}`}>
                {detail.currentStatus}
              </span>
            </dd>

            <dt className="col-md-3">Created</dt>
            <dd className="col-md-9">{formatDateTime(detail.createdAt)}</dd>

            <dt className="col-md-3">Last Updated</dt>
            <dd className="col-md-9">{formatDateTime(detail.updatedAt)}</dd>

            <dt className="col-md-3">Requester</dt>
            <dd className="col-md-9 readonly-field px-2 rounded">{requester.name}</dd>

            {/* Classification fields */}
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
          </dl>
        </div>
      </section>

      {/* Summary and Description — full width, clearly readable */}
      <section className="card mb-4">
        <div className="card-body">
          <h3 className="h5 mb-3">Summary &amp; Description</h3>
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

      {/* Issue 20 — "Problem Appears Resolved" (FR-11, BR-11). Records the
          Requester's indication only; the status badge remains unchanged. */}
      <section className="card mb-4">
        <div className="card-body">
          <h3 className="h5 mb-2">Resolution Feedback</h3>
          {alreadyIndicated ? (
            <div className="callout-success px-3 py-2 rounded" role="status" data-testid="resolved-indicated">
              <span className="fw-semibold">You indicated this problem appears resolved.</span>
              <span className="text-muted d-block small">
                Recorded {formatDateTime(detail.requesterIndicatedResolvedAt!)}. The ticket status is
                unchanged; IT Staff can still act on the ticket.
              </span>
            </div>
          ) : (
            <>
              <p className="text-muted small mb-2">
                If the problem appears resolved from your side, record that here. It does not
                formally mark the ticket Resolved/Closed.
              </p>
              {indicateError && <p className="text-danger small">{indicateError}</p>}
              <button
                type="button"
                className="btn btn-tok-primary"
                onClick={handleIndicateResolved}
                disabled={indicateBusy}
              >
                {indicateBusy ? "Recording…" : "Mark as appears resolved"}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Issue 20 — Public Comments (FR-10, AC-17): visible to all three roles. */}
      <CommunicationSection
        ticketId={detail.id}
        comments={comments}
        requesterName={requester.name}
        onPosted={(c) => setComments((prev) => [c, ...prev])}
      />

      {/* Attachments — upload / download / soft-remove (FR-15..18, ui-spec §6) */}
      <AttachmentSection
        ticketId={detail.id}
        attachments={detail.attachments}
        onUploaded={handleUploaded}
        onUpdated={handleUpdated}
      />
    </div>
  );
}