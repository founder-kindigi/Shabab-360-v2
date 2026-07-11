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