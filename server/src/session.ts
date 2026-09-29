import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import type { Role, User } from "@prisma/client";
import { getPrisma } from "./prisma.js";

// ---------------------------------------------------------------------------
// Lab 3 (Issue 18) — session + password primitives shared by the auth routes
// and the authorization middleware (api-spec.md §0).
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "tok_session";
// Sessions expire after 12 hours of inactivity (api-spec.md §0).
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  requiresPasswordChange: boolean;
}

export function toPublicUser(user: Pick<User, "id" | "name" | "email" | "role" | "requiresPasswordChange">): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    requiresPasswordChange: user.requiresPasswordChange,
  };
}

export function sessionCookieOptions(maxAgeMs: number = SESSION_TTL_MS) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(0));
}

export function readSessionToken(req: Request): string | null {
  const token = (req as Request & { cookies?: Record<string, unknown> }).cookies?.[SESSION_COOKIE];
  return typeof token === "string" && token !== "" ? token : null;
}

function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Password policy (api-spec.md §1.4): min 8 chars with at least one lowercase
// letter, one uppercase letter, one digit and one special character. Returns a
// field message, or null when the password is acceptable.
export function passwordPolicyError(password: unknown): string | null {
  if (typeof password !== "string" || password.length === 0) {
    return "Password is required.";
  }
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one digit.";
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character.";
  }
  return null;
}

export interface ActiveSession {
  id: string;
  userId: number;
  expiresAt: Date;
  user: User;
}

// Finds a non-expired session plus its user. Expired rows are deleted so the
// token can never be reused.
export async function findValidSession(token: string): Promise<ActiveSession | null> {
  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { id: session.id, userId: session.userId, expiresAt: session.expiresAt, user: session.user };
}

export async function createSession(userId: number): Promise<string> {
  const token = newToken();
  await getPrisma().session.create({
    data: { id: token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await getPrisma().session.delete({ where: { id: token } }).catch(() => undefined);
}

// Sliding expiry: refresh the idle window on activity, but skip the write when
// the session is still comfortably fresh to avoid a query on every request.
const TOUCH_THRESHOLD_MS = 60 * 1000;

export async function touchSession(session: ActiveSession): Promise<void> {
  if (session.expiresAt.getTime() - Date.now() > SESSION_TTL_MS - TOUCH_THRESHOLD_MS) return;
  await getPrisma()
    .session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) } })
    .catch(() => undefined);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
