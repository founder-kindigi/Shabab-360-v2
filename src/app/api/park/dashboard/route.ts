import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, formatPKT } from "@/lib/timezone";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
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

  const allowedRoles = ["park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const capabilityAuth = await requireCapability("dashboard.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    let parkId = user.assignedParkId;
    let groupIds: string[] = [];

    if (user.role === "murabbi" && user.assignedGroupId) {
      // Murabbi: get park from their group
      const group = await db.group.findUnique({
        where: { id: user.assignedGroupId },
        include: { batch: { include: { park: { include: { city: true } } } } },
      });
      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
      parkId = group.batch.parkId;
      groupIds = [group.id];
    } else if (user.assignedParkId) {
      // Park admin/lead: get all groups in their park
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

    // Get today's date range in PKT
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();

    // Get today's events
    const todayEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        group: true,
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "desc" },
    });

    // Get participant count per group
    const groupParticipantCounts = await db.participant.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds }, state: "active" },
      _count: true,
    });

    const participantCountMap = new Map(
      groupParticipantCounts.map((g) => [g.groupId, g._count])
    );

    // Total participants across all groups
    const totalParticipants = groupParticipantCounts.reduce(
      (sum, g) => sum + g._count,
      0
    );

    // Count open vs closed
    const openEvents = todayEvents.filter((e) => !e.isClosed);
    const closedEvents = todayEvents.filter((e) => e.isClosed);

    // Get last 7 days stats
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: sevenDaysAgo, lte: todayEnd },
        isClosed: true,
      },
      include: {
        _count: { select: { records: true } },
      },
    });

    const totalMarksLast7Days = last7DaysEvents.reduce(
      (sum, e) => sum + e._count.records,
      0
    );
    const totalCapacityLast7Days = last7DaysEvents.reduce((sum, e) => {
      return sum + (participantCountMap.get(e.groupId) || 0);
    }, 0);
    const attendanceRate =
      totalCapacityLast7Days > 0
        ? totalMarksLast7Days / totalCapacityLast7Days
        : 0;

    // Previous 7 days (day -14 to day -7) for comparison
    const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);
    const prev7DaysEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        isClosed: true,
      },
      include: {
        _count: { select: { records: true } },
      },
    });
    const prevTotalMarks = prev7DaysEvents.reduce(
      (sum, e) => sum + e._count.records,
      0
    );
    const prevTotalCapacity = prev7DaysEvents.reduce((sum, e) => {
      return sum + (participantCountMap.get(e.groupId) || 0);
    }, 0);
    const prevAttendanceRate =
      prevTotalCapacity > 0 ? prevTotalMarks / prevTotalCapacity : 0;

    // ==================== NEW DATA: Attendance Rate Trend (last 12 days) ====================
    const startDate12 = new Date(todayStart.getTime() - 11 * 24 * 60 * 60 * 1000);

    // Single query for all events in the 12-day range
    const trendEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: startDate12, lte: todayStart },
        isClosed: true,
      },
      select: {
        id: true,
        groupId: true,
        eventDate: true,
        _count: { select: { records: true } },
        records: { select: { status: true } },
      },
      orderBy: { eventDate: "asc" },
    });

    // Group events by date
    const eventsByDate = new Map<string, typeof trendEvents>();
    for (const ev of trendEvents) {
      const dateStr = formatPKT(ev.eventDate, "yyyy-MM-dd");
      const arr = eventsByDate.get(dateStr) || [];
      arr.push(ev);
      eventsByDate.set(dateStr, arr);
    }

    // Build trend array
    const attendanceTrend: Array<{
      date: string;
      rate: number;
      marked: number;
      total: number;
      present: number;
      late: number;
      absent: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = formatPKT(dayStart, "yyyy-MM-dd");
      const dayEvents = eventsByDate.get(dateStr) || [];

      const dayMarked = dayEvents.reduce((s, e) => s + e._count.records, 0);
      const dayTotal = dayEvents.reduce(
        (s, e) => s + (participantCountMap.get(e.groupId) || 0),
        0
      );
      const dayRate = dayTotal > 0 ? Math.round((dayMarked / dayTotal) * 100) : 0;

      let dayPresent = 0;
      let dayLate = 0;
      let dayAbsent = 0;
      for (const ev of dayEvents) {
        for (const rec of ev.records) {
          if (rec.status === "present") dayPresent++;
          else if (rec.status === "late") dayLate++;
          else if (rec.status === "absent") dayAbsent++;
        }
      }

      attendanceTrend.push({
        date: dateStr,
        rate: dayRate,
        marked: dayMarked,
        total: dayTotal,
        present: dayPresent,
        late: dayLate,
        absent: dayAbsent,
      });
    }

    // ==================== NEW DATA: Group Breakdown ====================
    const allGroups = await db.group.findMany({
      where: { id: { in: groupIds }, isActive: true },
      select: { id: true, name: true },
    });

    // Get today's event records with status breakdown for each group
    const todayEventsWithRecords = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        records: { select: { status: true } },
      },
    });

    const groupEventMap = new Map<string, (typeof todayEventsWithRecords)[number][]>();
    for (const ev of todayEventsWithRecords) {
      const arr = groupEventMap.get(ev.groupId) || [];
      arr.push(ev);
      groupEventMap.set(ev.groupId, arr);
    }

    const groupBreakdown = allGroups.map((g) => {
      const events = groupEventMap.get(g.id) || [];
      const totalParts = participantCountMap.get(g.id) || 0;

      let markedCount = 0;
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      for (const ev of events) {
        for (const rec of ev.records) {
          markedCount++;
          if (rec.status === "present") presentCount++;
          else if (rec.status === "absent") absentCount++;
          else if (rec.status === "late") lateCount++;
          else if (rec.status === "excused") excusedCount++;
        }
      }

      let eventStatus: "open" | "closed" | "none" = "none";
      if (events.length > 0) {
        eventStatus = events.every((e) => e.isClosed) ? "closed" : "open";
      }

      return {
        id: g.id,
        name: g.name,
        totalParticipants: totalParts,
        todayMarkedCount: markedCount,
        todayPresent: presentCount,
        todayAbsent: absentCount,
        todayLate: lateCount,
        todayExcused: excusedCount,
        todayEventStatus: eventStatus,
        todayProgress: totalParts > 0 ? Math.round((markedCount / totalParts) * 100) : 0,
      };
    });

    // ==================== NEW DATA: Top Performers ====================
    // Participants with best attendance in last 7 days
    const last7DaysClosedEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: sevenDaysAgo, lte: todayEnd },
        isClosed: true,
      },
      select: { id: true },
    });

    const last7EventIds = last7DaysClosedEvents.map((e) => e.id);

    let topPerformers: Array<{
      id: string;
      name: string;
      groupName: string;
      attended: number;
      total: number;
      rate: number;
    }> = [];

    if (last7EventIds.length > 0) {
      // Get attendance records for last 7 days
      const recentRecords = await db.attendanceRecord.findMany({
        where: {
          eventId: { in: last7EventIds },
          status: { in: ["present", "late"] },
        },
        select: {
          participantId: true,
          eventId: true,
          participant: {
            select: { id: true, name: true, group: { select: { id: true, name: true } } },
          },
        },
      });

      // Count per participant
      const participantAttendance = new Map<
        string,
        { name: string; groupId: string; groupName: string; attended: number }
      >();

      for (const rec of recentRecords) {
        const existing = participantAttendance.get(rec.participantId);
        if (existing) {
          existing.attended++;
        } else {
          participantAttendance.set(rec.participantId, {
            name: rec.participant.name,
            groupId: rec.participant.group.id,
            groupName: rec.participant.group.name,
            attended: 1,
          });
        }
      }

      // Get events grouped by groupId for the 7 day period
      const eventsByGroup7 = await db.attendanceEvent.groupBy({
        by: ["groupId"],
        where: {
          groupId: { in: groupIds },
          eventDate: { gte: sevenDaysAgo, lte: todayEnd },
          isClosed: true,
        },
        _count: true,
      });

      const eventsPerGroupMap = new Map(
        eventsByGroup7.map((g) => [g.groupId, g._count])
      );

      // Build top performers list
      topPerformers = Array.from(participantAttendance.entries())
        .map(([pid, data]) => {
          const totalEvents = eventsPerGroupMap.get(data.groupId) || 0;
          const rate = totalEvents > 0 ? Math.round((data.attended / totalEvents) * 100) : 0;
          return {
            id: pid,
            name: data.name,
            groupName: data.groupName,
            attended: data.attended,
            total: totalEvents,
            rate,
          };
        })
        .filter((p) => p.total > 0)
        .sort((a, b) => b.rate - a.rate || b.attended - a.attended)
        .slice(0, 5);
    }

    // ==================== NEW DATA: Needs Attention ====================
    const needsAttention: Array<{
      type: "low_attendance" | "unclosed_yesterday";
      groupId?: string;
      groupName?: string;
      eventId?: string;
      eventTitle?: string;
      rate?: number;
      message: string;
    }> = [];

    // Groups below 50% today
    for (const gb of groupBreakdown) {
      if (
        gb.todayEventStatus !== "none" &&
        gb.totalParticipants > 0 &&
        gb.todayProgress < 50
      ) {
        needsAttention.push({
          type: "low_attendance",
          groupId: gb.id,
          groupName: gb.name,
          rate: gb.todayProgress,
          message: `${gb.name} is at ${gb.todayProgress}% attendance today`,
        });
      }
    }

    // Unclosed events from yesterday
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const unclosedYesterdayEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: yesterdayStart, lt: todayStart },
        isClosed: false,
      },
      include: { group: true },
    });

    for (const ev of unclosedYesterdayEvents) {
      needsAttention.push({
        type: "unclosed_yesterday",
        eventId: ev.id,
        eventTitle: ev.title,
        groupName: ev.group.name,
        message: `"${ev.title}" (${ev.group.name}) from yesterday is still open`,
      });
    }

    // Resolve closedBy names from StaffMeta
    const closedByIds = todayEvents
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

    // Build events list with counts
    const eventList = todayEvents.map((e) => {
      const pCount = participantCountMap.get(e.groupId) || 0;
      const mCount = e._count.records;
      return {
        id: e.id,
        title: e.title,
        groupName: e.group.name,
        groupId: e.groupId,
        eventDate: e.eventDate.toISOString(),
        isClosed: e.isClosed,
        participantCount: pCount,
        markedCount: mCount,
        progress: pCount > 0 ? Math.round((mCount / pCount) * 100) : 0,
        closedAt: e.closedAt?.toISOString() || null,
        closedByName: e.closedBy ? closedByNameMap.get(e.closedBy) || null : null,
      };
    });

    // Active groups count
    const activeGroups = groupIds.length;

    // Build attention items (legacy format kept for backward compat)
    const attentionItems: Array<{
      type: string;
      message: string;
      severity: string;
    }> = [];

    if (unclosedYesterdayEvents.length > 0) {
      attentionItems.push({
        type: "unclosed_event",
        message: `${unclosedYesterdayEvents.length} event(s) from yesterday still open`,
        severity: "warning",
      });
    }

    if (openEvents.length > 0 && openEvents.some((e) => e._count.records === 0)) {
      const unmarkedCount = openEvents.filter(
        (e) => e._count.records === 0
      ).length;
      attentionItems.push({
        type: "unmarked_event",
        message: `${unmarkedCount} event(s) have no attendance marked yet`,
        severity: "info",
      });
    }

    // Count open uncompleted events for badge
    const openUncompleted = todayEvents.filter(
      (e) => !e.isClosed && e._count.records < (participantCountMap.get(e.groupId) || 0)
    ).length;

    // ==================== ATTENDANCE WARNINGS COUNT ====================
    // Count participants with warnings across all groups in the park
    let totalWarnings = 0;

    if (groupIds.length > 0) {
      // Get batch settings for all batches in the park (via groupIds)
      const batchesWithSettings = await db.batch.findMany({
        where: {
          groups: { some: { id: { in: groupIds } } },
          isActive: true,
        },
        include: { settings: true },
      });

      const batchSettingsMap = new Map(
        batchesWithSettings.map((b) => [
          b.id,
          b.settings || { warningAbsents: 3, dropoutAbsents: 6 },
        ])
      );

      // Get all active participants in the groups
      const allParticipants = await db.participant.findMany({
        where: { groupId: { in: groupIds }, state: "active" },
        select: { id: true, groupId: true },
      });

      if (allParticipants.length > 0) {
        // Get group-to-batch mapping
        const groupsForBatch = await db.group.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, batchId: true },
        });
        const groupBatchMap = new Map(
          groupsForBatch.map((g) => [g.id, g.batchId])
        );

        // Get all attendance events for these groups, ordered by date DESC
        const allEvents = await db.attendanceEvent.findMany({
          where: { groupId: { in: groupIds } },
          select: { id: true, eventDate: true, groupId: true },
          orderBy: { eventDate: "desc" },
        });

        const eventIds = allEvents.map((e) => e.id);

        // Get all attendance records
        const allRecords = await db.attendanceRecord.findMany({
          where: {
            eventId: { in: eventIds },
            participantId: { in: allParticipants.map((p) => p.id) },
          },
          select: { eventId: true, participantId: true, status: true },
        });

        // Build eventId -> Set of absent participantIds
        const absentByEvent = new Map<string, Set<string>>();
        const attendedByParticipant = new Map<string, Set<string>>();

        for (const rec of allRecords) {
          if (rec.status === "absent") {
            const set = absentByEvent.get(rec.eventId) || new Set();
            set.add(rec.participantId);
            absentByEvent.set(rec.eventId, set);
          } else if (rec.status === "present" || rec.status === "late") {
            const set = attendedByParticipant.get(rec.participantId) || new Set();
            set.add(rec.eventId);
            attendedByParticipant.set(rec.participantId, set);
          }
        }

        // Group events by groupId for efficient lookup
        const eventsByGroup = new Map<string, typeof allEvents>();
        for (const ev of allEvents) {
          const arr = eventsByGroup.get(ev.groupId) || [];
          arr.push(ev);
          eventsByGroup.set(ev.groupId, arr);
        }

        // Check each participant
        for (const participant of allParticipants) {
          const batchId = groupBatchMap.get(participant.groupId);
          const settings = batchId ? batchSettingsMap.get(batchId) : null;
          const warningAbsents = settings?.warningAbsents || 3;
          const dropoutAbsents = settings?.dropoutAbsents || 6;
          const criticalThreshold = Math.ceil(warningAbsents * 0.67);

          const groupEvents = eventsByGroup.get(participant.groupId) || [];
          const participantAttended = attendedByParticipant.get(participant.id);

          let consecutiveAbsents = 0;
          for (const event of groupEvents) {
            const absentSet = absentByEvent.get(event.id);
            if (absentSet && absentSet.has(participant.id)) {
              consecutiveAbsents++;
            } else if (participantAttended && participantAttended.has(event.id)) {
              break;
            }
          }

          if (
            consecutiveAbsents >= dropoutAbsents ||
            consecutiveAbsents >= warningAbsents ||
            consecutiveAbsents >= criticalThreshold
          ) {
            totalWarnings++;
          }
        }
      }
    }

    return NextResponse.json({
      park: park
        ? {
            id: park.id,
            name: park.name,
            cityName: park.city?.name || "Unknown",
          }
        : null,
      userName: user.name || null,
      todayDate: formatPKT(new Date(), "yyyy-MM-dd"),
      todayEvents: {
        total: todayEvents.length,
        open: openEvents.length,
        closed: closedEvents.length,
      },
      recentSummary: {
        last7DaysEvents: last7DaysEvents.length,
        last7DaysAttendanceRate: Math.round(attendanceRate * 100),
        prevWeekAttendanceRate: Math.round(prevAttendanceRate * 100),
        totalParticipants,
        activeGroups,
      },
      // NEW fields
      attendanceTrend,
      todayAttendance: attendanceTrend.length > 0
        ? {
            present: attendanceTrend[attendanceTrend.length - 1].present,
            late: attendanceTrend[attendanceTrend.length - 1].late,
            absent: attendanceTrend[attendanceTrend.length - 1].absent,
            total: attendanceTrend[attendanceTrend.length - 1].marked,
          }
        : { present: 0, late: 0, absent: 0, total: 0 },
      groupBreakdown,
      topPerformers,
      needsAttention,
      openUncompletedCount: openUncompleted,
      unclosedYesterdayCount: unclosedYesterdayEvents.length,
      warningsCount: totalWarnings,
      // Existing fields
      attentionItems,
      events: eventList,
    });
  } catch (error) {
    console.error("Park dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
