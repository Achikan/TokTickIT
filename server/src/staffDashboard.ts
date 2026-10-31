import type { Request, Response } from "express";
import { getPrisma } from "./prisma.js";
import { blockPendingPasswordChange, requireAuth, requireRole } from "./middleware.js";

export const staffDashboardRouter = (() => {
  const router = (require("express") as typeof import("express")).Router();
  router.use(requireAuth, blockPendingPasswordChange, requireRole("IT_STAFF", "ADMIN"));
  router.get("/", getStaffDashboard);
  return router;
})();

const ALL_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const ALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

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
    if (!req.user) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
    if (req.user.role !== "IT_STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Forbidden." } });
    }

    const prisma = getPrisma();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      unassigned,
      ownedByMe,
      statusGroups,
      prioGroups,
      recentlyUpdatedList,
      urgentHighList,
      totalUsers,
      requestersCount,
      staffCount,
      adminsCount,
    ] = await Promise.all([
      prisma.ticket.count({ where: { ownerId: null } }),
      prisma.ticket.count({ where: { ownerId: req.user.id } }),
      prisma.ticket.groupBy({
        by: ["currentStatus"],
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ["itPriority"],
        _count: { _all: true },
      }),
      prisma.ticket.findMany({
        where: { updatedAt: { gte: sevenDaysAgo } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          itPriority: true,
          requestedPriority: true,
          updatedAt: true,
          ownerId: true,
        },
      }),
      prisma.ticket.findMany({
        where: {
          AND: [
            { OR: [{ itPriority: "URGENT" }, { requestedPriority: "HIGH" }] },
            { NOT: { currentStatus: { in: ["CLOSED", "CANCELLED"] } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          itPriority: true,
          requestedPriority: true,
          updatedAt: true,
          ownerId: true,
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "REQUESTER" } }),
      prisma.user.count({ where: { role: "IT_STAFF" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of ALL_STATUSES) byStatus[s] = 0;
    for (const g of statusGroups) {
      const k = g.currentStatus as string;
      if (k in byStatus) byStatus[k] = g._count._all;
    }

    const byItPriority: Record<string, number> = {};
    for (const p of ALL_PRIORITIES) byItPriority[p] = 0;
    for (const g of prioGroups) {
      const k = g.itPriority as string;
      if (k in byItPriority) byItPriority[k] = g._count._all;
    }

    const response: any = {
      metrics: {
        unassigned,
        ownedByMe,
        byStatus,
        byItPriority,
      },
      lists: {
        recentlyUpdated: recentlyUpdatedList.map(ticketRef),
        urgentHigh: urgentHighList.map(ticketRef),
      },
      drilldown: {
        queueBase: "/api/staff/tickets",
        ticketDetailBase: "/staff/tickets",
      },
    };

    if (req.user.role === "ADMIN") {
      response.administrator = {
        userCounts: {
          total: totalUsers,
          active: totalUsers,
          requesters: requestersCount,
          staff: staffCount,
          admins: adminsCount,
        },
      };
    }

    return res.json(response);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load dashboard." } });
  }
}
