import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { todayPKT, endOfTodayPKT, formatPKT, fromPKT } from "@/lib/timezone";
import { parseISO, isValid } from "date-fns";
import {
  optionalDateOnly,
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const listQuerySchema = z.object({
  parkId: optionalIdentifier(),
  date: optionalDateOnly(),
  status: z.enum(["open", "closed"]).optional(),
});

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const query = listQuerySchema.safeParse(queryParamsToObject(new URL(req.url).searchParams));
    if (!query.success) {
      return NextResponse.json(queryValidationError(query.error), { status: 400 });
    }
    let parkId = query.data.parkId || user.assignedParkId;
    const dateParam = query.data.date;
    const statusFilter = query.data.status;

    let groupIds: string[];
    if (user.role === "murabbi") {
      const scopeError = requireResourceScope(
        user,
        { groupId: user.assignedGroupId },
        ATTENDANCE_ROLES
      );
      if (scopeError) return scopeError;

      const group = await db.group.findUnique({
        where: { id: user.assignedGroupId! },
        select: { batch: { select: { parkId: true } } },
      });
      if (!group) {
        return NextResponse.json({ error: "Assigned group not found" }, { status: 403 });
      }
      parkId = group.batch.parkId;
      groupIds = [user.assignedGroupId!];
    } else {
      if (!parkId) return NextResponse.json({ error: "parkId required" }, { status: 400 });
      const scopeError = requireResourceScope(user, { parkId }, ATTENDANCE_ROLES);
      if (scopeError) return scopeError;

      const batches = await db.batch.findMany({
        where: { parkId, isActive: true },
        select: { id: true },
      });
      const groups = await db.group.findMany({
        where: { batchId: { in: batches.map((batch) => batch.id) }, isActive: true },
        select: { id: true },
      });
      groupIds = groups.map((group) => group.id);
    }

    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (!isValid(parsed)) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }
      const pktDate = fromPKT(parsed);
      startDate = new Date(pktDate.getFullYear(), pktDate.getMonth(), pktDate.getDate());
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    } else {
      startDate = todayPKT();
      endDate = endOfTodayPKT();
    }

    // Build where clause
    const where: Record<string, unknown> = {
      groupId: { in: groupIds },
      eventDate: { gte: startDate, lt: endDate },
    };

    if (statusFilter === "open") where.isClosed = false;
    else if (statusFilter === "closed") where.isClosed = true;

    // Get events with record counts
    const events = await db.attendanceEvent.findMany({
      where,
      include: {
        group: true,
        records: { select: { id: true, status: true } },
      },
      orderBy: { eventDate: "desc" },
    });

    // Get participant counts per group
    const groupPCounts = await db.participant.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds }, state: "active" },
      _count: true,
    });
    const pCountMap = new Map(groupPCounts.map((g) => [g.groupId, g._count]));

    // Resolve closedBy names from StaffMeta
    const closedByIds = events
      .map((e) => e.closedBy)
      .filter((id): id is string => !!id);
    const closedByStaff = closedByIds.length > 0
      ? await db.staffMeta.findMany({
          where: { id: { in: closedByIds } },
          include: { user: { select: { name: true } } },
        })
      : [];
    const closedByNameMap = new Map(
      closedByStaff.map((s) => [s.id, s.user.name])
    );

    const eventList = events.map((e) => {
      const pCount = pCountMap.get(e.groupId) || 0;
      const mCount = e.records.length;
      const presentCount = e.records.filter((r) => r.status === "present").length;
      const absentCount = e.records.filter((r) => r.status === "absent").length;
      const lateCount = e.records.filter((r) => r.status === "late").length;
      const excusedCount = e.records.filter((r) => r.status === "excused").length;

      return {
        id: e.id,
        title: e.title,
        groupId: e.groupId,
        groupName: e.group.name,
        eventDate: e.eventDate.toISOString(),
        isClosed: e.isClosed,
        participantCount: pCount,
        markedCount: mCount,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        progress: pCount > 0 ? Math.round((mCount / pCount) * 100) : 0,
        closedAt: e.closedAt?.toISOString() || null,
        closedByName: e.closedBy ? closedByNameMap.get(e.closedBy) || null : null,
      };
    });

    return NextResponse.json({
      date: formatPKT(startDate, "yyyy-MM-dd"),
      parkId,
      events: eventList,
    });
  } catch (error) {
    console.error("Attendance list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new attendance event for a group.
 */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const body = await req.json();
    const { groupId, title, eventDate } = body;

    if (typeof groupId !== "string" || typeof title !== "string" || !groupId || !title.trim()) {
      return NextResponse.json(
        { error: "groupId and title are required" },
        { status: 400 }
      );
    }

    // Scope check: verify group belongs to user's scope
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { batch: { include: { park: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      user,
      { parkId: group.batch.parkId, groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

    // Check if event already exists for this group+date
    const parsedDate = typeof eventDate === "string" ? parseISO(eventDate) : null;
    if (parsedDate && !isValid(parsedDate)) {
      return NextResponse.json({ error: "Invalid eventDate" }, { status: 400 });
    }
    const date = parsedDate ? fromPKT(parsedDate) : todayPKT();
    const existingEvent = await db.attendanceEvent.findFirst({
      where: {
        groupId,
        eventDate: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
      },
    });

    if (existingEvent) {
      return NextResponse.json(
        { error: "Event already exists for this group and date" },
        { status: 409 }
      );
    }

    const event = await db.attendanceEvent.create({
      data: {
        groupId,
        title: title.trim(),
        eventDate: date,
      },
    });

    await logAudit({
      userId: user.id,
      action: "event_create",
      entityType: "attendance_events",
      entityId: event.id,
      newValues: { groupId, title: title.trim(), eventDate: event.eventDate.toISOString() },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error("Event create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
