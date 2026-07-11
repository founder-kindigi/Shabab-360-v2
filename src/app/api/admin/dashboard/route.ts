import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, formatPKT } from "@/lib/timezone";

/**
 * Build attendance trend for the last N days using a single query.
 * Returns array of { date, present, late, absent } grouped by event date.
 */
async function buildAttendanceTrend(
  whereClause: object,
  days: number
): Promise<{ date: string; present: number; late: number; absent: number }[]> {
  const todayStart = todayPKT();
  const startDate = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  // Single query: fetch all records for the date range, grouped via include
  const events = await db.attendanceEvent.findMany({
    where: {
      ...whereClause,
      eventDate: { gte: startDate, lte: todayStart },
      isClosed: true,
    },
    select: {
      eventDate: true,
      records: { select: { status: true } },
    },
    orderBy: { eventDate: "asc" },
  });

  // Build a map: date string -> { present, late, absent }
  const grouped = new Map<string, { present: number; late: number; absent: number }>();
  for (const ev of events) {
    const dateStr = formatPKT(ev.eventDate, "yyyy-MM-dd");
    const existing = grouped.get(dateStr) || { present: 0, late: 0, absent: 0 };
    for (const rec of ev.records) {
      if (rec.status === "present") existing.present++;
      else if (rec.status === "late") existing.late++;
      else if (rec.status === "absent") existing.absent++;
    }
    grouped.set(dateStr, existing);
  }

  // Fill in all days (even those with 0 records)
  const trend: { date: string; present: number; late: number; absent: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = formatPKT(dayStart, "yyyy-MM-dd");
    const counts = grouped.get(dateStr) || { present: 0, late: 0, absent: 0 };
    trend.push({ date: dateStr, ...counts });
  }

  return trend;
}

/**
 * Get today's attendance summary (present/late/absent counts).
 */
async function buildTodayAttendance(
  whereClause: object
): Promise<{ present: number; late: number; absent: number; total: number }> {
  const todayStart = todayPKT();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const todayRecords = await db.attendanceRecord.findMany({
    where: {
      event: {
        ...whereClause,
        eventDate: { gte: todayStart, lte: todayEnd },
      },
    },
    select: { status: true },
  });

  let present = 0;
  let late = 0;
  let absent = 0;
  for (const rec of todayRecords) {
    if (rec.status === "present") present++;
    else if (rec.status === "late") late++;
    else if (rec.status === "absent") absent++;
  }

  return { present, late, absent, total: todayRecords.length };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Get user's scope
  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");

  if (isHQ) {
    const [cities, parks, batches, groups, participants, staff] = await Promise.all([
      db.city.count({ where: { isActive: true } }),
      db.park.count({ where: { isActive: true } }),
      db.batch.count({ where: { isActive: true } }),
      db.group.count({ where: { isActive: true } }),
      db.participant.count(),
      db.staffMeta.count({ where: { isActive: true } }),
    ]);

    const now = new Date();

    const [recentActivity, activeBatches, cityStaff] = await Promise.all([
      db.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      db.batch.count({
        where: {
          isActive: true,
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      }),
      db.staffMeta.groupBy({
        by: ["role"],
        where: { isActive: true },
        _count: { role: true },
      }),
    ]);

    const cityBreakdown = await db.city.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { parks: true } },
      },
      orderBy: { name: "asc" },
    });

    // Count staff per city via park assignments
    const allCityStaff = await db.staffMeta.findMany({
      where: { isActive: true, assignedCityId: { not: null } },
      select: { assignedCityId: true, id: true },
    });
    const staffByCity = allCityStaff.reduce<Record<string, number>>((acc, s) => {
      if (s.assignedCityId) acc[s.assignedCityId] = (acc[s.assignedCityId] || 0) + 1;
    return acc;
    }, {});

    const cityBreakdownWithStaff = cityBreakdown.map((city) => ({
      ...city,
      _count: { ...city._count, staff: staffByCity[city.id] || 0 },
    }));

    // Attendance trend (last 14 days) — no group filter (all groups)
    const [attendanceTrend, todayAttendance] = await Promise.all([
      buildAttendanceTrend({}, 14),
      buildTodayAttendance({}),
    ]);

    // Gender distribution
    const genderGroups = await db.participant.groupBy({
      by: ["gender"],
      _count: { gender: true },
    });
    const genderDistribution: Record<string, number> = {};
    for (const g of genderGroups) {
      const key = g.gender || "unknown";
      genderDistribution[key] = g._count.gender;
    }

    // Fee collection summary
    const feeEvents = await db.feeEvent.findMany({
      where: { isActive: true },
      select: { id: true, amount: true },
    });
    const feeEventIds = feeEvents.map((f) => f.id);
    const totalExpected = feeEvents.reduce((sum, f) => sum + f.amount, 0);

    let totalCollected = 0;
    if (feeEventIds.length > 0) {
      const paymentSum = await db.payment.aggregate({
        where: { feeEventId: { in: feeEventIds } },
        _sum: { amount: true },
      });
      totalCollected = paymentSum._sum.amount || 0;
    }

    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    // ── Registration Trend (last 12 months) ─────────────────────────────────
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const registrationRows: { month: string; count: number }[] = await db.$queryRaw`
      SELECT
        strftime('%Y-%m', joined_at) as month,
        COUNT(*) as count
      FROM participants
      WHERE joined_at >= ${twelveMonthsAgo.toISOString()}
      GROUP BY strftime('%Y-%m', joined_at)
      ORDER BY month ASC
    `;

    const registrationTrend: { month: string; count: number }[] = [];
    const regMap = new Map(registrationRows.map((r) => [r.month, r.count]));
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      registrationTrend.push({ month: key, count: regMap.get(key) || 0 });
    }

    // ── Fee Collection Trend (last 6 months) ────────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const feeRows: { month: string; total: number }[] = await db.$queryRaw`
      SELECT
        strftime('%Y-%m', p.created_at) as month,
        SUM(p.amount) as total
      FROM payments p
      WHERE p.created_at >= ${sixMonthsAgo.toISOString()}
      GROUP BY strftime('%Y-%m', p.created_at)
      ORDER BY month ASC
    `;

    const feeCollectionTrend: { month: string; total: number }[] = [];
    const feeMap = new Map(feeRows.map((r) => [r.month, r.total]));
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      feeCollectionTrend.push({ month: key, total: feeMap.get(key) || 0 });
    }

    return NextResponse.json({
      cities,
      parks,
      batches,
      groups,
      participants,
      staff,
      activeBatches,
      cityStaff: cityStaff.map((cs) => ({
        role: cs.role,
        count: cs._count.role,
      })),
      recentActivity,
      cityBreakdown: cityBreakdownWithStaff,
      attendanceTrend,
      todayAttendance,
      genderDistribution,
      feeSummary: {
        totalExpected: Math.round(totalExpected),
        totalCollected: Math.round(totalCollected),
        collectionRate,
      },
      registrationTrend,
      feeCollectionTrend,
    });
  }

  // City-scoped
  if (user.role === "city_head" && user.assignedCityId) {
    const [parks, batches, groups, participants, attendanceEvents] =
      await Promise.all([
        db.park.count({
          where: { cityId: user.assignedCityId, isActive: true },
        }),
        db.batch.count({
          where: { park: { cityId: user.assignedCityId }, isActive: true },
        }),
        db.group.count({
          where: {
            batch: { park: { cityId: user.assignedCityId } },
            isActive: true,
          },
        }),
        db.participant.count({
          where: {
            group: { batch: { park: { cityId: user.assignedCityId } } },
          },
        }),
        db.attendanceEvent.count({
          where: {
            group: { batch: { park: { cityId: user.assignedCityId } } },
          },
        }),
      ]);

    // Get park IDs for this city to filter activity
    const cityParkIds = (
      await db.park.findMany({
        where: { cityId: user.assignedCityId, isActive: true },
        select: { id: true },
      })
    ).map((p) => p.id);

    // Get group IDs for the city for attendance filtering
    const cityGroupIds = (
      await db.group.findMany({
        where: {
          batch: { park: { cityId: user.assignedCityId } },
          isActive: true,
        },
        select: { id: true },
      })
    ).map((g) => g.id);

    const recentActivity = cityParkIds.length
      ? await db.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          where: {
            entityType: { in: ["park", "batch", "group", "participant"] },
            entityId: { in: cityParkIds },
          },
        })
      : [];

    // Attendance trend scoped to city groups
    const groupWhere = cityGroupIds.length > 0
      ? { groupId: { in: cityGroupIds } }
      : { id: "___none___" }; // ensures no results if no groups

    const [attendanceTrend, todayAttendance] = await Promise.all([
      buildAttendanceTrend(groupWhere, 14),
      buildTodayAttendance(groupWhere),
    ]);

    return NextResponse.json({
      parks,
      batches,
      groups,
      participants,
      attendanceEvents,
      recentActivity,
      cityParks: await db.park.findMany({
        where: { cityId: user.assignedCityId, isActive: true },
        include: { _count: { select: { batches: true } } },
        orderBy: { name: "asc" },
      }),
      attendanceTrend,
      todayAttendance,
    });
  }

  // Park-scoped
  if (
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    const todayStart = todayPKT();

    const [groups, participants, todayEvents, openEvents, totalEvents] =
      await Promise.all([
        db.group.count({
          where: { batch: { parkId: user.assignedParkId }, isActive: true },
        }),
        db.participant.count({
          where: { group: { batch: { parkId: user.assignedParkId } } },
        }),
        db.attendanceEvent.count({
          where: {
            group: { batch: { parkId: user.assignedParkId } },
            eventDate: { gte: todayStart },
          },
        }),
        db.attendanceEvent.count({
          where: {
            group: { batch: { parkId: user.assignedParkId } },
            eventDate: { gte: todayStart },
            isClosed: false,
          },
        }),
        db.attendanceEvent.count({
          where: {
            group: { batch: { parkId: user.assignedParkId } },
          },
        }),
      ]);

    const parkGroupIds = (
      await db.group.findMany({
        where: { batch: { parkId: user.assignedParkId }, isActive: true },
        select: { id: true },
      })
    ).map((g) => g.id);

    const groupWhere = parkGroupIds.length > 0
      ? { groupId: { in: parkGroupIds } }
      : { id: "___none___" };

    const [attendanceTrend, todayAttendance] = await Promise.all([
      buildAttendanceTrend(groupWhere, 14),
      buildTodayAttendance(groupWhere),
    ]);

    return NextResponse.json({
      groups,
      participants,
      todayEvents,
      openEvents,
      totalEvents,
      attendanceTrend,
      todayAttendance,
    });
  }

  // Guardian
  if (user.role === "guardian") {
    const guardian = await db.guardian.findFirst({
      where: { userId: user.id },
      include: {
        children: {
          include: {
            participant: {
              include: {
                group: { include: { batch: { include: { park: true } } } },
              },
            },
          },
        },
      },
    });
    return NextResponse.json({ guardian });
  }

  // Student
  if (user.role === "student") {
    const participant = await db.participant.findFirst({
      where: { userId: user.id },
      include: {
        group: { include: { batch: { include: { park: true } } } },
      },
    });
    return NextResponse.json({ participant });
  }

  return NextResponse.json({});
}