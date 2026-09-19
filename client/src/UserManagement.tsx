import { useEffect, useState } from "react";
import {
  ApiError,
  createAdminUser,
  fetchAdminUsers,
  setAdminInitialPassword,
  updateAdminUser,
  type AdminUser,
  type AuthUser,
  type Role,
} from "./api.js";

// Issue 23 — Administrator User Management (ui-spec.md §7, labs-sheet §8.5).
// One screen: user list (Name, Email, Role, Status, Edit) + name/email search +
// optional role filter + create/edit panel + set-new-initial-password with
// safety feedback (AC-18..AC-22, AC-24). The server enforces Administrator-only
// access regardless of what the UI shows.

const ROLE_LABELS: Record<Role, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMIN: "Administrator",
};

const ROLE_BADGE: Record<Role, string> = {
  REQUESTER: "badge-role-requester",
  IT_STAFF: "badge-role-staff",
  ADMIN: "badge-role-admin",
};

const ROLES: Role[] = ["REQUESTER", "IT_STAFF", "ADMIN"];

type ListStatus = "loading" | "ready" | "failure";
type PanelState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; target: AdminUser };

interface FormState {
  name: string;
  email: string;
  role: Role;
  active: boolean;
  initialPassword: string;
}

interface Props {
  user: AuthUser;
  onSelfUpdated?: (user: AuthUser) => void;
}

function describeError(
  err: unknown,
  fallback: string
): { message: string; fields?: Record<string, string> } {
  if (err instanceof ApiError) return { message: err.message || fallback, fields: err.fields };
  return { message: fallback };
}

function RoleBadge({ role }: { role: Role }) {
  return <span className={`badge ${ROLE_BADGE[role]}`}>{ROLE_LABELS[role]}</span>;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? "badge-account-active" : "badge-account-inactive"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function UserManagement({ user, onSelfUpdated }: Props) {
  const [listStatus, setListStatus] = useState<ListStatus>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [query, setQuery] = useState<{ search?: string; role?: Role }>({});

  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    role: "REQUESTER",
    active: true,
    initialPassword: "",
  });
  const [formError, setFormError] = useState<{ message: string; fields?: Record<string, string> } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setListStatus("loading");
    fetchAdminUsers(query)
      .then((res) => {
        if (cancelled) return;
        setUsers(res.items);
        setListStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setListStatus("failure");
      });
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey]);

  const hasFilters = (query.search ?? "") !== "" || (query.role ?? "") !== "";

  function openCreate() {
    setForm({ name: "", email: "", role: "REQUESTER", active: true, initialPassword: "" });
    setFormError(null);
    setNotice(null);
    setPanel({ mode: "create" });
  }

  function openEdit(target: AdminUser) {
    setForm({
      name: target.name,
      email: target.email,
      role: target.role,
      active: target.active,
      initialPassword: "",
    });
    setFormError(null);
    setNotice(null);
    setNewPassword("");
    setPwError(null);
    setPanel({ mode: "edit", target });
  }

  function closePanel() {
    setPanel({ mode: "closed" });
    setFormError(null);
    setPwError(null);
    setNewPassword("");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery({ search: searchInput.trim() || undefined, role: roleFilter || undefined });
  }

  function handleReset() {
    setSearchInput("");
    setRoleFilter("");
    setQuery({});
  }

  function refreshSelfIfNeeded(updated: AdminUser) {
    if (updated.id !== user.id) return;
    onSelfUpdated?.({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      requiresPasswordChange: updated.requiresPasswordChange,
    });
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await createAdminUser({
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
        initialPassword: form.initialPassword,
      });
      setNotice(
        `User "${created.name}" created. They must change the initial password at next login.`
      );
      setPanel({ mode: "closed" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(describeError(err, "Unable to create the user."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (panel.mode !== "edit") return;
    setFormError(null);
    setSubmitting(true);
    try {
      const updated = await updateAdminUser(panel.target.id, {
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
      });
      refreshSelfIfNeeded(updated);
      setNotice(`User "${updated.name}" updated.`);
      setPanel({ mode: "closed" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(describeError(err, "Unable to update the user."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitInitialPassword(e: React.FormEvent) {
    e.preventDefault();
    if (panel.mode !== "edit") return;
    setPwError(null);
    setPwSubmitting(true);
    try {
      const result = await setAdminInitialPassword(panel.target.id, newPassword);
      setNewPassword("");
      setNotice(
        `A new initial password was set for "${result.name}". It must be changed at next login.`
      );
    } catch (err) {
      const described = describeError(err, "Unable to set the initial password.");
      setPwError(described.fields?.newInitialPassword ?? described.message);
    } finally {
      setPwSubmitting(false);
    }
  }

  const fieldError = (name: string) => formError?.fields?.[name];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 id="user-management-heading" className="h4 mb-0">
          User Management
        </h2>
        <button type="button" className="btn btn-tok-primary" onClick={openCreate}>
          Create user
        </button>
      </div>

      {notice && (
        <div className="alert callout-success" role="status">
          {notice}
        </div>
      )}

      {listStatus === "loading" && <p className="text-secondary">Loading users…</p>}

      {listStatus === "failure" && (
        <div className="alert alert-danger" role="alert">
          Unable to load users. Please try again later.
        </div>
      )}

      {listStatus === "ready" && (
        <>
          <form
            className="row g-2 mb-3 align-items-end"
            onSubmit={handleSearch}
            aria-label="User search and filters"
          >
            <div className="col-md-5">
              <label htmlFor="user-search" className="form-label">
                Search
              </label>
              <input
                id="user-search"
                className="form-control"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name or email"
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="user-role-filter" className="form-label">
                Role
              </label>
              <select
                id="user-role-filter"
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as Role | "")}
              >
                <option value="">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4 d-flex gap-2">
              <button type="submit" className="btn btn-secondary flex-grow-1">
                Search
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
                Reset
              </button>
            </div>
          </form>

          {users.length === 0 && !hasFilters && (
            <div className="alert alert-secondary" role="status">
              No users found.
            </div>
          )}

          {users.length === 0 && hasFilters && (
            <div className="alert alert-warning" role="status">
              No users match your search and filters. Try adjusting them.
            </div>
          )}

          {users.length > 0 && (
            <>
              <p className="text-muted small mb-2">
                {users.length} user{users.length === 1 ? "" : "s"}
                {hasFilters ? " (filtered)" : ""}
              </p>

              {/* Desktop table — Name, Email, Role, Status, Edit (ui-spec §7). */}
              <div className="table-responsive d-none d-md-block">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Role</th>
                      <th scope="col">Status</th>
                      <th scope="col">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.name}
                          {u.id === user.id && <span className="text-muted small"> (you)</span>}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <RoleBadge role={u.role} />
                        </td>
                        <td>
                          <StatusBadge active={u.active} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-tok-primary"
                            onClick={() => openEdit(u)}
                            aria-label={`Edit user ${u.name}`}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Smaller-screen card representation (no horizontal scroll, AC-23). */}
              <ul className="list-unstyled d-md-none">
                {users.map((u) => (
                  <li key={u.id} className="card mb-2">
                    <div className="card-body py-2">
                      <div className="fw-semibold">
                        {u.name}
                        {u.id === user.id && <span className="text-muted small"> (you)</span>}
                      </div>
                      <div className="small text-muted mb-2">{u.email}</div>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <RoleBadge role={u.role} />
                        <StatusBadge active={u.active} />
                        <button
                          type="button"
                          className="btn btn-sm btn-tok-primary ms-auto"
                          onClick={() => openEdit(u)}
                          aria-label={`Edit user ${u.name}`}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {panel.mode !== "closed" && (
            <section
              className="card app-card mt-4"
              aria-label={panel.mode === "create" ? "Create user" : "Edit user"}
            >
              <div className="card-body">
                <h3 className="h5">
                  {panel.mode === "create" ? "Create user" : `Edit ${panel.target.name}`}
                </h3>

                {formError && (
                  <div className="alert alert-danger" role="alert">
                    <div>{formError.message}</div>
                    {formError.fields && (
                      <ul className="mb-0 mt-1 small">
                        {Object.entries(formError.fields).map(([field, msg]) => (
                          <li key={field}>
                            <strong>{field}</strong>: {msg}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <form onSubmit={panel.mode === "create" ? submitCreate : submitEdit} noValidate>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="user-name" className="form-label">
                        Name
                      </label>
                      <input
                        id="user-name"
                        className={`form-control ${fieldError("name") ? "is-invalid" : ""}`}
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      {fieldError("name") && (
                        <div className="invalid-feedback">{fieldError("name")}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="user-email" className="form-label">
                        Email
                      </label>
                      <input
                        id="user-email"
                        type="email"
                        className={`form-control ${fieldError("email") ? "is-invalid" : ""}`}
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                      {fieldError("email") && (
                        <div className="invalid-feedback">{fieldError("email")}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="user-role" className="form-label">
                        Role
                      </label>
                      <select
                        id="user-role"
                        className="form-select"
                        value={form.role}
                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      {fieldError("role") && (
                        <div className="text-tok-error small">{fieldError("role")}</div>
                      )}
                    </div>
                    <div className="col-md-6 d-flex align-items-end">
                      <div className="form-check">
                        <input
                          id="user-active"
                          type="checkbox"
                          className="form-check-input"
                          checked={form.active}
                          onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                        />
                        <label htmlFor="user-active" className="form-check-label">
                          Active (account can sign in)
                        </label>
                      </div>
                    </div>

                    {panel.mode === "create" && (
                      <div className="col-md-6">
                        <label htmlFor="user-initial-password" className="form-label">
                          Initial password
                        </label>
                        <input
                          id="user-initial-password"
                          type="password"
                          className={`form-control ${
                            fieldError("initialPassword") ? "is-invalid" : ""
                          }`}
                          value={form.initialPassword}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, initialPassword: e.target.value }))
                          }
                        />
                        {fieldError("initialPassword") && (
                          <div className="invalid-feedback">{fieldError("initialPassword")}</div>
                        )}
                        <div className="form-text">
                          At least 8 characters with upper case, lower case and a digit. The user
                          must change it at next login.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2 mt-3">
                    <button type="submit" className="btn btn-tok-primary" disabled={submitting}>
                      {submitting
                        ? "Saving…"
                        : panel.mode === "create"
                          ? "Create user"
                          : "Save changes"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closePanel}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {panel.mode === "edit" && (
                  <form className="border-top mt-4 pt-3" onSubmit={submitInitialPassword} noValidate>
                    <h4 className="h6">Set new initial password</h4>
                    <p className="text-muted small mb-2">
                      Ends the current password and requires a change at the next login.
                    </p>
                    <div className="row g-2 align-items-end">
                      <div className="col-md-6">
                        <label htmlFor="user-new-initial-password" className="form-label">
                          New initial password
                        </label>
                        <input
                          id="user-new-initial-password"
                          type="password"
                          className={`form-control ${pwError ? "is-invalid" : ""}`}
                          aria-invalid={pwError ? true : undefined}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        {pwError && (
                          <div className="invalid-feedback d-block" role="alert">
                            {pwError}
                          </div>
                        )}
                        <div className="form-text">
                          At least 8 characters with upper case, lower case and a digit.
                        </div>
                      </div>
                      <div className="col-md-6">
                        <button type="submit" className="btn btn-tok-secondary" disabled={pwSubmitting}>
                          {pwSubmitting ? "Setting…" : "Set new initial password"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
