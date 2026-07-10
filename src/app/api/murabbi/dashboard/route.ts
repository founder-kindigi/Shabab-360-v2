import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, formatPKT, toPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "murabbi") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!user.assignedGroupId) {
    return NextResponse.json(
      { error: "No group assigned" },
      { status: 403 }
    );
  }

  try {
    // Fire audit log (fire-and-forget)
    logAudit({
      userId: user.id,
      action: "view",
      entityType: "murabbi_dashboard",
    });

    // Get the murabbi's assigned group with full hierarchy
    const group = await db.group.findUnique({
      where: { id: user.assignedGroupId },
      include: {
        batch: {
          include: {
            park: {
              include: { city: true },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const batch = group.batch;
    const park = batch.park;
    const city = park.city;

    // Total participants in the group
    const totalParticipants = await db.participant.count({
      where: { groupId: group.id, state: "active" },
    });

    // Today's date range in PKT
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();

    // Today's event for this group
    const todayEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: group.id,
        eventDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "desc" },
    });

    // Get attendance records breakdown for today's events
    let todayEvent = null;
    if (todayEvents.length > 0) {
      // Pick the first (latest) event
      const evt = todayEvents[0];
      const records = await db.attendanceRecord.findMany({
        where: { eventId: evt.id },
      });

      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const late = records.filter((r) => r.status === "late").length;
      const excused = records.filter((r) => r.status === "excused").length;
      const marked = records.length;

      todayEvent = {
        id: evt.id,
        title: evt.title,
        isClosed: evt.isClosed,
        participantCount: totalParticipants,
        markedCount: marked,
        progress:
          totalParticipants > 0
            ? Math.round((marked / totalParticipants) * 100)
            : 0,
        counts: { present, absent, late, excused },
      };
    }

    // 7-day attendance trend (daily rate for last 7 days)
    const sevenDaysAgo = new Date(
      todayStart.getTime() - 6 * 24 * 60 * 60 * 1000
    );
    const last7DaysEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: group.id,
        eventDate: { gte: sevenDaysAgo, lte: todayEnd },
        isClosed: true,
      },
      select: {
        id: true,
        eventDate: true,
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "asc" },
    });

    // Build a map of date -> event data for each of the 7 days
    const eventDateMap = new Map<
      string,
      { records: number; date: string }
    >();
    for (const evt of last7DaysEvents) {
      const dateKey = formatPKT(new Date(evt.eventDate), "yyyy-MM-dd");
      const existing = eventDateMap.get(dateKey);
      if (existing) {
        existing.records += evt._count.records;
      } else {
        eventDateMap.set(dateKey, {
          records: evt._count.records,
          date: dateKey,
        });
      }
    }

    // Generate 7-day trend (including days with no events)
    const dailyTrend: Array<{
      date: string;
      label: string;
      rate: number;
      hasEvent: boolean;
    }> = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = formatPKT(dayDate, "yyyy-MM-dd");
      const label = formatPKT(dayDate, "EEE");
      const eventData = eventDateMap.get(dateKey);
      const hasEvent = !!eventData;
      const rate = hasEvent && totalParticipants > 0
        ? Math.round((eventData.records / totalParticipants) * 100)
        : 0;
      dailyTrend.push({ date: dateKey, label, rate, hasEvent });
    }

    // This week vs last week attendance rate
    // This week: start of week (Monday) to today
    const nowPKT = toPKT(new Date());
    const dayOfWeek = nowPKT.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisWeekStart = new Date(
      todayStart.getTime() - mondayOffset * 24 * 60 * 60 * 1000
    );
    const lastWeekStart = new Date(
      thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    const lastWeekEnd = new Date(
      thisWeekStart.getTime() - 1 * 24 * 60 * 60 * 1000
    );

    // This week events (closed)
    const thisWeekEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: group.id,
        eventDate: { gte: thisWeekStart, lte: todayEnd },
        isClosed: true,
      },
      select: { _count: { select: { records: true } } },
    });

    const thisWeekTotal = thisWeekEvents.reduce(
      (sum, e) => sum + e._count.records,
      0
    );
    const thisWeekCapacity =
      thisWeekEvents.length * totalParticipants;
    const thisWeekRate =
      thisWeekCapacity > 0
        ? Math.round((thisWeekTotal / thisWeekCapacity) * 100)
        : 0;

    // Last week events (closed)
    const lastWeekEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: group.id,
        eventDate: { gte: lastWeekStart, lte: lastWeekEnd },
        isClosed: true,
      },
      select: { _count: { select: { records: true } } },
    });

    const lastWeekTotal = lastWeekEvents.reduce(
      (sum, e) => sum + e._count.records,
      0
    );
    const lastWeekCapacity =
      lastWeekEvents.length * totalParticipants;
    const lastWeekRate =
      lastWeekCapacity > 0
        ? Math.round((lastWeekTotal / lastWeekCapacity) * 100)
        : 0;

    // Today's attendance rate (from today's events - including open ones)
    let todayRate = 0;
    if (todayEvents.length > 0) {
      const todayRecordsCount = await db.attendanceRecord.count({
        where: { eventId: { in: todayEvents.map((e) => e.id) } },
      });
      todayRate =
        totalParticipants > 0
          ? Math.round((todayRecordsCount / totalParticipants) * 100)
          : 0;
    }

    // Top absentees (3+ absences in last 7 days)
    const recentRecords = await db.attendanceRecord.findMany({
      where: {
        event: {
          groupId: group.id,
          eventDate: { gte: sevenDaysAgo, lte: todayEnd },
        },
        status: "absent",
      },
      select: {
        participantId: true,
        participant: { select: { id: true, name: true } },
      },
    });

    const absenceCountMap = new Map<
      string,
      { name: string; count: number; id: string }
    >();
    for (const r of recentRecords) {
      const existing = absenceCountMap.get(r.participantId);
      if (existing) {
        existing.count++;
      } else {
        absenceCountMap.set(r.participantId, {
          name: r.participant.name,
          count: 1,
          id: r.participant.id,
        });
      }
    }

    // Filter to 3+ absences, sort by count desc
    const topAbsentees = Array.from(absenceCountMap.values())
      .filter((p) => p.count >= 3)
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      groupName: group.name,
      batchName: batch.name,
      parkName: park.name,
      cityName: city?.name || "Unknown",
      todayDate: formatPKT(new Date(), "dd MMM yyyy"),
      totalParticipants,
      todayEvent,
      todayRate,
      dailyTrend,
      thisWeekRate,
      lastWeekRate,
      topAbsentees,
    });
  } catch (error) {
    console.error("Murabbi dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}