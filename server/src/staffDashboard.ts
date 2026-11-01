import type { Request, Response } from "express";
import { getPrisma } from "./prisma.js";

const ACTIVE_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const;
const ALL_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const ALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function toIso(d: unknown): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return new Date(String(d)).toISOString();
}

export async function getStaffDashboard(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
    if (req.user.role !== "IT_STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Forbidden." } });
    }

    const prisma = getPrisma();
    const clockRows = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`;
    const now = clockRows?.[0]?.now instanceof Date ? clockRows[0].now : new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      unassignedCount,
      ownedByMeCount,
      statusGroups,
      priorityGroups,
      recentAll,
      urgentItems,
      highItems,
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      prisma.ticket.count({ where: { ownerId: null, currentStatus: { in: [...ACTIVE_STATUSES] } } }),
      prisma.ticket.count({ where: { ownerId: req.user.id, currentStatus: { in: [...ACTIVE_STATUSES] } } }),
      prisma.ticket.groupBy({
        by: ["currentStatus"],
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ["itPriority"],
        where: { currentStatus: { in: [...ACTIVE_STATUSES] } },
        _count: { _all: true },
      }),
      prisma.ticket.findMany({
        where: { updatedAt: { gte: sevenDaysAgo } },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 5,
        include: {
          owner: { select: { id: true, name: true } },
        },
      }),
      prisma.ticket.findMany({
        where: {
          currentStatus: { in: [...ACTIVE_STATUSES] },
          itPriority: "URGENT",
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 5,
        include: { owner: { select: { id: true, name: true } } },
      }),
      prisma.ticket.findMany({
        where: {
          currentStatus: { in: [...ACTIVE_STATUSES] },
          itPriority: "HIGH",
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 5,
        include: { owner: { select: { id: true, name: true } } },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of ALL_STATUSES) byStatus[s] = 0;
    for (const g of statusGroups) {
      const k = g.currentStatus as string;
      byStatus[k] = (g as any)._count?._all ?? (g as any)._count ?? 0;
    }

    const byPriority: Record<string, number> = {};
    for (const p of ALL_PRIORITIES) byPriority[p] = 0;
    for (const g of priorityGroups) {
      const k = g.itPriority as string;
      byPriority[k] = (g as any)._count?._all ?? 0;
    }

    const mapItem = (t: any) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      currentStatus: t.currentStatus,
      itPriority: t.itPriority,
      owner: t.owner ? { id: t.owner.id, name: t.owner.name } : null,
      updatedAt: toIso(t.updatedAt),
    });

    const urgentHigh = [...urgentItems, ...highItems].slice(0, 5).map(mapItem);

    const response: any = {
      generatedAt: now.toISOString(),
      metrics: {
        unassignedCount,
        ownedByMeCount,
        byStatus,
        byPriority,
      },
      recentlyUpdated: { items: recentAll.map(mapItem) },
      urgentHigh: { items: urgentHigh },
      drilldown: {
        unassigned: "/api/staff/tickets?ownerId=unassigned",
        ownedByMe: "/api/staff/tickets?ownerId=me",
        byStatus: "/api/staff/tickets?status={status}",
        byPriority: "/api/staff/tickets?itPriority={priority}",
        recentlyUpdated: "/api/staff/tickets?sort=-updatedAt",
      },
    };

    if (req.user.role === "ADMIN") {
      response.userCounts = { total: totalUsers, active: activeUsers };
    }

    return res.json(response);
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load dashboard." } });
  }
}
