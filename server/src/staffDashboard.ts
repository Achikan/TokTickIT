import type { Request, Response } from "express";
import { getPrisma } from "./prisma.js";
import { findValidSession, readSessionToken } from "./session.js";

const ALL_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const ALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function isStaffOrAdmin(role: string) {
  return role === "IT_STAFF" || role === "ADMIN";
}

function isRecent7d(updatedAt: Date, now: Date) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - updatedAt.getTime() <= weekMs;
}

function ticketRef(t: {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  itPriority: string;
  requestedPriority: string;
  updatedAt: Date;
  ownerId: number | null;
}) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    currentStatus: t.currentStatus,
    itPriority: t.itPriority,
    requestedPriority: t.requestedPriority,
    updatedAt: t.updatedAt.toISOString(),
    ownerId: t.ownerId,
  };
}

export async function getStaffDashboard(req: Request, res: Response) {
  try {
    const token = readSessionToken(req);
    if (!token) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });

    const session = await findValidSession(token);
    if (!session) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });

    const user = session.user;
    if (!user.active) {
      return res.status(403).json({ error: { code: "ACCOUNT_INACTIVE", message: "This account is not active. Contact an administrator." } });
    }
    if (!isStaffOrAdmin(user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Forbidden." } });
    }

    const prisma = getPrisma();
    const now = new Date();

    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        ticketNumber: true,
        summary: true,
        currentStatus: true,
        itPriority: true,
        requestedPriority: true,
        updatedAt: true,
        ownerId: true,
        requesterId: true,
      },
    });

    const unassigned = tickets.filter((t) => t.ownerId === null).length;
    const ownedByMe = tickets.filter((t) => t.ownerId === user.id).length;

    const byStatus: Record<string, number> = {};
    for (const s of ALL_STATUSES) byStatus[s] = 0;
    for (const t of tickets) byStatus[t.currentStatus]++;

    const byItPriority: Record<string, number> = {};
    for (const p of ALL_PRIORITIES) byItPriority[p] = 0;
    for (const t of tickets) byItPriority[t.itPriority]++;

    const recentlyUpdated = tickets
      .filter((t) => isRecent7d(t.updatedAt, now))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map(ticketRef);

    const urgentHigh = tickets
      .filter((t) => (t.itPriority === "URGENT" || t.requestedPriority === "HIGH") && t.currentStatus !== "CLOSED" && t.currentStatus !== "CANCELLED")
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map(ticketRef);

    const response: any = {
      metrics: {
        unassigned,
        ownedByMe,
        byStatus,
        byItPriority,
      },
      lists: {
        recentlyUpdated,
        urgentHigh,
      },
      drilldown: {
        queueBase: "/api/staff/tickets",
        ticketDetailBase: "/staff/tickets",
      },
    };

    if (user.role === "ADMIN") {
      const total = await prisma.user.count();
      const requesters = await prisma.user.count({ where: { role: "REQUESTER" } });
      const staff = await prisma.user.count({ where: { role: "IT_STAFF" } });
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      response.administrator = {
        userCounts: {
          total,
          active: total,
          requesters,
          staff,
          admins,
        },
      };
    }

    return res.json(response);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load dashboard." } });
  }
}
