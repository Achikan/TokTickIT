import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import {
  deleteSession,
  findValidSession,
  readSessionToken,
  touchSession,
} from "./session.js";

// ---------------------------------------------------------------------------
// Lab 3 (Issue 18) — server-side authorization middleware (FR-06, FR-07).
// A hidden frontend control is never a security control: every protected
// endpoint is guarded here.
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  requiresPasswordChange: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function unauthorized(res: Response) {
  return res
    .status(401)
    .json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
}

export function forbidden(res: Response, message = "You do not have permission to perform this action.") {
  return res.status(403).json({ error: { code: "FORBIDDEN", message } });
}

// CSRF mitigation (api-spec.md §0): SameSite=Strict cookie plus a required
// custom header on every mutating request. The browser can only attach this
// header from same-origin code, so cross-site form posts are rejected first.
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (req.header("X-CSRF-Protected") !== "1") {
    return forbidden(res, "Missing CSRF protection header.");
  }
  return next();
}

// Resolves the session cookie into req.user; missing/expired sessions are 401.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = readSessionToken(req);
    if (!token) return unauthorized(res);

    const session = await findValidSession(token);
    if (!session) return unauthorized(res);

    const user = session.user;
    // A deactivated account loses access immediately, even with a live session.
    if (!user.active) {
      await deleteSession(token);
      return res.status(403).json({
        error: { code: "ACCOUNT_INACTIVE", message: "This account is not active. Contact an administrator." },
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      requiresPasswordChange: user.requiresPasswordChange,
    };
    req.sessionId = token;
    await touchSession(session);
    return next();
  } catch {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Authentication failed." } });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) return forbidden(res);
    return next();
  };
}

// BR-03 / FR-04: a user with an initial password cannot use the normal
// application until the password is changed. Applied to every endpoint except
// the auth endpoints (login/logout/me/change-password).
export function blockPendingPasswordChange(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return unauthorized(res);
  if (req.user.requiresPasswordChange) {
    return res.status(403).json({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your initial password before continuing.",
      },
    });
  }
  return next();
}
