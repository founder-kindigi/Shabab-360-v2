import { NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, toPKT, formatPKT } from "@/lib/timezone";
import {
  optionalInteger,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const scheduleQuerySchema = z.object({
  weekOffset: optionalInteger(-52, 52).default(0),
});

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

export async function GET(request: Request) {
  const roleError = await requireRole(["park_admin", "park_lead", "murabbi"]);
  if (roleError) return roleError;

  const auth = await requireCapability("reports.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as SessionUser;

  try {
    const query = scheduleQuerySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
    if (!query.success) {
      return NextResponse.json(queryValidationError(query.error), { status: 400 });
    }
    const { weekOffset } = query.data;

    // Resolve park scope
    let parkId = user.assignedParkId;
    let groupIds: string[] = [];

    if (user.role === "murabbi" && user.assignedGroupId) {
      const group = await db.group.findUnique({
        where: { id: user.assignedGroupId },
        include: { batch: { select: { parkId: true } } },
      });
      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
      parkId = group.batch.parkId;
      groupIds = [group.id];
    } else if (user.assignedParkId) {
      const batches = await db.batch.findMany({
        where: { parkId: user.assignedParkId, isActive: true },
        select: { id: true },
      });
      const batchIds = batches.map((b) => b.id);
      const groups = await db.group.findMany({
        where: { batchId: { in: batchIds }, isActive: true },
        select: { id: true },
      });
      groupIds = groups.map((g) => g.id);
    }

    if (!parkId) {
      return NextResponse.json({ error: "No park assigned" }, { status: 403 });
    }

    const park = await db.park.findUnique({
      where: { id: parkId },
      include: { city: true },
    });

    // ── Week calculation (Mon-Sun in PKT) ──
    const nowPKT = toPKT(new Date());
    const dayOfWeek = nowPKT.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Mon=1 => offset 0

    const weekMonday = new Date(nowPKT);
    weekMonday.setDate(nowPKT.getDate() + mondayOffset + weekOffset * 7);
    weekMonday.setHours(0, 0, 0, 0);

    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);
    weekSunday.setHours(23, 59, 59, 999);

    // ── Get batches with groups ──
    const batches = await db.batch.findMany({
      where: { parkId, isActive: true },
      include: {
        groups: {
          where: { id: { in: groupIds }, isActive: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // ── Get participant counts per group ──
    const groupParticipantCounts = await db.participant.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds }, state: "active" },
      _count: true,
    });
    const participantCountMap = new Map(
      groupParticipantCounts.map((g) => [g.groupId, g._count])
    );

    // ── Get events for the selected week ──
    const weekEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: weekMonday, lte: weekSunday },
      },
      include: {
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "asc" },
    });

    // ── Compute typical days (last 4 weeks) ──
    const fourWeeksAgoMonday = new Date(weekMonday);
    fourWeeksAgoMonday.setDate(weekMonday.getDate() - 28);
    fourWeeksAgoMonday.setHours(0, 0, 0, 0);

    const historicalEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: fourWeeksAgoMonday, lt: weekMonday },
      },
      select: { groupId: true, eventDate: true },
    });

    // For each group, compute which days of week (0-6, Mon=0) typically have events
    const typicalDaysMap = new Map<string, number[]>();
    for (const gid of groupIds) {
      const groupHist = historicalEvents.filter((e) => e.groupId === gid);
      const dayCounts = new Map<number, number>();
      for (const ev of groupHist) {
        const d = toPKT(new Date(ev.eventDate));
        let dow = d.getDay(); // 0=Sun
        dow = dow === 0 ? 6 : dow - 1; // Convert to Mon=0, Sun=6
        dayCounts.set(dow, (dayCounts.get(dow) || 0) + 1);
      }
      // A day is "typical" if it has events in >= 2 of the last 4 weeks
      const typicalDays = Array.from(dayCounts.entries())
        .filter(([, count]) => count >= 2)
        .map(([day]) => day);
      typicalDaysMap.set(gid, typicalDays);
    }

    // ── Build response ──
    const batchesData = batches.map((batch) => ({
      id: batch.id,
      name: batch.name,
      groups: batch.groups.map((group) => {
        const groupEvents = weekEvents
          .filter((e) => e.groupId === group.id)
          .map((e) => {
            const d = toPKT(new Date(e.eventDate));
            let dow = d.getDay();
            dow = dow === 0 ? 6 : dow - 1; // Mon=0
            const pCount = participantCountMap.get(group.id) || 0;
            const mCount = e._count.records;
            return {
              id: e.id,
              title: e.title,
              eventDate: e.eventDate.toISOString(),
              dayOfWeek: dow,
              dateStr: formatPKT(d, "yyyy-MM-dd"),
              timeStr: formatPKT(d, "hh:mm a"),
              isClosed: e.isClosed,
              participantCount: pCount,
              markedCount: mCount,
              progress: pCount > 0 ? Math.round((mCount / pCount) * 100) : 0,
            };
          });

        return {
          id: group.id,
          name: group.name,
          participantCount: participantCountMap.get(group.id) || 0,
          events: groupEvents,
          typicalDays: typicalDaysMap.get(group.id) || [],
        };
      }),
    }));

    // ── Summary stats ──
    const allWeekEvents = weekEvents;
    const totalSessions = allWeekEvents.length;
    const completedSessions = allWeekEvents.filter((e) => e.isClosed).length;
    const openSessions = totalSessions - completedSessions;

    return NextResponse.json({
      park: park
        ? { id: park.id, name: park.name, cityName: park.city?.name || null }
        : null,
      batches: batchesData,
      weekStart: weekMonday.toISOString(),
      weekEnd: weekSunday.toISOString(),
      weekLabel: `${formatPKT(weekMonday, "dd MMM")} – ${formatPKT(weekSunday, "dd MMM yyyy")}`,
      summary: { totalSessions, completedSessions, openSessions },
    });
  } catch (error) {
    console.error("Park schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
