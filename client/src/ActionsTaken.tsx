import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  type Role,
  type TicketAction,
  type TicketActionInput,
  type TicketActionTicketSummary,
  createTicketAction,
  updateTicketAction,
} from "./api.js";

// Lab 4 Issue 31 — Actions Taken on Ticket Detail (ui-spec.md §5, lab sheet §8.3,
// FR-01..FR-08). The existing Ticket Detail screens gain an "Actions Taken" area
// with a list/table, create mode and view/edit mode for IT Staff/Administrators,
// and the same list rendered read-only for Requesters on owned Tickets.

const MAX_CHARS = 2000;

const ROLE_LABELS: Record<Role, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMIN: "Administrator",
};

const DESCRIPTION_REQUIRED_MESSAGE = "Action Description is required.";
const FOLLOWUP_REQUIRED_MESSAGE = "A follow-up note is required when follow-up is needed.";
const DUPLICATE_MESSAGE = "An identical action was just recorded.";
const STALE_MESSAGE =
  "This action was changed by someone else. Reload the actions and try again.";
const SAFE_FAILURE_MESSAGE = "Unable to save the action. Please try again.";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Compact `YYYY-MM-DD HH:mm` for the table/cards, inside a semantic <time>.
function compactDateTime(v: string): string {
  const d = new Date(v);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

// `datetime-local` uses local wall-clock time: format both directions by hand so
// the value round-trips without a timezone shift.
function toLocalInput(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

// BR-07: newest Action Date/Time first, ties broken by id descending. Creating a
// backdated Action must slot it into this order, not simply prepend it.
export function sortActionsNewestFirst(list: TicketAction[]): TicketAction[] {
  return [...list].sort((a, b) => {
    const diff = new Date(b.actionDateTime).getTime() - new Date(a.actionDateTime).getTime();
    return Number.isNaN(diff) || diff === 0 ? b.id - a.id : diff;
  });
}

function PerformedBy({ action }: { action: TicketAction }) {
  return (
    <span>
      {action.performedBy.name}{" "}
      <span className="text-muted small">({roleLabel(action.performedBy.role)})</span>
    </span>
  );
}

// Follow-Up cue: neutral pill + a non-colour cue (❗ icon and the literal word),
// absence shown as plain "No" — never colour alone (ui-spec §2).
function FollowUpCue({ required }: { required: boolean }) {
  if (!required) return <span className="text-muted">No</span>;
  return (
    <span className="badge badge-followup" title="Follow-up required">
      <span aria-hidden="true">❗</span> Follow-up
    </span>
  );
}

function TextCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted">—</span>;
  return (
    <span className="actions-cell-clamp" title={value}>
      {value}
    </span>
  );
}

interface ActionFormValues {
  actionDateTime: string;
  actionDescription: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

function initialValues(action: TicketAction | null): ActionFormValues {
  if (!action) {
    return {
      actionDateTime: toLocalInput(new Date()),
      actionDescription: "",
      result: "",
      followUpRequired: false,
      followUpNote: "",
      attachmentNotes: "",
    };
  }
  return {
    actionDateTime: toLocalInput(action.actionDateTime),
    actionDescription: action.actionDescription,
    result: action.result ?? "",
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote ?? "",
    attachmentNotes: action.attachmentNotes ?? "",
  };
}

// Mirror the server's BR-05 / BR-06 rules so the user is warned near-field before
// the request; the backend remains the authority.
function validate(values: ActionFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const description = values.actionDescription.trim();
  if (description === "") errors.actionDescription = DESCRIPTION_REQUIRED_MESSAGE;
  else if (description.length > MAX_CHARS)
    errors.actionDescription = `Action Description must be ${MAX_CHARS} characters or fewer.`;

  if (values.actionDateTime.trim() === "") {
    errors.actionDateTime = "Action Date/Time is required.";
  } else if (Number.isNaN(new Date(values.actionDateTime).getTime())) {
    errors.actionDateTime = "Action Date/Time is invalid.";
  }

  if (values.result.trim().length > MAX_CHARS)
    errors.result = `Result must be ${MAX_CHARS} characters or fewer.`;
  if (values.attachmentNotes.trim().length > MAX_CHARS)
    errors.attachmentNotes = `Attachment Notes must be ${MAX_CHARS} characters or fewer.`;

  const note = values.followUpNote.trim();
  if (values.followUpRequired && note === "") {
    errors.followUpNote = FOLLOWUP_REQUIRED_MESSAGE;
  } else if (note.length > MAX_CHARS) {
    errors.followUpNote = `Follow-up Note must be ${MAX_CHARS} characters or fewer.`;
  }

  return errors;
}

// Inline create/edit panel (never a modal — ui-spec §5.2). Values live in local
// state and the panel stays mounted on recoverable failures, so nothing the user
// typed is lost (FR-22/AC-17).
function ActionForm({
  action,
  performerName,
  busy,
  serverFieldErrors,
  error,
  staleConflict,
  minDateTime,
  maxDateTime,
  onReload,
  onSubmit,
  onCancel,
}: {
  action: TicketAction | null;
  performerName: string;
  busy: boolean;
  serverFieldErrors: Record<string, string>;
  error: string | null;
  staleConflict: boolean;
  // D-6 bounds: [Ticket.createdAt − 30 days, now + 24 hours], applied to the
  // datetime-local control so the browser guides valid entry (server is authority).
  minDateTime?: string;
  maxDateTime?: string;
  onReload: () => void;
  onSubmit: (input: TicketActionInput, expectedUpdatedAt?: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ActionFormValues>(() => initialValues(action));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const dateRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  function focusFirstInvalid(errors: Record<string, string>) {
    if (errors.actionDescription) descriptionRef.current?.focus();
    else if (errors.followUpNote) noteRef.current?.focus();
    else if (errors.result) resultRef.current?.focus();
    else if (errors.attachmentNotes) attachmentRef.current?.focus();
    else if (errors.actionDateTime) dateRef.current?.focus();
  }

  // Server-side field errors (e.g. D-6 date bounds) also move focus to the first
  // offending control.
  useEffect(() => {
    if (Object.keys(serverFieldErrors).length > 0) focusFirstInvalid(serverFieldErrors);
    // focusFirstInvalid is stable enough for this effect; re-run only on new errors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverFieldErrors]);

  const errorFor = (name: string): string | undefined =>
    localErrors[name] ?? serverFieldErrors[name];

  function setValue<K extends keyof ActionFormValues>(name: K, value: ActionFormValues[K]) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validate(values);
    setLocalErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(errors);
      return;
    }

    const description = values.actionDescription.trim();
    const result = values.result.trim();
    const attachmentNotes = values.attachmentNotes.trim();
    const followUpNote = values.followUpNote.trim();

    const input: TicketActionInput = {
      actionDateTime: values.actionDateTime
        ? new Date(values.actionDateTime).toISOString()
        : undefined,
      actionDescription: description,
      result: result === "" ? null : result,
      followUpRequired: values.followUpRequired,
      followUpNote: values.followUpRequired ? followUpNote : null,
      attachmentNotes: attachmentNotes === "" ? null : attachmentNotes,
    };
    onSubmit(input, action ? action.updatedAt : undefined);
  }

  const describedBy = (name: string) => `action-${name}-error`;

  return (
    <form
      className="action-form border rounded p-3 mb-3"
      aria-label={action ? "Edit action" : "Add action"}
      noValidate
      onSubmit={handleSubmit}
    >
      <h4 className="h6 mb-3">{action ? "Edit action" : "Add action"}</h4>

      {error && (
        <div className="callout-warning px-2 py-1 small mb-3" role="alert">
          {error}
        </div>
      )}

      {staleConflict && (
        <div className="callout-warning px-3 py-2 small mb-3" role="status">
          <span>{STALE_MESSAGE}</span>{" "}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm ms-1"
            onClick={onReload}
          >
            Reload actions
          </button>
        </div>
      )}

      {/* Performed By is automatic from the session (FR-05) — never an input. */}
      <p className="readonly-field px-2 py-1 rounded small mb-3" data-testid="action-performer-note">
        Recorded as: <strong>{performerName}</strong> (automatic)
      </p>

      <div className="mb-3">
        <label htmlFor="action-actionDateTime" className="form-label">
          Action Date/Time
        </label>
        <input
          ref={dateRef}
          id="action-actionDateTime"
          type="datetime-local"
          className={`form-control ${errorFor("actionDateTime") ? "is-invalid" : ""}`}
          value={values.actionDateTime}
          min={minDateTime}
          max={maxDateTime}
          aria-describedby={errorFor("actionDateTime") ? describedBy("actionDateTime") : undefined}
          onChange={(e) => setValue("actionDateTime", e.target.value)}
        />
        {errorFor("actionDateTime") && (
          <small id={describedBy("actionDateTime")} className="text-danger d-block mt-1">
            {errorFor("actionDateTime")}
          </small>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="action-actionDescription" className="form-label">
          Action Description
        </label>
        <textarea
          ref={descriptionRef}
          id="action-actionDescription"
          className={`form-control ${errorFor("actionDescription") ? "is-invalid" : ""}`}
          rows={3}
          maxLength={MAX_CHARS}
          value={values.actionDescription}
          aria-describedby={
            errorFor("actionDescription") ? describedBy("actionDescription") : undefined
          }
          onChange={(e) => setValue("actionDescription", e.target.value)}
        />
        {errorFor("actionDescription") && (
          <small id={describedBy("actionDescription")} className="text-danger d-block mt-1">
            {errorFor("actionDescription")}
          </small>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="action-result" className="form-label">
          Result
        </label>
        <textarea
          ref={resultRef}
          id="action-result"
          className={`form-control ${errorFor("result") ? "is-invalid" : ""}`}
          rows={2}
          maxLength={MAX_CHARS}
          value={values.result}
          aria-describedby={errorFor("result") ? describedBy("result") : undefined}
          onChange={(e) => setValue("result", e.target.value)}
        />
        {errorFor("result") && (
          <small id={describedBy("result")} className="text-danger d-block mt-1">
            {errorFor("result")}
          </small>
        )}
      </div>

      <div className="form-check mb-3">
        <input
          id="action-followUpRequired"
          type="checkbox"
          className="form-check-input"
          checked={values.followUpRequired}
          onChange={(e) => setValue("followUpRequired", e.target.checked)}
        />
        <label className="form-check-label" htmlFor="action-followUpRequired">
          Follow-up needed?
        </label>
      </div>

      {/* Follow-up Note is visible and required iff the switch is on (BR-05). */}
      {values.followUpRequired && (
        <div className="mb-3">
          <label htmlFor="action-followUpNote" className="form-label">
            Follow-up Note
          </label>
          <textarea
            ref={noteRef}
            id="action-followUpNote"
            className={`form-control ${errorFor("followUpNote") ? "is-invalid" : ""}`}
            rows={2}
            maxLength={MAX_CHARS}
            value={values.followUpNote}
            aria-describedby={errorFor("followUpNote") ? describedBy("followUpNote") : undefined}
            onChange={(e) => setValue("followUpNote", e.target.value)}
          />
          {errorFor("followUpNote") && (
            <small id={describedBy("followUpNote")} className="text-danger d-block mt-1">
              {errorFor("followUpNote")}
            </small>
          )}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="action-attachmentNotes" className="form-label">
          Attachment Notes
        </label>
        <input
          ref={attachmentRef}
          id="action-attachmentNotes"
          type="text"
          className={`form-control ${errorFor("attachmentNotes") ? "is-invalid" : ""}`}
          maxLength={MAX_CHARS}
          value={values.attachmentNotes}
          aria-describedby={
            errorFor("attachmentNotes") ? describedBy("attachmentNotes") : "action-attachmentNotes-hint"
          }
          onChange={(e) => setValue("attachmentNotes", e.target.value)}
        />
        <small id="action-attachmentNotes-hint" className="form-text text-muted">
          e.g. "screenshot-battery-report.png — see tab 2"
        </small>
        {errorFor("attachmentNotes") && (
          <small id={describedBy("attachmentNotes")} className="text-danger d-block mt-1">
            {errorFor("attachmentNotes")}
          </small>
        )}
      </div>

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-tok-primary btn-sm" disabled={busy}>
          {busy ? "Saving…" : "Save Action"}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Presentational read-only rendering of one row, shared by the table and cards.
export function ActionsTakenSection({
  ticketId,
  actions,
  editable,
  performerName,
  ticketCreatedAt,
  onCreated,
  onUpdated,
  onReload,
}: {
  ticketId: number;
  actions: TicketAction[];
  editable: boolean;
  performerName: string;
  // Ticket creation time, used only to bound the Action Date/Time control (D-6).
  ticketCreatedAt?: string;
  onCreated: (action: TicketAction, ticket: TicketActionTicketSummary) => void;
  onUpdated: (action: TicketAction) => void;
  onReload: () => void;
}) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<TicketAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [staleConflict, setStaleConflict] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const minDateTime = ticketCreatedAt
    ? toLocalInput(new Date(new Date(ticketCreatedAt).getTime() - 30 * DAY_MS))
    : undefined;
  const maxDateTime = toLocalInput(new Date(Date.now() + DAY_MS));

  function finishSave() {
    setMode("list");
    setEditing(null);
    setError(null);
    setFieldErrors({});
    setStaleConflict(false);
    // Save success returns focus to the section heading (ui-spec §9).
    headingRef.current?.focus();
  }

  async function handleSubmit(input: TicketActionInput, expectedUpdatedAt?: string) {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    setStaleConflict(false);
    try {
      if (mode === "edit" && editing) {
        const updated = await updateTicketAction(ticketId, editing.id, {
          ...input,
          expectedUpdatedAt: expectedUpdatedAt ?? editing.updatedAt,
        });
        onUpdated(updated);
        finishSave();
      } else {
        const { action, ticket } = await createTicketAction(ticketId, input);
        onCreated(action, ticket);
        finishSave();
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.fields) setFieldErrors(e.fields);
        if (e.code === "DUPLICATE_ACTION") {
          // Keep the form mounted with its values so nothing is retyped.
          setError(DUPLICATE_MESSAGE);
        } else if (e.code === "STALE_UPDATE") {
          setStaleConflict(true);
        } else if (!e.fields) {
          setError(e.message || SAFE_FAILURE_MESSAGE);
        }
      } else {
        setError(SAFE_FAILURE_MESSAGE);
      }
    } finally {
      setBusy(false);
    }
  }

  function openEditFromRow(action: TicketAction) {
    setEditing(action);
    setMode("edit");
    setError(null);
    setFieldErrors({});
    setStaleConflict(false);
  }

  const formOpen = mode !== "list";

  return (
    <section className="card mb-4" aria-labelledby="actions-taken-heading">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3
            id="actions-taken-heading"
            className="h5 mb-0"
            tabIndex={-1}
            ref={headingRef}
          >
            Actions Taken
          </h3>
          {editable && !formOpen && (
            <button
              type="button"
              className="btn btn-tok-primary btn-sm"
              onClick={() => {
                setEditing(null);
                setError(null);
                setFieldErrors({});
                setStaleConflict(false);
                setMode("create");
              }}
            >
              Add Action
            </button>
          )}
        </div>

        {formOpen && (
          <ActionForm
            key={mode === "edit" && editing ? `edit-${editing.id}` : "create"}
            action={mode === "edit" ? editing : null}
            performerName={
              mode === "edit" && editing ? editing.performedBy.name : performerName
            }
            busy={busy}
            serverFieldErrors={fieldErrors}
            error={error}
            staleConflict={staleConflict}
            minDateTime={minDateTime}
            maxDateTime={maxDateTime}
            onReload={onReload}
            onSubmit={handleSubmit}
            onCancel={() => {
              setMode("list");
              setEditing(null);
              setError(null);
              setFieldErrors({});
              setStaleConflict(false);
            }}
          />
        )}

        {actions.length === 0 ? (
          <p className="text-muted mb-0" data-testid="actions-empty">
            No actions recorded yet.
          </p>
        ) : (
          <>
            {/* Desktop ≥992px: fixed-layout table, no sideways scroll (ui-spec §5.1). */}
            <div className="d-none d-lg-block">
              <table className="table table-sm align-middle actions-table mb-0" data-testid="actions-table">
                <thead>
                  <tr>
                    <th scope="col">Date/Time</th>
                    <th scope="col">Description</th>
                    <th scope="col">Result</th>
                    <th scope="col">Performed By</th>
                    <th scope="col">Follow-Up</th>
                    <th scope="col">Follow-up Note</th>
                    <th scope="col">Attachment Notes</th>
                    {editable && <th scope="col">Edit</th>}
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.id} data-testid={`action-row-${a.id}`}>
                      <td>
                        <time dateTime={a.actionDateTime}>{compactDateTime(a.actionDateTime)}</time>
                      </td>
                      <td>
                        <TextCell value={a.actionDescription} />
                      </td>
                      <td>
                        <TextCell value={a.result} />
                      </td>
                      <td>
                        <PerformedBy action={a} />
                      </td>
                      <td>
                        <FollowUpCue required={a.followUpRequired} />
                      </td>
                      <td>
                        <TextCell value={a.followUpRequired ? a.followUpNote : null} />
                      </td>
                      <td>
                        <TextCell value={a.attachmentNotes} />
                      </td>
                      {editable && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => openEditFromRow(a)}
                            aria-label={`Edit action ${a.id}`}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Below 992px: the same fields stacked as cards (ui-spec §5.1). */}
            <ul className="list-unstyled actions-cards d-lg-none mb-0" data-testid="actions-cards">
              {actions.map((a) => (
                <li key={a.id} className="border rounded p-3 mb-2">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <time dateTime={a.actionDateTime} className="fw-semibold">
                      {compactDateTime(a.actionDateTime)}
                    </time>
                    <FollowUpCue required={a.followUpRequired} />
                  </div>
                  <p className="mb-2">{a.actionDescription}</p>
                  {a.result && (
                    <p className="mb-1">
                      <span className="text-muted small">Result:</span> {a.result}
                    </p>
                  )}
                  {a.followUpRequired && a.followUpNote && (
                    <p className="mb-1">
                      <span className="text-muted small">Follow-up note:</span> {a.followUpNote}
                    </p>
                  )}
                  {a.attachmentNotes && (
                    <p className="mb-1">
                      <span className="text-muted small">Attachment notes:</span> {a.attachmentNotes}
                    </p>
                  )}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <span className="small">
                      <span className="text-muted">Performed by:</span> <PerformedBy action={a} />
                    </span>
                    {editable && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => openEditFromRow(a)}
                        aria-label={`Edit action ${a.id}`}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

export default ActionsTakenSection;
