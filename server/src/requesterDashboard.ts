import type { Request, Response } from "express";
import { getPrisma } from "./prisma.js";

const ACTIVE_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const;

function toIso(d: unknown): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return new Date(String(d)).toISOString();
}

function mapItem(t: any) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    currentStatus: t.currentStatus,
    itPriority: t.itPriority,
    requestedPriority: t.requestedPriority,
    owner: t.owner ? { id: t.owner.id, name: t.owner.name } : null,
    updatedAt: toIso(t.updatedAt),
  };
}

export async function getRequesterDashboard(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
    if (req.user.role !== "REQUESTER") {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Forbidden." } });
    }

    const prisma = getPrisma();
    const clockRows = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`;
    const now = clockRows?.[0]?.now instanceof Date ? clockRows[0].now : new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const requesterId = req.user.id;

    const [openCount, waitingForRequesterCount, recentlyUpdatedItems, recentlyResolvedItems] = await Promise.all([
      prisma.ticket.count({ where: { requesterId, currentStatus: { in: [...ACTIVE_STATUSES] } } }),
      prisma.ticket.count({ where: { requesterId, currentStatus: "WAITING_FOR_REQUESTER" } }),
      prisma.ticket.findMany({
        where: { requesterId, updatedAt: { gte: sevenDaysAgo } },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 5,
        include: { owner: { select: { id: true, name: true } } },
      }),
      prisma.ticket.findMany({
        where: { requesterId, currentStatus: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { gte: sevenDaysAgo } },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 5,
        include: { owner: { select: { id: true, name: true } } },
      }),
    ]);

    return res.json({
      generatedAt: now.toISOString(),
      metrics: {
        openCount,
        waitingForRequesterCount,
      },
      recentlyUpdated: { items: recentlyUpdatedItems.map(mapItem) },
      recentlyResolved: { items: recentlyResolvedItems.map(mapItem) },
      drilldown: {
        open: "/api/tickets?status=OPEN",
        waitingForRequester: "/api/tickets?status=WAITING_FOR_REQUESTER",
        recentlyUpdated: "/api/tickets?sort=-updatedAt",
        recentlyResolved: "/api/tickets?status=RESOLVED",
      },
    });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load the requester dashboard." } });
  }
}
