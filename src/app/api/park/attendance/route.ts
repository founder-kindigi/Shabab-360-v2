import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, formatPKT, fromPKT } from "@/lib/timezone";
import { parseISO, isValid } from "date-fns";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const VALID_STATUSES = ["present", "absent", "late", "excused"];
const ALLOWED_ROLES = ["park_admin", "park_lead", "murabbi"];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const parkId = searchParams.get("parkId") || user.assignedParkId;
    const dateParam = searchParams.get("date");
    const statusFilter = searchParams.get("status");

    if (!parkId) {
      return NextResponse.json({ error: "parkId required" }, { status: 400 });
    }

    // Scope check
    if (user.role === "murabbi") {
      if (!user.assignedGroupId) {
        return NextResponse.json(
          { error: "No group assigned" },
          { status: 403 }
        );
      }
    } else {
      // park_admin/park_lead: must match their park
      if (user.assignedParkId && user.assignedParkId !== parkId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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

    // Get group IDs in scope
    let groupIds: string[];

    if (user.role === "murabbi") {
      groupIds = [user.assignedGroupId!];
    } else {
      const batches = await db.batch.findMany({
        where: { parkId, isActive: true },
        select: { id: true },
      });
      const groups = await db.group.findMany({
        where: { batchId: { in: batches.map((b) => b.id) }, isActive: true },
        select: { id: true },
      });
      groupIds = groups.map((g) => g.id);
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
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { groupId, title, eventDate } = body;

    if (!groupId || !title) {
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

    if (user.role === "murabbi") {
      if (user.assignedGroupId !== groupId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (user.assignedParkId !== group.batch.parkId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if event already exists for this group+date
    const date = eventDate ? fromPKT(parseISO(eventDate)) : todayPKT();
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
        title,
        eventDate: date,
      },
    });

    logAudit({
      userId: user.id,
      action: "event_create",
      entityType: "attendance_events",
      entityId: event.id,
      newValues: JSON.stringify({ groupId, title, eventDate: event.eventDate }),
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