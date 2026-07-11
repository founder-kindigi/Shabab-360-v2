import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { PKT, toZonedTime, formatPKT, todayPKT } from "@/lib/timezone";
import { startOfDay, subDays, format, startOfWeek, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "attendance-overview";
  const cityId = searchParams.get("cityId") || undefined;
  const parkId = searchParams.get("parkId") || undefined;
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10), 1), 365);

  // Fire audit log (fire-and-forget)
  logAudit({
    action: "VIEW_REPORT",
    entityType: "report",
    entityId: type,
    newValues: { type, cityId, parkId, days },
  }).catch(() => {});

  const validTypes = ["attendance-overview", "city-comparison", "park-comparison", "trend"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  // Compute PKT date range
  const nowPKT = toZonedTime(new Date(), PKT);
  const startDatePKT = subDays(startOfDay(nowPKT), days - 1);
  const startDateUTC = new Date(startDatePKT.toISOString());

  switch (type) {
    case "attendance-overview":
      return getAttendanceOverview(startDateUTC, cityId, parkId);
    case "city-comparison":
      return getCityComparison(startDateUTC);
    case "park-comparison":
      return getParkComparison(startDateUTC, cityId);
    case "trend":
      return getTrend(startDateUTC, days, cityId, parkId);
    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
}

async function getAttendanceOverview(startDateUTC: Date, cityId?: string, parkId?: string) {
  // Build where clause for attendance events in range
  const eventWhere: Record<string, unknown> = {
    eventDate: { gte: startDateUTC },
  };
  if (parkId) {
    eventWhere.group = { batch: { parkId } };
  } else if (cityId) {
    eventWhere.group = { batch: { park: { cityId } } };
  }

  // Fetch events with records
  const events = await db.attendanceEvent.findMany({
    where: eventWhere,
    include: {
      records: true,
      group: {
        select: {
          id: true,
          batch: {
            select: {
              id: true,
              park: { select: { id: true, cityId: true } },
            },
          },
        },
      },
    },
    orderBy: { eventDate: "asc" },
  });

  const totalEvents = events.length;
  let totalRecords = 0;
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalExcused = 0;
  let totalUnmarked = 0;

  // Count total unique participants (all participants in relevant groups)
  const groupIds = [...new Set(events.map((e) => e.groupId))];
  const participantCounts = await db.participant.groupBy({
    by: ["groupId"],
    where: { groupId: { in: groupIds }, state: "active" },
    _count: { id: true },
  });
  const totalParticipants = participantCounts.reduce((sum, g) => sum + g._count.id, 0);

  // Daily breakdown
  const dailyMap = new Map<string, { marked: number; total: number; present: number; absent: number; late: number; excused: number; unmarked: number }>();

  for (const event of events) {
    const eventDatePKT = toZonedTime(event.eventDate, PKT);
    const dateKey = format(eventDatePKT, "yyyy-MM-dd");

    // Get group participant count
    const groupInfo = participantCounts.find((g) => g.groupId === event.groupId);
    const groupTotal = groupInfo?._count.id || 0;

    const existing = dailyMap.get(dateKey) || { marked: 0, total: 0, present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };

    existing.total += groupTotal;
    existing.marked += event.records.length;

    for (const record of event.records) {
      totalRecords++;
      switch (record.status) {
        case "present":
          totalPresent++;
          existing.present++;
          break;
        case "absent":
          totalAbsent++;
          existing.absent++;
          break;
        case "late":
          totalLate++;
          existing.late++;
          break;
        case "excused":
          totalExcused++;
          existing.excused++;
          break;
        default:
          totalUnmarked++;
          existing.unmarked++;
      }
    }

    dailyMap.set(dateKey, existing);
  }

  // Build daily array sorted by date
  const dailyRates = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      rate: data.total > 0 ? Math.round((data.marked / data.total) * 100) : 0,
      marked: data.marked,
      total: data.total,
    }));

  // Overall rate
  const overallRate = totalParticipants > 0 && totalEvents > 0
    ? Math.round((totalRecords / (totalParticipants * totalEvents)) * 100)
    : 0;

  // Day-of-week breakdown
  const dowMap: Record<number, { totalRate: number; count: number }> = {};
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const event of events) {
    const eventDatePKT = toZonedTime(event.eventDate, PKT);
    const dow = eventDatePKT.getDay();
    const groupInfo = participantCounts.find((g) => g.groupId === event.groupId);
    const groupTotal = groupInfo?._count.id || 0;
    const rate = groupTotal > 0 ? (event.records.filter((r) => r.status === "present" || r.status === "late").length / groupTotal) * 100 : 0;

    if (!dowMap[dow]) dowMap[dow] = { totalRate: 0, count: 0 };
    dowMap[dow].totalRate += rate;
    dowMap[dow].count++;
  }

  const dayOfWeekBreakdown = Object.entries(dowMap)
    .map(([dow, data]) => ({
      day: dowNames[parseInt(dow)],
      dayIndex: parseInt(dow),
      avgRate: Math.round(data.totalRate / data.count),
      events: data.count,
    }))
    .sort((a, b) => a.dayIndex - b.dayIndex);

  return NextResponse.json({
    totalEvents,
    totalRecords,
    overallRate,
    dailyRates,
    statusDistribution: {
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate,
      excused: totalExcused,
      unmarked: totalUnmarked,
    },
    dayOfWeekBreakdown,
    activeParticipants: totalParticipants,
  });
}

async function getCityComparison(startDateUTC: Date) {
  const cities = await db.city.findMany({
    where: { isActive: true },
    include: {
      parks: {
        where: { isActive: true },
        include: {
          batches: {
            where: { isActive: true },
            include: {
              groups: {
                where: { isActive: true },
                include: {
                  attendanceEvents: {
                    where: { eventDate: { gte: startDateUTC } },
                    include: { records: true },
                  },
                  _count: { select: { participants: { where: { state: "active" } } } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const cityStats = cities.map((city) => {
    let totalParticipants = 0;
    let totalEvents = 0;
    let totalRecords = 0;
    let totalPossible = 0;
    let topParkRate = 0;
    let topParkName = "";

    for (const park of city.parks) {
      let parkParticipants = 0;
      let parkRecords = 0;
      let parkPossible = 0;
      let parkEvents = 0;

      for (const batch of park.batches) {
        for (const group of batch.groups) {
          parkParticipants += group._count.participants;
          parkEvents += group.attendanceEvents.length;
          parkPossible += group._count.participants * group.attendanceEvents.length;
          parkRecords += group.attendanceEvents.reduce((sum, e) => sum + e.records.length, 0);
        }
      }

      totalParticipants += parkParticipants;
      totalEvents += parkEvents;
      totalRecords += parkRecords;
      totalPossible += parkPossible;

      const parkRate = parkPossible > 0 ? (parkRecords / parkPossible) * 100 : 0;
      if (parkRate > topParkRate && parkEvents > 0) {
        topParkRate = parkRate;
        topParkName = park.name;
      }
    }

    const avgRate = totalPossible > 0 ? Math.round((totalRecords / totalPossible) * 100) : 0;

    return {
      cityId: city.id,
      name: city.name,
      parksCount: city.parks.length,
      totalParticipants,
      totalEvents,
      avgRate,
      topPark: topParkName,
    };
  });

  cityStats.sort((a, b) => b.avgRate - a.avgRate);

  return NextResponse.json(cityStats);
}

async function getParkComparison(startDateUTC: Date, cityId?: string) {
  if (!cityId) {
    return NextResponse.json({ error: "cityId is required for park comparison" }, { status: 400 });
  }

  const parks = await db.park.findMany({
    where: { cityId, isActive: true },
    include: {
      batches: {
        where: { isActive: true },
        include: {
          groups: {
            where: { isActive: true },
            include: {
              attendanceEvents: {
                where: { eventDate: { gte: startDateUTC } },
                include: { records: true },
              },
              _count: { select: { participants: { where: { state: "active" } } } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const parkStats = parks.map((park) => {
    let totalParticipants = 0;
    let totalGroups = 0;
    let totalEvents = 0;
    let totalRecords = 0;
    let totalPossible = 0;

    for (const batch of park.batches) {
      for (const group of batch.groups) {
        totalGroups++;
        totalParticipants += group._count.participants;
        totalEvents += group.attendanceEvents.length;
        totalPossible += group._count.participants * group.attendanceEvents.length;
        totalRecords += group.attendanceEvents.reduce((sum, e) => sum + e.records.length, 0);
      }
    }

    const avgRate = totalPossible > 0 ? Math.round((totalRecords / totalPossible) * 100) : 0;

    return {
      parkId: park.id,
      name: park.name,
      totalParticipants,
      groups: totalGroups,
      totalEvents,
      avgRate,
    };
  });

  parkStats.sort((a, b) => b.avgRate - a.avgRate);

  return NextResponse.json(parkStats);
}

async function getTrend(startDateUTC: Date, days: number, cityId?: string, parkId?: string) {
  const eventWhere: Record<string, unknown> = {
    eventDate: { gte: startDateUTC },
  };
  if (parkId) {
    eventWhere.group = { batch: { parkId } };
  } else if (cityId) {
    eventWhere.group = { batch: { park: { cityId } } };
  }

  const events = await db.attendanceEvent.findMany({
    where: eventWhere,
    include: {
      records: true,
      group: {
        select: {
          id: true,
          batch: {
            select: {
              id: true,
              park: { select: { id: true, cityId: true } },
            },
          },
        },
      },
    },
    orderBy: { eventDate: "asc" },
  });

  // Get group participant counts
  const groupIds = [...new Set(events.map((e) => e.groupId))];
  const participantCounts = await db.participant.groupBy({
    by: ["groupId"],
    where: { groupId: { in: groupIds }, state: "active" },
    _count: { id: true },
  });

  // Group by week
  const weekMap = new Map<string, { events: number; records: number; total: number }>();

  for (const event of events) {
    const eventDatePKT = toZonedTime(event.eventDate, PKT);
    const weekStartPKT = startOfWeek(eventDatePKT, { weekStartsOn: 1 }); // Monday
    const weekKey = format(weekStartPKT, "yyyy-MM-dd");

    const existing = weekMap.get(weekKey) || { events: 0, records: 0, total: 0 };
    existing.events++;
    existing.records += event.records.length;

    const groupInfo = participantCounts.find((g) => g.groupId === event.groupId);
    existing.total += groupInfo?._count.id || 0;

    weekMap.set(weekKey, existing);
  }

  const weeklyTrend = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, data]) => ({
      weekStart,
      rate: data.total > 0 ? Math.round((data.records / data.total) * 100) : 0,
      events: data.events,
      records: data.records,
    }));

  return NextResponse.json(weeklyTrend);
}