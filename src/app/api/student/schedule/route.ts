import { NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { toPKT, formatPKT } from "@/lib/timezone";
import {
  optionalInteger,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const scheduleQuerySchema = z.object({
  weekOffset: optionalInteger(-52, 52).default(0),
});

export async function GET(request: Request) {
  const roleError = await requireRole(["student"]);
  if (roleError) return roleError;

  const auth = await requireCapability("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = scheduleQuerySchema.safeParse(queryParamsToObject(searchParams));
    if (!parsedQuery.success) {
      return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
    }
    const { weekOffset } = parsedQuery.data;

    // Find participant linked to user
    const participant = await db.participant.findFirst({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            batch: {
              include: {
                park: { include: { city: true } },
              },
            },
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ participant: null });
    }

    const groupId = participant.group.id;

    // ── Week calculation (Mon-Sun in PKT) ──
    const nowPKT = toPKT(new Date());
    const dayOfWeek = nowPKT.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const weekMonday = new Date(nowPKT);
    weekMonday.setDate(nowPKT.getDate() + mondayOffset + weekOffset * 7);
    weekMonday.setHours(0, 0, 0, 0);

    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);
    weekSunday.setHours(23, 59, 59, 999);

    // ── Get events for the selected week ──
    const weekEvents = await db.attendanceEvent.findMany({
      where: {
        groupId,
        eventDate: { gte: weekMonday, lte: weekSunday },
      },
      include: {
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "asc" },
    });

    // ── Get student's attendance records for these events ──
    const weekEventIds = weekEvents.map((e) => e.id);
    const myRecords = weekEventIds.length > 0
      ? await db.attendanceRecord.findMany({
          where: {
            eventId: { in: weekEventIds },
            participantId: participant.id,
          },
        })
      : [];
    const recordMap = new Map(myRecords.map((r) => [r.eventId, r.status]));

    // ── Typical days (last 4 weeks) ──
    const fourWeeksAgoMonday = new Date(weekMonday);
    fourWeeksAgoMonday.setDate(weekMonday.getDate() - 28);
    fourWeeksAgoMonday.setHours(0, 0, 0, 0);

    const historicalEvents = await db.attendanceEvent.findMany({
      where: {
        groupId,
        eventDate: { gte: fourWeeksAgoMonday, lt: weekMonday },
      },
      select: { eventDate: true },
    });

    const dayCounts = new Map<number, number>();
    for (const ev of historicalEvents) {
      const d = toPKT(new Date(ev.eventDate));
      let dow = d.getDay();
      dow = dow === 0 ? 6 : dow - 1;
      dayCounts.set(dow, (dayCounts.get(dow) || 0) + 1);
    }
    const typicalDays = Array.from(dayCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([day]) => day);

    // ── Get participant count for the group ──
    const groupParticipantCount = await db.participant.count({ where: { groupId, state: "active" } });

    // ── Build events with student status ──
    const events = weekEvents.map((e) => {
      const d = toPKT(new Date(e.eventDate));
      let dow = d.getDay();
      dow = dow === 0 ? 6 : dow - 1;
      const mCount = e._count.records;
      return {
        id: e.id,
        title: e.title,
        eventDate: e.eventDate.toISOString(),
        dayOfWeek: dow,
        dateStr: formatPKT(d, "yyyy-MM-dd"),
        timeStr: formatPKT(d, "hh:mm a"),
        isClosed: e.isClosed,
        myStatus: recordMap.get(e.id) || null,
        markedCount: mCount,
        participantCount: groupParticipantCount,
        progress: groupParticipantCount > 0 ? Math.round((mCount / groupParticipantCount) * 100) : 0,
      };
    });

    // ── Upcoming events (next 3 after this week) ──
    const upcomingEvents = await db.attendanceEvent.findMany({
      where: {
        groupId,
        eventDate: { gt: weekSunday },
      },
      include: {
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "asc" },
      take: 3,
    });

    const upcoming = upcomingEvents.map((e) => {
      const d = toPKT(new Date(e.eventDate));
      return {
        id: e.id,
        title: e.title,
        eventDate: e.eventDate.toISOString(),
        dateStr: formatPKT(d, "dd MMM yyyy"),
        timeStr: formatPKT(d, "hh:mm a"),
        isClosed: e.isClosed,
      };
    });

    // ── Summary ──
    const totalSessions = events.length;
    const completedSessions = events.filter((e) => e.isClosed).length;
    const myCompleted = events.filter((e) => e.myStatus === "present" || e.myStatus === "late").length;
    const myAbsent = events.filter((e) => e.myStatus === "absent").length;
    const remaining = totalSessions - completedSessions;

    return NextResponse.json({
      participant: {
        id: participant.id,
        name: participant.name,
      },
      group: {
        id: participant.group.id,
        name: participant.group.name,
        batchName: participant.group.batch.name,
        parkName: participant.group.batch.park.name,
        cityName: participant.group.batch.park.city?.name || null,
      },
      events,
      typicalDays,
      upcoming,
      weekStart: weekMonday.toISOString(),
      weekEnd: weekSunday.toISOString(),
      weekLabel: `${formatPKT(weekMonday, "dd MMM")} – ${formatPKT(weekSunday, "dd MMM yyyy")}`,
      summary: {
        totalSessions,
        completedSessions,
        myCompleted,
        myAbsent,
        remaining,
      },
    });
  } catch (error) {
    console.error("Student schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
