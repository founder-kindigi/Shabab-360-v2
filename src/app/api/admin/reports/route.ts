import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireCapability, requireRoleAndCapability } from "@/lib/auth/authorize";
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
  const capabilityAuth = await requireRoleAndCapability(["super_admin", "program_admin"], "reports.view");
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
  // Run all aggregations in the DB — do NOT load individual attendance records
  // into memory. Previously a 6-level deep include loaded every record for
  // every group/park/city which could be tens of thousands of rows.
  const [cities, participantsByGroup, eventsByGroup, recordsByEvent, parkNames] = await Promise.all([
    db.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, _count: { select: { parks: { where: { isActive: true } } } } },
      orderBy: { name: "asc" },
    }),
    db.participant.groupBy({
      by: ["groupId"],
      where: { state: "active", groupId: { not: null } },
      _count: { id: true },
    }),
    db.attendanceEvent.groupBy({
      by: ["groupId"],
      where: { eventDate: { gte: startDateUTC } },
      _count: { id: true },
    }),
    db.attendanceRecord.groupBy({
      by: ["eventId"],
      where: { event: { eventDate: { gte: startDateUTC } } },
      _count: { id: true },
    }),
    // need group→park→city mapping
    db.group.findMany({
      where: { isActive: true },
      select: {
        id: true,
        batch: { select: { park: { select: { id: true, name: true, cityId: true } } } },
      },
    }),
  ]);

  // Build lookup maps
  const groupToCityId = new Map<string, string>();
  const groupToParkId = new Map<string, string>();
  const parkIdToName = new Map<string, string>();
  const parkIdToCityId = new Map<string, string>();
  for (const g of parkNames) {
    const park = g.batch?.park;
    if (!park) continue;
    groupToCityId.set(g.id, park.cityId);
    groupToParkId.set(g.id, park.id);
    parkIdToName.set(park.id, park.name);
    parkIdToCityId.set(park.id, park.cityId);
  }

  const participantCountByGroup = new Map(participantsByGroup.map((r) => [r.groupId!, r._count.id]));
  const eventCountByGroup = new Map(eventsByGroup.map((r) => [r.groupId, r._count.id]));

  // Map event → count of records
  const recordsByEventMap = new Map(recordsByEvent.map((r) => [r.eventId, r._count.id]));

  // For each event we need the groupId to aggregate
  const eventsWithGroup = await db.attendanceEvent.findMany({
    where: { eventDate: { gte: startDateUTC } },
    select: { id: true, groupId: true },
  });

  // Aggregate records per group
  const recordCountByGroup = new Map<string, number>();
  for (const ev of eventsWithGroup) {
    const recs = recordsByEventMap.get(ev.id) || 0;
    recordCountByGroup.set(ev.groupId, (recordCountByGroup.get(ev.groupId) || 0) + recs);
  }

  // Aggregate per city
  const cityAggMap = new Map<string, { totalParticipants: number; totalEvents: number; totalRecords: number; totalPossible: number; parkRates: Map<string, { records: number; possible: number }> }>();

  for (const [groupId, cityId] of groupToCityId) {
    if (!cityAggMap.has(cityId)) {
      cityAggMap.set(cityId, { totalParticipants: 0, totalEvents: 0, totalRecords: 0, totalPossible: 0, parkRates: new Map() });
    }
    const agg = cityAggMap.get(cityId)!;
    const participants = participantCountByGroup.get(groupId) || 0;
    const events = eventCountByGroup.get(groupId) || 0;
    const records = recordCountByGroup.get(groupId) || 0;
    const possible = participants * events;
    agg.totalParticipants += participants;
    agg.totalEvents += events;
    agg.totalRecords += records;
    agg.totalPossible += possible;

    const parkId = groupToParkId.get(groupId);
    if (parkId) {
      const pr = agg.parkRates.get(parkId) || { records: 0, possible: 0 };
      pr.records += records;
      pr.possible += possible;
      agg.parkRates.set(parkId, pr);
    }
  }

  const cityStats = cities.map((city) => {
    const agg = cityAggMap.get(city.id) || { totalParticipants: 0, totalEvents: 0, totalRecords: 0, totalPossible: 0, parkRates: new Map() };
    const avgRate = agg.totalPossible > 0 ? Math.round((agg.totalRecords / agg.totalPossible) * 100) : 0;

    let topParkRate = 0;
    let topParkName = "";
    for (const [parkId, pr] of agg.parkRates) {
      const rate = pr.possible > 0 ? (pr.records / pr.possible) * 100 : 0;
      if (rate > topParkRate) { topParkRate = rate; topParkName = parkIdToName.get(parkId) || ""; }
    }

    return {
      cityId: city.id,
      name: city.name,
      parksCount: city._count.parks,
      totalParticipants: agg.totalParticipants,
      totalEvents: agg.totalEvents,
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

  // Fetch parks and groups info, then aggregate in DB — no per-record loading
  const [parks, groups, participantsByGroup, eventsByGroup, eventsInRange] = await Promise.all([
    db.park.findMany({
      where: { cityId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.group.findMany({
      where: { isActive: true, batch: { park: { cityId } } },
      select: { id: true, batch: { select: { park: { select: { id: true } } } } },
    }),
    db.participant.groupBy({
      by: ["groupId"],
      where: { state: "active", group: { batch: { park: { cityId } } } },
      _count: { id: true },
    }),
    db.attendanceEvent.groupBy({
      by: ["groupId"],
      where: { eventDate: { gte: startDateUTC }, group: { batch: { park: { cityId } } } },
      _count: { id: true },
    }),
    db.attendanceEvent.findMany({
      where: { eventDate: { gte: startDateUTC }, group: { batch: { park: { cityId } } } },
      select: { id: true, groupId: true },
    }),
  ]);

  // Map eventId → record count via groupBy
  const eventIds = eventsInRange.map((e) => e.id);
  const recordsByEvent = eventIds.length > 0
    ? await db.attendanceRecord.groupBy({
        by: ["eventId"],
        where: { eventId: { in: eventIds } },
        _count: { id: true },
      })
    : [];
  const recByEventMap = new Map(recordsByEvent.map((r) => [r.eventId, r._count.id]));

  // records per group
  const recByGroup = new Map<string, number>();
  for (const ev of eventsInRange) {
    recByGroup.set(ev.groupId, (recByGroup.get(ev.groupId) || 0) + (recByEventMap.get(ev.id) || 0));
  }

  const groupToParkId = new Map(groups.map((g) => [g.id, g.batch?.park?.id]));
  const partByGroup = new Map(participantsByGroup.map((r) => [r.groupId!, r._count.id]));
  const evByGroup = new Map(eventsByGroup.map((r) => [r.groupId, r._count.id]));

  // Aggregate per park
  const parkAgg = new Map<string, { participants: number; groups: number; events: number; records: number; possible: number }>();
  for (const park of parks) parkAgg.set(park.id, { participants: 0, groups: 0, events: 0, records: 0, possible: 0 });

  for (const [groupId, parkId] of groupToParkId) {
    if (!parkId || !parkAgg.has(parkId)) continue;
    const agg = parkAgg.get(parkId)!;
    agg.groups++;
    const pts = partByGroup.get(groupId) || 0;
    const evs = evByGroup.get(groupId) || 0;
    const recs = recByGroup.get(groupId) || 0;
    agg.participants += pts;
    agg.events += evs;
    agg.records += recs;
    agg.possible += pts * evs;
  }

  const parkStats = parks.map((park) => {
    const agg = parkAgg.get(park.id)!;
    return {
      parkId: park.id,
      name: park.name,
      totalParticipants: agg.participants,
      groups: agg.groups,
      totalEvents: agg.events,
      avgRate: agg.possible > 0 ? Math.round((agg.records / agg.possible) * 100) : 0,
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
