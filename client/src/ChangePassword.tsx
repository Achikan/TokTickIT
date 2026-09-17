import { FormEvent, useState } from "react";
import { ApiError, changePassword, type AuthUser } from "./api.js";

// Lab 3 (Issue 19) — Mandatory change-password screen (ui-spec.md §3.2, AC-02/AC-07).
// Mirrors the server policy (api-spec.md §1.4) so failures appear near the field.
const POLICY_SUMMARY =
  "At least 8 characters, including one lowercase letter, one uppercase letter, one digit and one special character.";

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

function policyError(password: string): string | null {
  if (password === "") return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one digit.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character.";
  return null;
}

export default function ChangePassword({
  user,
  onChanged,
}: {
  user: AuthUser;
  onChanged: (user: AuthUser) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (currentPassword === "") errors.currentPassword = "Current password is required.";

    const strength = policyError(newPassword);
    if (strength) {
      errors.newPassword = strength;
    } else if (newPassword === currentPassword) {
      errors.newPassword = "New password must be different from the current password.";
    }

    if (confirmPassword === "") errors.confirmPassword = "Please confirm the new password.";
    else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
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
      const updated = await changePassword(currentPassword, newPassword, confirmPassword);
      onChanged(updated);
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setFieldErrors(error.fields as FieldErrors);
      } else if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
        setFieldErrors({ currentPassword: "Current password is incorrect." });
      } else {
        setFailure("Unable to change password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center py-5"
      style={{ minHeight: "100vh", background: "var(--tok-primary)" }}
    >
      <div className="app-card p-4 p-md-5 w-100" style={{ maxWidth: 460 }}>
        <h1 className="h4 mb-1">Change your password</h1>
        <p className="text-muted mb-4">
          For security, you must set a new password before continuing, {user.name}.
        </p>

        {failure && (
          <div className="alert alert-danger" role="alert">
            {failure}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="current-password" className="form-label">
              Current Password <span className="text-tok-error" aria-hidden="true">*</span>
            </label>
            <input
              id="current-password"
              type="password"
              className={`form-control ${fieldErrors.currentPassword ? "is-invalid" : ""}`}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={fieldErrors.currentPassword ? true : undefined}
              aria-describedby={fieldErrors.currentPassword ? "current-password-error" : undefined}
            />
            {fieldErrors.currentPassword && (
              <p id="current-password-error" className="text-tok-error small mb-0">
                {fieldErrors.currentPassword}
              </p>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="new-password" className="form-label">
              New Password <span className="text-tok-error" aria-hidden="true">*</span>
            </label>
            <input
              id="new-password"
              type="password"
              className={`form-control ${fieldErrors.newPassword ? "is-invalid" : ""}`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={fieldErrors.newPassword ? true : undefined}
              aria-describedby={`new-password-hint${fieldErrors.newPassword ? " new-password-error" : ""}`}
            />
            <p id="new-password-hint" className="form-text mb-0">
              {POLICY_SUMMARY}
            </p>
            {fieldErrors.newPassword && (
              <p id="new-password-error" className="text-tok-error small mb-0">
                {fieldErrors.newPassword}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="confirm-password" className="form-label">
              Confirm New Password <span className="text-tok-error" aria-hidden="true">*</span>
            </label>
            <input
              id="confirm-password"
              type="password"
              className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={fieldErrors.confirmPassword ? true : undefined}
              aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
            />
            {fieldErrors.confirmPassword && (
              <p id="confirm-password-error" className="text-tok-error small mb-0">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-tok-primary w-100" disabled={submitting}>
            {submitting ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
