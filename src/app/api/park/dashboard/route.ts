import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, formatPKT, toPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";

type SessionUser = {
  id?: string;
  role?: string;
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
        closer: { include: { user: { select: { name: true } } } },
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

    // Build events list with counts
    const eventList = todayEvents.map((e) => {
      const pCount = participantCountMap.get(e.groupId) || 0;
      const mCount = e._count.records;
      // Get breakdown from records
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
        closedByName: e.closer?.user.name || null,
      };
    });

    // Active groups count
    const activeGroups = groupIds.length;

    // Unclosed events from yesterday
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const unclosedYesterday = await db.attendanceEvent.count({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: yesterdayStart, lt: todayStart },
        isClosed: false,
      },
    });

    // Build attention items
    const attentionItems: Array<{
      type: string;
      message: string;
      severity: string;
    }> = [];

    if (unclosedYesterday > 0) {
      attentionItems.push({
        type: "unclosed_event",
        message: `${unclosedYesterday} event(s) from yesterday still open`,
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

    return NextResponse.json({
      park: park
        ? {
            id: park.id,
            name: park.name,
            cityName: park.city?.name || "Unknown",
          }
        : null,
      todayDate: formatPKT(new Date(), "yyyy-MM-dd"),
      todayEvents: {
        total: todayEvents.length,
        open: openEvents.length,
        closed: closedEvents.length,
      },
      recentSummary: {
        last7DaysEvents: last7DaysEvents.length,
        last7DaysAttendanceRate: Math.round(attendanceRate * 100),
        totalParticipants,
        activeGroups,
      },
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