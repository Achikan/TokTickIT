import { useEffect, useState } from "react";
import {
  AttachmentInfo,
  DevelopmentRequester,
  MyTicket,
  Priority,
  Status,
  TicketDetail as TicketDetailType,
  fetchTicketDetail,
} from "./api.js";

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

interface Props {
  requester: DevelopmentRequester;
  ticket: MyTicket;
  onBack: () => void;
}

function formatDateTime(v: string) {
  return new Date(v).toLocaleString();
}

function AttachmentRow({ a }: { a: AttachmentInfo }) {
  const isRemoved = a.removedAt !== null;
  return (
    <tr>
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
    </tr>
  );
}

export default function TicketDetail({ requester, ticket, onBack }: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "failure">("loading");
  const [detail, setDetail] = useState<TicketDetailType | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchTicketDetail(requester.id, ticket.id)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("failure");
      });
    return () => {
      cancelled = true;
    };
  }, [requester.id, ticket.id]);

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
            <dt className="col-sm-3">Ticket Number</dt>
            <dd className="col-sm-9 readonly-field px-2 rounded">{detail.ticketNumber}</dd>

            <dt className="col-sm-3">Current Status</dt>
            <dd className="col-sm-9">
              <span className={`badge ${STATUS_BADGES[detail.currentStatus]}`}>
                {detail.currentStatus}
              </span>
            </dd>

            <dt className="col-sm-3">Created</dt>
            <dd className="col-sm-9">{formatDateTime(detail.createdAt)}</dd>

            <dt className="col-sm-3">Last Updated</dt>
            <dd className="col-sm-9">{formatDateTime(detail.updatedAt)}</dd>

            <dt className="col-sm-3">Development Requester</dt>
            <dd className="col-sm-9 readonly-field px-2 rounded">{requester.name}</dd>

            {/* Classification fields */}
            <dt className="col-sm-3">Category</dt>
            <dd className="col-sm-9 readonly-field px-2 rounded">{detail.category.name}</dd>

            <dt className="col-sm-3">Related System</dt>
            <dd className="col-sm-9 readonly-field px-2 rounded">
              {detail.relatedSystem.name}
              <span className="text-muted small ms-2">({detail.relatedSystem.type})</span>
            </dd>

            <dt className="col-sm-3">Requested Priority</dt>
            <dd className="col-sm-9">
              <span className={`badge ${PRIORITY_BADGES[detail.requestedPriority]}`}>
                {detail.requestedPriority}
              </span>
            </dd>

            <dt className="col-sm-3">IT Priority</dt>
            <dd className="col-sm-9">
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

      {/* Attachments — Issue 11 will add upload/download/remove actions; for now
           the section exists but shows an empty state. (AC-15 — each attachment
           state is presented distinctly; currently "No attachments" covers the
           initial state.) */}
      <section className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h5 mb-0">Attachments</h3>
          </div>
          {detail.attachments.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {detail.attachments.map((a) => (
                    <AttachmentRow key={a.id} a={a} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}