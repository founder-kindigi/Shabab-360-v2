import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { moneyToNumber } from "@/lib/money";
import { PKT, toZonedTime, formatPKT, todayPKT } from "@/lib/timezone";
import {
  optionalIdentifier,
  optionalInteger,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { startOfDay, subDays, format, startOfWeek, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, subMonths } from "date-fns";
import { z } from "zod";

const reportTypes = [
  "attendance-overview",
  "city-comparison",
  "park-comparison",
  "trend",
  "fee-by-park",
  "registration-report",
  "staff-report",
] as const;

const reportQuerySchema = z.object({
  type: z.enum(reportTypes).default("attendance-overview"),
  cityId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  days: optionalInteger(1, 365).default(30),
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("reports.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const parsedQuery = reportQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const { type, cityId, parkId, days } = parsedQuery.data;

  // Fire audit log (fire-and-forget)
  logAudit({
    action: "VIEW_REPORT",
    entityType: "report",
    entityId: type,
    newValues: { type, cityId, parkId, days },
  }).catch(() => {});

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
    case "fee-by-park":
      return getFeeByPark(cityId);
    case "registration-report":
      return getRegistrationReport(startDateUTC);
    case "staff-report":
      return getStaffReport();
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
              park: { select: { id: true, cityId: true, city: { select: { id: true, name: true } } } },
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

  const cityRateMap = new Map<string, { cityId: string; cityName: string; totalRecords: number; attended: number }>();
  for (const event of events) {
    const city = event.group.batch.park.city;
    const existing = cityRateMap.get(city.id) || {
      cityId: city.id,
      cityName: city.name,
      totalRecords: 0,
      attended: 0,
    };

    for (const record of event.records) {
      existing.totalRecords++;
      if (record.status === "present" || record.status === "late") existing.attended++;
    }
    cityRateMap.set(city.id, existing);
  }

  const cityRates = Array.from(cityRateMap.values())
    .map((city) => ({
      ...city,
      rate: city.totalRecords > 0 ? Math.round((city.attended / city.totalRecords) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  const paymentWhere = {
    createdAt: { gte: startDateUTC },
    ...(parkId
      ? { feeEvent: { batch: { parkId } } }
      : cityId
        ? { feeEvent: { batch: { park: { cityId } } } }
        : {}),
  };
  const paymentTotal = await db.payment.aggregate({ where: paymentWhere, _sum: { amount: true } });
  const totalFeesCollected = moneyToNumber(paymentTotal._sum.amount);

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
    cityAttendanceRates: cityRates.map(r => ({
      cityId: r.cityId,
      cityName: r.cityName,
      rate: Number(r.rate),
      totalRecords: Number(r.totalRecords),
      attended: Number(r.attended),
    })),
    totalFeesCollected: Number(totalFeesCollected),
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

async function getFeeByPark(cityId?: string) {
  const parks = await db.park.findMany({
    where: cityId ? { cityId } : {},
    select: {
      id: true,
      name: true,
      city: { select: { name: true } },
      batches: {
        select: {
          feeEvents: {
            select: { payments: { select: { amount: true } } },
          },
        },
      },
    },
  });

  const parkFees = parks
    .map((park) => ({
      parkId: park.id,
      parkName: park.name,
      cityName: park.city.name,
      totalCollected: park.batches.reduce(
        (parkTotal, batch) =>
          parkTotal + batch.feeEvents.reduce(
            (feeTotal, feeEvent) => feeTotal + feeEvent.payments.reduce(
              (paymentTotal, payment) => paymentTotal + moneyToNumber(payment.amount),
              0,
            ),
            0,
          ),
        0,
      ),
    }))
    .filter((park) => park.totalCollected > 0)
    .sort((a, b) => b.totalCollected - a.totalCollected)
    .slice(0, 10);

  return NextResponse.json(
    parkFees.map(r => ({
      parkId: r.parkId,
      parkName: r.parkName,
      cityName: r.cityName,
      totalCollected: r.totalCollected,
    }))
  );
}

async function getRegistrationReport(startDateUTC: Date) {
  const nowPKT = toZonedTime(new Date(), PKT);

  // Registrations per month (last 12 months)
  const twelveMonthsAgo = subMonths(startOfMonth(nowPKT), 11);
  const participants = await db.participant.findMany({
    where: { createdAt: { gte: twelveMonthsAgo } },
    select: { id: true, gender: true, state: true, joinedAt: true, group: { select: { batch: { select: { park: { select: { id: true, cityId: true, name: true, city: { select: { id: true, name: true } } } } } } } } },
    orderBy: { joinedAt: "asc" },
  });

  // Monthly registrations
  const monthMap = new Map<string, number>();
  for (const p of participants) {
    const pDate = toZonedTime(p.joinedAt, PKT);
    const key = format(pDate, "yyyy-MM");
    const label = format(pDate, "MMM yyyy");
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  }
  const monthlyRegistrations = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, count], i, arr) => {
      const key = Array.from(monthMap.keys()).sort()[i];
      const pDate = parseISO(key + "-01");
      return { label: format(pDate, "yyyy-MM"), value: count };
    });

  // Gender distribution
  const genderMap = new Map<string, number>();
  for (const p of participants) {
    const g = p.gender || "unknown";
    genderMap.set(g, (genderMap.get(g) || 0) + 1);
  }
  const genderDistribution = Array.from(genderMap.entries())
    .map(([gender, count]) => ({ gender, count }))
    .sort((a, b) => b.count - a.count);

  // State distribution
  const stateMap = new Map<string, number>();
  for (const p of participants) {
    stateMap.set(p.state, (stateMap.get(p.state) || 0) + 1);
  }
  const stateDistribution = Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  // City-wise distribution
  const cityMap = new Map<string, { cityId: string; cityName: string; count: number }>();
  for (const p of participants) {
    const city = p.group?.batch?.park?.city;
    if (city) {
      const existing = cityMap.get(city.id) || { cityId: city.id, cityName: city.name, count: 0 };
      existing.count++;
      cityMap.set(city.id, existing);
    }
  }
  const cityDistribution = Array.from(cityMap.values()).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    monthlyRegistrations,
    genderDistribution,
    stateDistribution,
    cityDistribution,
    totalParticipants: participants.length,
  });
}

async function getStaffReport() {
  // Staff by role
  const staffByRole = await db.staffMeta.groupBy({
    by: ["role"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  // Staff growth over time (monthly, last 12 months)
  const nowPKT = toZonedTime(new Date(), PKT);
  const twelveMonthsAgo = subMonths(startOfMonth(nowPKT), 11);

  const allStaff = await db.staffMeta.findMany({
    where: { createdAt: { gte: twelveMonthsAgo } },
    select: { createdAt: true, isActive: true, role: true, assignedParkId: true },
    orderBy: { createdAt: "asc" },
  });

  // Monthly growth
  const monthMap = new Map<string, { label: string; count: number }>();
  for (const s of allStaff) {
    const pDate = toZonedTime(s.createdAt, PKT);
    const key = format(pDate, "yyyy-MM");
    const label = format(pDate, "MMM yyyy");
    const existing = monthMap.get(key) || { label, count: 0 };
    existing.count++;
    monthMap.set(key, existing);
  }
  const staffGrowth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => ({ label: key, value: data.count }));

  // Assignment coverage: how many parks have staff assigned
  const totalParks = await db.park.count({ where: { isActive: true } });
  const parksWithStaff = await db.staffMeta.groupBy({
    by: ["assignedParkId"],
    where: { assignedParkId: { not: null }, isActive: true },
  });
  const assignedParks = parksWithStaff.filter(p => p.assignedParkId !== null).length;

  // Total counts
  const totalStaff = await db.staffMeta.count();
  const activeStaff = await db.staffMeta.count({ where: { isActive: true } });

  return NextResponse.json({
    staffByRole: staffByRole.map(r => ({ role: r.role, count: r._count.id })),
    staffGrowth,
    assignmentCoverage: {
      totalParks,
      parksWithStaff: assignedParks,
      coveragePercent: totalParks > 0 ? Math.round((assignedParks / totalParks) * 100) : 0,
    },
    totalStaff,
    activeStaff,
    inactiveStaff: totalStaff - activeStaff,
  });
}
