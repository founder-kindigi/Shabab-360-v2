import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, formatPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { moneyToNumber } from "@/lib/money";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
  name?: string | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "city_head") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const capabilityAuth = await requireCapability("dashboard.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  if (!user.assignedCityId) {
    return NextResponse.json({ error: "No city assigned" }, { status: 403 });
  }

  const cityId = user.assignedCityId;

  try {
    // Fire audit log (fire-and-forget)
    logAudit({
      userId: user.id,
      action: "view_dashboard",
      entityType: "city_head_dashboard",
      entityId: cityId,
    });

    // Get city
    const city = await db.city.findUnique({
      where: { id: cityId },
    });

    if (!city) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    // Get all parks in this city
    const parks = await db.park.findMany({
      where: { cityId, isActive: true },
      orderBy: { name: "asc" },
    });

    const parkIds = parks.map((p) => p.id);

    // Get counts
    const [batchCount, groupCount, totalParticipants, totalStaff] = await Promise.all([
      db.batch.count({
        where: { parkId: { in: parkIds }, isActive: true },
      }),
      db.group.count({
        where: { batch: { parkId: { in: parkIds } }, isActive: true },
      }),
      db.participant.count({
        where: {
          group: { batch: { parkId: { in: parkIds } } },
          state: "active",
        },
      }),
      db.staffMeta.count({
        where: { assignedCityId: cityId, isActive: true },
      }),
    ]);

    // Today's date range in PKT
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();

    // Get all group IDs in the city for event queries
    const groupsInCity = await db.group.findMany({
      where: { batch: { parkId: { in: parkIds } }, isActive: true },
      select: { id: true, name: true, batchId: true },
    });
    const groupIds = groupsInCity.map((g) => g.id);

    // Map groupId -> groupName
    const groupNameMap = new Map(groupsInCity.map((g) => [g.id, g.name]));

    // Map groupId -> batchId
    const groupBatchMap = new Map(groupsInCity.map((g) => [g.id, g.batchId]));

    // Get batch names
    const batchIds = [...new Set(groupsInCity.map((g) => g.batchId))];
    const batches = await db.batch.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, name: true, parkId: true },
    });
    const batchNameMap = new Map(batches.map((b) => [b.id, b.name]));
    const batchParkMap = new Map(batches.map((b) => [b.id, b.parkId]));

    // Park name map
    const parkNameMap = new Map(parks.map((p) => [p.id, p.name]));

    // Today's events
    const todayEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "desc" },
    });

    // Participant count per group
    const groupParticipantCounts = await db.participant.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds }, state: "active" },
      _count: true,
    });
    const participantCountMap = new Map(
      groupParticipantCounts.map((g) => [g.groupId, g._count])
    );

    // Resolve closedBy names
    const closedByIds = todayEvents
      .map((e) => e.closedBy)
      .filter((id): id is string => !!id);
    const closedByStaff =
      closedByIds.length > 0
        ? await db.staffMeta.findMany({
            where: { id: { in: closedByIds } },
            include: { user: { select: { name: true } } },
          })
        : [];
    const closedByNameMap = new Map(
      closedByStaff.map((s) => [s.id, s.user.name])
    );

    // Build today's events list
    const todayEventsList = todayEvents.map((e) => {
      const pCount = participantCountMap.get(e.groupId) || 0;
      const mCount = e._count.records;
      const batchId = groupBatchMap.get(e.groupId);
      const parkId = batchId ? batchParkMap.get(batchId) : undefined;

      return {
        id: e.id,
        title: e.title,
        groupName: groupNameMap.get(e.groupId) || "Unknown Group",
        parkName: parkId ? parkNameMap.get(parkId) || "Unknown Park" : "Unknown Park",
        isClosed: e.isClosed,
        participantCount: pCount,
        markedCount: mCount,
        progress: pCount > 0 ? Math.round((mCount / pCount) * 100) : 0,
        closedAt: e.closedAt?.toISOString() || null,
        closedByName: e.closedBy ? closedByNameMap.get(e.closedBy) || null : null,
      };
    });

    // 7-day attendance rate
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
    const cityAttendanceRate7Day =
      totalCapacityLast7Days > 0
        ? Math.round((totalMarksLast7Days / totalCapacityLast7Days) * 100)
        : 0;

    // Today's attendance rate
    let todayAttendanceRate = 0;
    if (todayEvents.length > 0) {
      const todayMarks = todayEvents.reduce((s, e) => s + e._count.records, 0);
      const todayCapacity = todayEvents.reduce((s, e) => {
        return s + (participantCountMap.get(e.groupId) || 0);
      }, 0);
      todayAttendanceRate = todayCapacity > 0 ? Math.round((todayMarks / todayCapacity) * 100) : 0;
    }

    // ── 14-day trend for AttendanceChart ──
    const fourteenDaysAgo = new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000);
    const last14DaysEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: fourteenDaysAgo, lte: todayEnd },
        isClosed: true,
      },
      select: {
        id: true,
        eventDate: true,
        groupId: true,
        records: {
          select: { status: true },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    // Build date-keyed map for the 14 days
    const trendMap = new Map<string, { present: number; late: number; absent: number }>();
    for (const evt of last14DaysEvents) {
      const dateKey = formatPKT(new Date(evt.eventDate), "yyyy-MM-dd");
      const existing = trendMap.get(dateKey) || { present: 0, late: 0, absent: 0 };
      for (const rec of evt.records) {
        if (rec.status === "present") existing.present++;
        else if (rec.status === "late") existing.late++;
        else if (rec.status === "absent") existing.absent++;
      }
      trendMap.set(dateKey, existing);
    }

    const trend14Day: Array<{ date: string; present: number; late: number; absent: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const dayDate = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = formatPKT(dayDate, "yyyy-MM-dd");
      const data = trendMap.get(dateKey) || { present: 0, late: 0, absent: 0 };
      trend14Day.push({ date: dateKey, ...data });
    }

    // Park-level breakdown with 7-day rate per park
    const parkBreakdown = await Promise.all(
      parks.map(async (park) => {
        const parkBatchIds = (
          await db.batch.findMany({
            where: { parkId: park.id, isActive: true },
            select: { id: true },
          })
        ).map((b) => b.id);

        const parkGroupIds = (
          await db.group.findMany({
            where: { batchId: { in: parkBatchIds }, isActive: true },
            select: { id: true },
          })
        ).map((g) => g.id);

        const parkParticipants = await db.participant.count({
          where: { groupId: { in: parkGroupIds }, state: "active" },
        });

        // Park-level 7-day attendance
        const parkLast7Events = await db.attendanceEvent.findMany({
          where: {
            groupId: { in: parkGroupIds },
            eventDate: { gte: sevenDaysAgo, lte: todayEnd },
            isClosed: true,
          },
          include: { _count: { select: { records: true } } },
        });

        const parkMarks = parkLast7Events.reduce(
          (s, e) => s + e._count.records,
          0
        );
        const parkCapacity = parkLast7Events.reduce((s, e) => {
          const pCount =
            participantCountMap.get(e.groupId) ||
            parkParticipants;
          return s + pCount;
        }, 0);
        const parkRate =
          parkCapacity > 0 ? Math.round((parkMarks / parkCapacity) * 100) : 0;

        return {
          id: park.id,
          name: park.name,
          participants: parkParticipants,
          groups: parkGroupIds.length,
          sevenDayRate: parkRate,
        };
      })
    );

    // Recent activity: audit log entries for users/entities in this city (Finding 2.1)
    // Derive city staff through all supported hierarchy assignments (city, park, group)
    const cityStaff = await db.staffMeta.findMany({
      where: {
        OR: [
          { assignedCityId: cityId },
          ...(parkIds.length > 0 ? [{ assignedParkId: { in: parkIds } }] : []),
          ...(groupIds.length > 0 ? [{ assignedGroupId: { in: groupIds } }] : []),
        ],
      },
      select: { userId: true },
    });
    const cityUserIds = cityStaff
      .map((s) => s.userId)
      .filter((id): id is string => !!id);

    const cityAuditLogs = await db.auditLog.findMany({
      take: 5,
      where: {
        OR: [
          { entityType: "city", entityId: cityId },
          { userId: { in: cityUserIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });

    // ── Fees overview ──
    // Get all batch IDs in the city
    const allCityBatchIds = (
      await db.batch.findMany({
        where: { parkId: { in: parkIds }, isActive: true },
        select: { id: true },
      })
    ).map((b) => b.id);

    const nowPKT = todayStart;
    const monthStart = new Date(nowPKT.getFullYear(), nowPKT.getMonth(), 1);

    // Total fee events in the city
    const cityFeeEvents = await db.feeEvent.findMany({
      where: { batchId: { in: allCityBatchIds }, isActive: true },
      select: { id: true, amount: true },
    });
    const totalFeeExpected = cityFeeEvents.reduce(
      (sum, feeEvent) => sum + moneyToNumber(feeEvent.amount),
      0
    );

    // Payments collected this month
    let totalCollectedThisMonth = 0;
    let totalPendingFees = 0;

    if (cityFeeEvents.length > 0) {
      const feeEventIds = cityFeeEvents.map((f) => f.id);

      const paymentsThisMonth = await db.payment.aggregate({
        where: {
          feeEventId: { in: feeEventIds },
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      });
      totalCollectedThisMonth = moneyToNumber(paymentsThisMonth._sum.amount);

      const allPayments = await db.payment.aggregate({
        where: {
          feeEventId: { in: feeEventIds },
        },
        _sum: { amount: true },
      });
      const totalAllPaid = moneyToNumber(allPayments._sum.amount);
      totalPendingFees = Math.max(totalFeeExpected - totalAllPaid, 0);
    }

    return NextResponse.json({
      city: {
        id: city.id,
        name: city.name,
        code: city.code,
      },
      metrics: {
        parkCount: parks.length,
        batchCount,
        groupCount,
        totalParticipants,
        totalStaff,
        attendanceRate7Day: cityAttendanceRate7Day,
        todayAttendanceRate,
      },
      todayDate: formatPKT(new Date(), "yyyy-MM-dd"),
      todayEvents: todayEventsList,
      parkBreakdown,
      recentActivity: cityAuditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        userName: a.user?.name || "System",
        createdAt: a.createdAt.toISOString(),
      })),
      trend14Day,
      feesOverview: {
        totalCollectedThisMonth: Math.round(totalCollectedThisMonth),
        totalPendingFees: Math.round(totalPendingFees),
      },
    });
  } catch (error) {
    console.error("City head dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
