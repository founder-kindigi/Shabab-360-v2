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
import { isScheduledAttendanceSession } from "@/lib/attendance/scheduled-sessions";
import { createAttendanceEventSchema } from "@/lib/attendance/schemas";
import { createRosterSnapshot } from "@/lib/attendance/summaries";

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

    type ScheduledGroup = {
      id: string;
      name: string;
      batch: {
        name: string;
        startDate: Date;
        endDate: Date | null;
        settings: { offWeekdays: { weekday: number }[]; offDates: { offDate: Date }[] } | null;
      };
    };
    let groups: ScheduledGroup[];
    if (user.role === "murabbi") {
      const scopeError = requireResourceScope(
        user,
        { groupId: user.assignedGroupId },
        ATTENDANCE_ROLES
      );
      if (scopeError) return scopeError;

      const group = await db.group.findUnique({
        where: { id: user.assignedGroupId! },
        select: {
          id: true,
          name: true,
          batch: {
            select: {
              parkId: true,
              name: true,
              startDate: true,
              endDate: true,
              settings: { select: { offWeekdays: { select: { weekday: true } }, offDates: { select: { offDate: true } } } },
            },
          },
        },
      });
      if (!group) {
        return NextResponse.json({ error: "Assigned group not found" }, { status: 403 });
      }
      parkId = group.batch.parkId;
      groups = [group];
    } else {
      if (!parkId) return NextResponse.json({ error: "parkId required" }, { status: 400 });
      const scopeError = requireResourceScope(user, { parkId }, ATTENDANCE_ROLES);
      if (scopeError) return scopeError;

      const batches = await db.batch.findMany({
        where: { parkId, isActive: true },
        select: { id: true },
      });
      groups = await db.group.findMany({
        where: { batchId: { in: batches.map((batch) => batch.id) }, isActive: true },
        select: {
          id: true,
          name: true,
          batch: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
              settings: { select: { offWeekdays: { select: { weekday: true } }, offDates: { select: { offDate: true } } } },
            },
          },
        },
      });
    }
    const groupIds = groups.map((group) => group.id);

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

    const persistedByGroupId = new Map(events.map((event) => [event.groupId, event]));
    const eventList: Array<{
      id: string | null;
      title: string;
      groupId: string;
      groupName: string;
      batchName?: string;
      eventDate: string;
      isClosed: boolean;
      isScheduled?: boolean;
      participantCount: number;
      markedCount: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      excusedCount: number;
      progress: number;
      closedAt: string | null;
      closedByName: string | null;
    }> = events.map((e) => {
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

    // A scheduled card is visible before its first mark. The actual event and
    // roster snapshot are created only when the user begins attendance.
    if (statusFilter !== "closed") {
      for (const group of groups) {
        if (persistedByGroupId.has(group.id)) continue;
        if (!isScheduledAttendanceSession(startDate, group.batch)) continue;
        const participantCount = pCountMap.get(group.id) || 0;
        eventList.push({
          id: null,
          title: `${group.name} attendance`,
          groupId: group.id,
          groupName: group.name,
          batchName: group.batch.name,
          eventDate: startDate.toISOString(),
          isClosed: false,
          isScheduled: true,
          participantCount,
          markedCount: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          progress: 0,
          closedAt: null,
          closedByName: null,
        });
      }
    }

    return NextResponse.json({
      date: formatPKT(startDate, "yyyy-MM-dd"),
      parkId,
      events: eventList.sort((left, right) => left.groupName.localeCompare(right.groupName)),
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
    const parsedBody = createAttendanceEventSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { groupId, title, eventDate } = parsedBody.data;

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
    const parsedDate = eventDate ? parseISO(eventDate) : null;
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

    await createRosterSnapshot(event.id);

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
