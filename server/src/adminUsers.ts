import { Router, type Request, type Response } from "express";
import type { Prisma, Role, User } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import {
  blockPendingPasswordChange,
  requireAuth,
  requireRole,
} from "./middleware.js";
import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  passwordPolicyError,
} from "./session.js";

// ---------------------------------------------------------------------------
// Lab 3 (Issue 23) — Administrator User Management (api-spec.md §7, §8.5).
//   GET   /api/admin/users                 list + name/email search + role filter (FR-19)
//   POST  /api/admin/users                 create a user with one role (FR-20)
//   PATCH /api/admin/users/:id             edit name/email/role/activation (FR-21)
//   POST  /api/admin/users/:id/initial-password  set a new initial password (FR-22)
//
// Administrator only (AC-22): every route is guarded server-side, so a
// non-Administrator receives 403 with no data. User deletion does not exist —
// accounts are deactivated instead (BR-20).
// ---------------------------------------------------------------------------

export const adminUsersRouter = Router();

const VALID_ROLES: readonly Role[] = ["REQUESTER", "IT_STAFF", "ADMIN"];

function validationError(res: Response, fields: Record<string, string>) {
  return res
    .status(400)
    .json({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", fields } });
}

function notFound(res: Response) {
  return res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "User not found." } });
}

function conflict(res: Response, code: string, message: string) {
  return res.status(409).json({ error: { code, message } });
}

// The Administrator-facing user shape (api-spec.md §7.1). Never includes the
// password hash (BR-02).
function adminUserShape(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    requiresPasswordChange: user.requiresPasswordChange,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

// All four endpoints share the same guard chain: authenticated (401), not
// gated on an initial password (403 PASSWORD_CHANGE_REQUIRED), Administrator
// only (403).
function guard() {
  return [requireAuth, blockPendingPasswordChange, requireRole("ADMIN")] as const;
}

// ---------------------------------------------------------------------------
// GET /api/admin/users?search=&role=  (FR-19, AC-18)
// Case-insensitive search over name/email plus an optional single role filter.
// No pagination, multi-column sorting or simultaneous filters (excluded §4.2).
// ---------------------------------------------------------------------------
adminUsersRouter.get("/users", ...guard(), async (req: Request, res: Response) => {
  const fields: Record<string, string> = {};
  const valueOf = (value: unknown): string | null =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null;

  const search = valueOf(req.query.search);
  const roleRaw = valueOf(req.query.role);
  let role: Role | null = null;
  if (roleRaw !== null) {
    if (VALID_ROLES.includes(roleRaw as Role)) role = roleRaw as Role;
    else fields.role = "Role filter is invalid.";
  }

  if (Object.keys(fields).length > 0) {
    return res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: "Invalid query parameters.", fields } });
  }

  try {
    const where: Prisma.UserWhereInput = {};
    if (role !== null) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await getPrisma().user.findMany({
      where,
      orderBy: { name: "asc" },
    });

    const filtersApplied: Record<string, unknown> = {};
    if (search) filtersApplied.search = search;
    if (roleRaw !== null) filtersApplied.role = roleRaw;

    return res.status(200).json({ items: users.map(adminUserShape), filtersApplied });
  } catch {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Unable to list users." } });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users  (FR-20, AC-19)
// Creates a user with exactly one permitted role and an initial password that
// must be changed at next login (BR-16/BR-17). Duplicate email → 409 (BR-14).
// ---------------------------------------------------------------------------
adminUsersRouter.post("/users", ...guard(), async (req: Request, res: Response) => {
  const { name, email, role, active, initialPassword } = req.body ?? {};

  const fields: Record<string, string> = {};
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (trimmedName === "") fields.name = "Name is required.";

  const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";
  if (normalizedEmail === "") fields.email = "Email is required.";
  else if (!isValidEmail(normalizedEmail)) fields.email = "Enter a valid email address.";

  if (!VALID_ROLES.includes(role as Role)) fields.role = "Role is invalid.";

  let resolvedActive = true;
  if (active !== undefined) {
    if (typeof active !== "boolean") fields.active = "Activation state must be true or false.";
    else resolvedActive = active;
  }

  const policyError = passwordPolicyError(initialPassword);
  if (policyError) fields.initialPassword = policyError;

  if (Object.keys(fields).length > 0) return validationError(res, fields);

  try {
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return conflict(res, "DUPLICATE_EMAIL", "A user with this email already exists.");

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        role: role as Role,
        active: resolvedActive,
        requiresPasswordChange: true,
        passwordHash: await hashPassword(initialPassword),
      },
    });

    return res.status(201).json({ user: adminUserShape(user) });
  } catch {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Unable to create user." } });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id  (FR-21, AC-20)
// Edits name, email, role and activation state. Safety rules:
//   BR-19 — cannot remove the last active Administrator (role change or
//           deactivation); checked first so the last-admin case is explicit.
//   BR-18 — an Administrator cannot deactivate their own account.
//   BR-14 — duplicate email (case-insensitive) is rejected.
// ---------------------------------------------------------------------------
adminUsersRouter.patch("/users/:id", ...guard(), async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id === null) return notFound(res);

  const { name, email, role, active } = req.body ?? {};

  const fields: Record<string, string> = {};
  let trimmedName: string | undefined;
  if (name !== undefined) {
    trimmedName = typeof name === "string" ? name.trim() : "";
    if (trimmedName === "") fields.name = "Name is required.";
  }

  let normalizedEmail: string | undefined;
  if (email !== undefined) {
    normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";
    if (normalizedEmail === "") fields.email = "Email is required.";
    else if (!isValidEmail(normalizedEmail)) fields.email = "Enter a valid email address.";
  }

  if (role !== undefined && !VALID_ROLES.includes(role as Role)) {
    fields.role = "Role is invalid.";
  }
  if (active !== undefined && typeof active !== "boolean") {
    fields.active = "Activation state must be true or false.";
  }

  if (Object.keys(fields).length > 0) return validationError(res, fields);

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound(res);

    if (normalizedEmail !== undefined && normalizedEmail !== target.email) {
      const duplicate = await prisma.user.findFirst({
        where: { email: normalizedEmail, id: { not: id } },
      });
      if (duplicate) return conflict(res, "DUPLICATE_EMAIL", "A user with this email already exists.");
    }

    const deactivating = active === false && target.active;
    const demoting = role !== undefined && role !== "ADMIN" && target.role === "ADMIN";
    const losesActiveAdminStatus = deactivating || demoting;
    if (losesActiveAdminStatus) {
      const otherActiveAdmins = await prisma.user.count({
        where: { role: "ADMIN", active: true, id: { not: id } },
      });
      if (otherActiveAdmins === 0) {
        return conflict(
          res,
          "LAST_ADMIN",
          "The last active Administrator cannot be deactivated or have its role changed."
        );
      }
    }

    if (id === req.user!.id && active === false) {
      return conflict(res, "SELF_DEACTIVATION", "You cannot deactivate your own account.");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(trimmedName !== undefined ? { name: trimmedName } : {}),
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        ...(role !== undefined ? { role: role as Role } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    return res.status(200).json({ user: adminUserShape(updated) });
  } catch {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Unable to update user." } });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/initial-password  (FR-22, AC-20, BR-17)
// Issues a new initial password and forces a change at the next login.
// ---------------------------------------------------------------------------
adminUsersRouter.post(
  "/users/:id/initial-password",
  ...guard(),
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    if (id === null) return notFound(res);

    const { newInitialPassword } = req.body ?? {};
    const policyError = passwordPolicyError(newInitialPassword);
    if (policyError) return validationError(res, { newInitialPassword: policyError });

    try {
      const prisma = getPrisma();
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return notFound(res);

      const updated = await prisma.user.update({
        where: { id },
        data: {
          passwordHash: await hashPassword(newInitialPassword),
          requiresPasswordChange: true,
        },
      });

      return res.status(200).json({
        user: {
          id: updated.id,
          name: updated.name,
          requiresPasswordChange: updated.requiresPasswordChange,
        },
      });
    } catch {
      return res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Unable to set the initial password." } });
    }
  }
);
