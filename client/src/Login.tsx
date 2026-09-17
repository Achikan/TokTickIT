import { FormEvent, useState } from "react";
import { ApiError, login, type AuthUser } from "./api.js";

// Lab 3 (Issue 19) — Login screen (ui-spec.md §3.1, AC-01/AC-05/AC-06).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const trimmed = email.trim();
    if (trimmed === "") errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(trimmed)) errors.email = "Enter a valid email address.";
    if (password === "") errors.password = "Password is required.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors = validate();
    setFieldErrors(errors);
    setFailure(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      onAuthenticated(user);
    } catch (error) {
      // Inactive accounts get a clear, safe message (ui-spec.md §3.1); all other
      // failures stay generic so account details are never exposed (AC-05).
      setFailure(
        error instanceof ApiError && error.code === "ACCOUNT_INACTIVE"
          ? error.message
          : "Invalid email or password."
      );
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center py-5"
      style={{ minHeight: "100vh", background: "var(--tok-primary)" }}
    >
      <div className="app-card p-4 p-md-5 w-100" style={{ maxWidth: 420 }}>
        <h1 className="h4 mb-1">
          TokTickIT <span className="text-success">IT Service Desk</span>
        </h1>
        <p className="text-muted mb-4">Sign in to continue.</p>

        {failure && (
          <div className="alert alert-danger" role="alert">
            {failure}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="login-email" className="form-label">
              Email <span className="text-tok-error" aria-hidden="true">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="login-email-error" className="text-tok-error small mb-0">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="login-password" className="form-label">
              Password <span className="text-tok-error" aria-hidden="true">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            />
            {fieldErrors.password && (
              <p id="login-password-error" className="text-tok-error small mb-0">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-tok-primary w-100" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
