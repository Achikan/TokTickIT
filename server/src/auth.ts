import { Router, type Request, type Response } from "express";
import { getPrisma } from "./prisma.js";
import { requireAuth } from "./middleware.js";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  passwordPolicyError,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
} from "./session.js";

// ---------------------------------------------------------------------------
// Lab 3 (Issue 18) — Authentication API (api-spec.md §1).
//   POST /api/auth/login
//   POST /api/auth/logout
//   GET  /api/auth/me
//   POST /api/auth/change-password
// ---------------------------------------------------------------------------

export const authRouter = Router();

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

// POST /api/auth/login (AC-01, AC-05, AC-06)
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  const fields: Record<string, string> = {};
  const normalized = typeof email === "string" ? normalizeEmail(email) : "";
  if (normalized === "") fields.email = "Email is required.";
  else if (!isValidEmail(normalized)) fields.email = "Enter a valid email address.";
  if (typeof password !== "string" || password === "") fields.password = "Password is required.";

  if (Object.keys(fields).length > 0) {
    return res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    // Wrong email and wrong password return the same safe error (no enumeration).
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res
        .status(401)
        .json({ error: { code: "UNAUTHORIZED", message: GENERIC_LOGIN_ERROR } });
    }

    // Credentials are valid but the account is disabled: clear, non-disclosing.
    if (!user.active) {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This account is not active. Contact an administrator.",
        },
      });
    }

    const token = await createSession(user.id);
    setSessionCookie(res, token);
    return res.status(200).json({ user: toPublicUser(user) });
  } catch {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Unable to sign in." } });
  }
});

// POST /api/auth/logout (AC-08, BR-04)
authRouter.post("/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.sessionId) await deleteSession(req.sessionId);
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  } catch {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Unable to sign out." } });
  }
});

// GET /api/auth/me (AC-01, FR-03)
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  return res.status(200).json({ user: req.user });
});

// POST /api/auth/change-password (AC-02, AC-07, BR-03)
authRouter.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

  const fields: Record<string, string> = {};
  if (typeof currentPassword !== "string" || currentPassword === "") {
    fields.currentPassword = "Current password is required.";
  }
  const policyError = passwordPolicyError(newPassword);
  if (policyError) fields.newPassword = policyError;
  if (typeof confirmPassword !== "string" || confirmPassword === "") {
    fields.confirmPassword = "Please confirm the new password.";
  } else if (newPassword !== confirmPassword) {
    fields.confirmPassword = "Passwords do not match.";
  }
  if (
    typeof newPassword === "string" &&
    typeof currentPassword === "string" &&
    newPassword !== "" &&
    newPassword === currentPassword
  ) {
    fields.newPassword = "New password must be different from the current password.";
  }

  if (Object.keys(fields).length > 0) {
    return res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return res
        .status(401)
        .json({ error: { code: "UNAUTHORIZED", message: "Current password is incorrect." } });
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, requiresPasswordChange: false },
    });

    return res.status(200).json({ user: toPublicUser(updated) });
  } catch {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Unable to change password." } });
  }
});
