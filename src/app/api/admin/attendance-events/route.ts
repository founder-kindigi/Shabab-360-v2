import { NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT } from "@/lib/timezone";
import { parseISO, isValid, subDays } from "date-fns";
import { z } from "zod";
import {
  MAX_LIST_OFFSET,
  optionalDateOnly,
  optionalIdentifier,
  optionalQueryText,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

const ALLOWED_ROLES = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead"] as const;

const attendanceEventsQuerySchema = z.object({
  cityId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  groupId: optionalIdentifier(),
  search: optionalQueryText(),
  dateFrom: optionalDateOnly(),
  dateTo: optionalDateOnly(),
  isClosed: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(1_000).default(50),
  offset: z.coerce.number().int().min(0).max(MAX_LIST_OFFSET).default(0),
}).refine(
  ({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo,
  { path: ["dateTo"], message: "dateTo must be on or after dateFrom" }
);

export async function GET(req: Request) {
  const roleError = await requireRole([...ALLOWED_ROLES]);
  if (roleError) return roleError;

  const auth = await requireCapability("attendance.mark");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const query = attendanceEventsQuerySchema.safeParse(queryParamsToObject(searchParams));
    if (!query.success) {
      return NextResponse.json(queryValidationError(query.error), { status: 400 });
    }
    const { cityId, parkId, groupId, search, dateFrom, dateTo, isClosed, limit, offset } = query.data;

    // Build scope-based where clauses
    const parkWhere: Record<string, unknown> = {};
    if (user.role === "city_head") {
      if (!user.assignedCityId || (cityId && cityId !== user.assignedCityId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      parkWhere.cityId = user.assignedCityId;
    } else if (user.role === "park_admin" || user.role === "park_lead") {
      if (!user.assignedParkId || (parkId && parkId !== user.assignedParkId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      parkWhere.id = user.assignedParkId;
    } else {
      if (cityId) parkWhere.cityId = cityId;
      if (parkId) parkWhere.id = parkId;
    }

    // Filter groups
    const batchWhere: Record<string, unknown> = {};
    if (Object.keys(parkWhere).length > 0) {
      batchWhere.park = parkWhere;
    }

    const groupWhere: Record<string, unknown> = {};
    if (Object.keys(batchWhere).length > 0) {
      groupWhere.batch = batchWhere;
    }
    if (groupId) {
      groupWhere.id = groupId;
    }

    // Date range
    const eventWhere: Record<string, unknown> = {};
    if (Object.keys(groupWhere).length > 0) {
      eventWhere.group = groupWhere;
    }

    if (dateFrom) {
      const parsed = parseISO(dateFrom);
      if (isValid(parsed)) {
        eventWhere.eventDate = { ...(eventWhere.eventDate as Record<string, unknown> || {}), gte: parsed };
      }
    } else {
      // Default: last 7 days
      const sevenDaysAgo = subDays(todayPKT(), 7);
      eventWhere.eventDate = { ...(eventWhere.eventDate as Record<string, unknown> || {}), gte: sevenDaysAgo };
    }

    if (dateTo) {
      const parsed = parseISO(dateTo);
      if (isValid(parsed)) {
        eventWhere.eventDate = { ...(eventWhere.eventDate as Record<string, unknown> || {}), lte: parsed };
      }
    }

    if (isClosed === "true") eventWhere.isClosed = true;
    else if (isClosed === "false") eventWhere.isClosed = false;

    // Search by event title
    if (search) {
      eventWhere.title = { contains: search, mode: "insensitive" };
    }

    const [events, total] = await Promise.all([
      db.attendanceEvent.findMany({
        where: eventWhere,
        include: {
          group: {
            include: {
              batch: { include: { park: { include: { city: true } } } },
            },
          },
          _count: { select: { records: true } },
        },
        orderBy: { eventDate: "desc" },
        take: limit,
        skip: offset,
      }),
      db.attendanceEvent.count({ where: eventWhere }),
    ]);

    // Get participant counts per group
    const allGroupIds = [...new Set(events.map((e) => e.groupId))];
    const groupPCounts = await db.participant.groupBy({
      by: ["groupId"],
      where: { groupId: { in: allGroupIds }, state: "active" },
      _count: true,
    });
    const pCountMap = new Map(groupPCounts.map((g) => [g.groupId, g._count]));

    // Get status breakdown per event
    const allEventIds = events.map((e) => e.id);
    const statusBreakdown = await db.attendanceRecord.groupBy({
      by: ["eventId", "status"],
      where: { eventId: { in: allEventIds } },
      _count: true,
    });
    const breakdownMap = new Map<string, Map<string, number>>();
    for (const row of statusBreakdown) {
      if (!breakdownMap.has(row.eventId)) {
        breakdownMap.set(row.eventId, new Map());
      }
      breakdownMap.get(row.eventId)!.set(row.status, row._count);
    }

    // Resolve closer names (closedBy is a staffMeta ID)
    const closerIds = [...new Set(events.map((e) => e.closedBy).filter(Boolean))] as string[];
    const closers = closerIds.length > 0
      ? await db.staffMeta.findMany({
          where: { id: { in: closerIds } },
          include: { user: { select: { name: true } } },
        })
      : [];
    const closerMap = new Map(closers.map((c) => [c.id, c.user.name]));

    const eventList = events.map((e) => {
      const pCount = pCountMap.get(e.groupId) || 0;
      const breakdown = breakdownMap.get(e.id) || new Map();
      return {
        id: e.id,
        title: e.title,
        groupId: e.groupId,
        groupName: e.group.name,
        batchName: e.group.batch.name,
        parkName: e.group.batch.park.name,
        cityName: e.group.batch.park.city?.name || "Unknown",
        eventDate: e.eventDate.toISOString(),
        isClosed: e.isClosed,
        participantCount: pCount,
        markedCount: e._count.records,
        presentCount: breakdown.get("present") || 0,
        absentCount: breakdown.get("absent") || 0,
        lateCount: breakdown.get("late") || 0,
        excusedCount: breakdown.get("excused") || 0,
        progress: pCount > 0 ? Math.round((e._count.records / pCount) * 100) : 0,
        closedAt: e.closedAt?.toISOString() || null,
        closedByName: e.closedBy ? (closerMap.get(e.closedBy) || null) : null,
      };
    });

    return NextResponse.json({
      data: eventList,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Admin attendance events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
