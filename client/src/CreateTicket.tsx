import { useEffect, useState } from "react";
import {
  Category,
  RelatedSystem,
  DevelopmentRequester,
  Priority,
  Ticket,
  createTicket,
  fetchCategories,
  fetchRelatedSystems,
} from "./api.js";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface Props {
  requester: DevelopmentRequester;
  onViewTickets?: () => void;
}

type FormState = "idle" | "loading" | "submitting" | "success" | "failure";

export default function CreateTicket({ requester, onViewTickets }: Props) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [fieldsError, setFieldsError] = useState<Record<string, string>>({});

  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState<Priority>("MEDIUM");
  const [created, setCreated] = useState<Ticket | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCategories(), fetchRelatedSystems()])
      .then(([cats, systems]) => {
        if (cancelled) return;
        setCategories(cats);
        setRelatedSystems(systems);
        setFormState(cats.length === 0 && systems.length === 0 ? "failure" : "idle");
      })
      .catch(() => {
        if (!cancelled) setFormState("failure");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (summary.trim() === "") local.summary = "Summary is required.";
    if (description.trim() === "") local.description = "Description is required.";
    if (categoryId === "") local.categoryId = "Category is required.";
    if (relatedSystemId === "") local.relatedSystemId = "Related System is required.";
    setFieldsError(local);
    if (Object.keys(local).length > 0) return;

    setFormState("submitting");
    setFieldsError({});
    try {
      const ticket = await createTicket({
        requesterId: requester.id,
        summary: summary.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requestedPriority,
      });
      setCreated(ticket);
      setFormState("success");
    } catch (err) {
      const e = err as Error & { fields?: Record<string, string> };
      setFieldsError(e.fields ?? {});
      setFormState("failure");
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h2 className="h4 mb-3">Create Ticket</h2>

      {formState === "loading" && <p className="text-secondary">Loading…</p>}

      {formState === "failure" && Object.keys(fieldsError).length === 0 && (
        <p className="text-danger">
          Unable to load reference data. Please try again later.
        </p>
      )}

      {formState === "success" && created && (
        <div className="alert alert-success d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <strong>Ticket created.</strong> Official Ticket Number:
            <span className="fw-bold"> {created.ticketNumber}</span>
          </div>
          {onViewTickets && (
            <button
              type="button"
              className="btn btn-tok-secondary btn-sm"
              onClick={onViewTickets}
            >
              View in My Tickets
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={formState === "submitting"}>
          {/* System-generated read-only values */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <label htmlFor="ticket-system" className="form-label">
                Ticket Number
              </label>
              <input
                id="ticket-system"
                className="form-control readonly-field"
                value="Generated on submission"
                readOnly
              />
            </div>
            <div className="col-6">
              <label htmlFor="ticket-status-system" className="form-label">
                Current Status
              </label>
              <input
                id="ticket-status-system"
                className="form-control readonly-field"
                value="SUBMITTED"
                readOnly
              />
            </div>
          </div>

          {/* Requester (read-only, from selection) */}
          <div className="mb-3">
            <label htmlFor="requester-readonly" className="form-label">
              Development Requester
            </label>
            <input
              id="requester-readonly"
              className="form-control readonly-field"
              value={`${requester.name} (${requester.email})`}
              readOnly
            />
          </div>

          {/* Classification fields */}
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label htmlFor="categoryId" className="form-label">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="categoryId"
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldsError.categoryId && (
                <small className="text-danger d-block">{fieldsError.categoryId}</small>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="relatedSystemId" className="form-label">
                Related System <span className="text-danger">*</span>
              </label>
              <select
                id="relatedSystemId"
                className="form-select"
                value={relatedSystemId}
                onChange={(e) => setRelatedSystemId(e.target.value)}
              >
                <option value="">Select…</option>
                {relatedSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {fieldsError.relatedSystemId && (
                <small className="text-danger d-block">{fieldsError.relatedSystemId}</small>
              )}
            </div>
            <div className="col-md-4">
              <label htmlFor="requestedPriority" className="form-label">
                Requested Priority
              </label>
              <select
                id="requestedPriority"
                className="form-select"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value as Priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {fieldsError.requestedPriority && (
                <small className="text-danger d-block">{fieldsError.requestedPriority}</small>
              )}
            </div>
          </div>

          {/* Summary and Description */}
          <div className="mb-3">
            <label htmlFor="summary" className="form-label">
              Summary <span className="text-danger">*</span>
            </label>
            <input
              id="summary"
              className={`form-control ${fieldsError.summary ? "is-invalid" : ""}`}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of the issue"
            />
            {fieldsError.summary && (
              <small className="text-danger d-block">{fieldsError.summary}</small>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="description" className="form-label">
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              id="description"
              className={`form-control ${fieldsError.description ? "is-invalid" : ""}`}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail"
            />
            {fieldsError.description && (
              <small className="text-danger d-block">{fieldsError.description}</small>
            )}
          </div>
        </fieldset>

        {formState === "failure" && Object.keys(fieldsError).length > 0 && (
          <p className="text-danger">Please correct the highlighted fields and try again.</p>
        )}
        {formState === "failure" && Object.keys(fieldsError).length === 0 && (
          <p className="text-danger">
            Unable to create the ticket. Your entered values were preserved; please try again.
          </p>
        )}

        <button
          type="submit"
          className="btn btn-tok-primary"
          disabled={formState === "submitting"}
        >
          {formState === "submitting" ? "Submitting…" : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}