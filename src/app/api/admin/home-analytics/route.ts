import { NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { resolveRequestedHierarchy, hierarchyGroupWhere, groupHierarchyInclude, groupResourceScope } from "@/lib/auth/hierarchy";
import { attendanceOpportunities } from "@/lib/attendance/opportunities";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";
import { z } from "zod";
const querySchema = z.object({ from: z.string().date().optional(), to: z.string().date().optional(), cityId: z.string().max(128).optional(), parkId: z.string().max(128).optional(), groupId: z.string().max(128).optional() }).strict();
/** Upper bound, applied only to explicit client-supplied from/to ranges. */
const MAX_PERIOD_DAYS = 366;
export async function GET(request: Request) {
  const auth = await requireAuth(); if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("reports.view"); if (capability instanceof NextResponse) return capability;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid analytics filters" }, { status: 400 });
  const explicitRange = Boolean(parsed.data.from || parsed.data.to);
  const today = formatPKT(new Date(), "yyyy-MM-dd");
  const requestedFrom = parsed.data.from ?? today, requestedTo = parsed.data.to ?? today;
  const requestedStart = new Date(requestedFrom + "T00:00:00+05:00"), requestedEnd = new Date(requestedTo + "T23:59:59.999+05:00");
  if (explicitRange && (requestedFrom > requestedTo || requestedEnd.getTime() - requestedStart.getTime() > MAX_PERIOD_DAYS * 86400000)) {
    return NextResponse.json({ error: "Select an ordered date range of at most one year" }, { status: 400 });
  }
  try {
    const scope = await resolveRequestedHierarchy(auth.user, parsed.data); if (scope instanceof NextResponse) return scope;
    const groups = await db.group.findMany({ where: hierarchyGroupWhere(scope), include: { ...groupHierarchyInclude, murabbis: { where: { isActive: true }, include: { user: { select: { name: true } } } } } });
    const groupScopes = groups.flatMap(group => {
      const groupScope = groupResourceScope(group);
      return groupScope ? [{ group, scope: groupScope }] : [];
    });
    const ids = groupScopes.map(entry => entry.group.id);

    // Active Batches for the authorized scope. A city/park/group scope resolves to
    // one; an unscoped management view can span several cities and therefore
    // several active Batches, which must never be labelled as one Batch.
    const activeBatches = ids.length > 0
      ? await db.batch.findMany({
          where: { isActive: true, groups: { some: { id: { in: ids } } } },
          orderBy: { startDate: "asc" },
          select: { id: true, name: true, startDate: true, endDate: true },
        })
      : [];
    const multiBatch = activeBatches.length > 1;
    const singleBatch = activeBatches.length === 1 ? activeBatches[0] : null;
    // A single dated period (and therefore a single-series chart) can only be
    // stated truthfully for an explicit range or a one-Batch scope.
    const periodRepresentable = explicitRange || !multiBatch;

    // Without an explicit caller range the period is the active Batch start date
    // through the latest class session that actually has attendance data. The
    // stated Batch start is used exactly as returned, with no rolling window and
    // no clamp; the <=366-day bound applies only to explicit from/to ranges.
    let from = explicitRange ? requestedFrom : (activeBatches[0] ? formatPKT(activeBatches[0].startDate, "yyyy-MM-dd") : today);
    let to = explicitRange ? requestedTo : today;
    if (from > to) from = to;
    const start = new Date(from + "T00:00:00+05:00"), queryEnd = new Date(to + "T23:59:59.999+05:00");

    const [students, events] = await Promise.all([
      db.participant.findMany({ where: { groupId: { in: ids } }, select: { id: true, groupId: true, state: true, joinedAt: true, dropoutAt: true, reactivatedAt: true } }),
      db.attendanceEvent.findMany({ where: { groupId: { in: ids }, eventDate: { gte: start, lte: new Date(Math.min(queryEnd.getTime(), Date.now())) } }, select: { id: true, groupId: true, eventDate: true } }),
    ]);
    // Group-scoped reporting never includes an unassigned participant.
    const assignedStudents = students.filter((p): p is typeof p & { groupId: string } => p.groupId !== null);
    const records = await db.attendanceRecord.findMany({ where: { eventId: { in: events.map(e => e.id) } }, select: { eventId: true, participantId: true, status: true } });

    const eventDay = (event: { eventDate: Date }) => formatPKT(event.eventDate, "yyyy-MM-dd");
    // Never report a future date, and never treat a scheduled day with no recorded
    // mark as attendance data.
    const windowEvents = events.filter((event) => { const day = eventDay(event); return day >= from && day <= to && day <= today; });
    const markCountByEvent = new Map<string, number>();
    for (const record of records) markCountByEvent.set(record.eventId, (markCountByEvent.get(record.eventId) ?? 0) + 1);
    const daysWithData = [...new Set(windowEvents.filter((event) => (markCountByEvent.get(event.id) ?? 0) > 0).map(eventDay))].sort();

    // Derived period ends at the latest session with real attendance data. An
    // explicit caller range keeps its own end so existing consumers are unchanged.
    const periodEnd = explicitRange ? to : (daysWithData.length > 0 ? daysWithData[daysWithData.length - 1] : null);
    const periodEvents = periodEnd === null ? [] : windowEvents.filter((event) => eventDay(event) <= periodEnd);
    const periodEventIds = new Set(periodEvents.map((event) => event.id));
    const periodRecords = records.filter((record) => periodEventIds.has(record.eventId));
    const periodDailyTotals = [...new Set(periodEvents.filter((event) => (markCountByEvent.get(event.id) ?? 0) > 0).map(eventDay))].sort();

    const attendance = attendanceOpportunities(assignedStudents, periodEvents, periodRecords);

    // Bounded daily series for the trend view. Only days that actually hold
    // recorded attendance appear, and every value is a real aggregate of the
    // returned rows: a scheduled day without marks is never reported as zero.
    const totalsShape = () => ({ present: 0, absent: 0, late: 0, excused: 0, unmarked: 0, total: 0 });
    type DayTotals = ReturnType<typeof totalsShape>;
    const sumTotals = (into: DayTotals, totals: { present: number; absent: number; late: number; excused: number; unmarked: number; total: number }) => {
      into.present += totals.present;
      into.absent += totals.absent;
      into.late += totals.late;
      into.excused += totals.excused;
      into.unmarked += totals.unmarked;
      into.total += totals.total;
      return into;
    };
    const dayTotalsOf = (totals: { present: number; absent: number; late: number; excused: number; unmarked: number; total: number }): DayTotals => ({
      present: totals.present, absent: totals.absent, late: totals.late, excused: totals.excused, unmarked: totals.unmarked, total: totals.total,
    });
    const withRate = (date: string, totals: DayTotals) => ({
      date,
      ...totals,
      attended: totals.present + totals.late,
      rate: totals.total ? Math.round(((totals.present + totals.late) / totals.total) * 1000) / 10 : null,
    });

    const parkIdByGroup = new Map(groupScopes.map((entry) => [entry.group.id, entry.scope.parkId]));
    const parkDayTotals = new Map<string, Map<string, DayTotals>>();
    const groupDayTotals = new Map<string, Map<string, DayTotals>>();
    const eventsByDay = new Map<string, typeof periodEvents>();
    for (const event of periodEvents) {
      const key = eventDay(event);
      eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
    }

    const dailySeries = periodDailyTotals.map((date) => {
      const dayEvents = (eventsByDay.get(date) ?? []).filter((event) => (markCountByEvent.get(event.id) ?? 0) > 0);
      const dayTotals = totalsShape();
      const byPark = new Map<string, typeof periodEvents>();
      const byGroup = new Map<string, typeof periodEvents>();
      for (const event of dayEvents) {
        const parkId = parkIdByGroup.get(event.groupId);
        if (parkId) byPark.set(parkId, [...(byPark.get(parkId) ?? []), event]);
        byGroup.set(event.groupId, [...(byGroup.get(event.groupId) ?? []), event]);
      }
      for (const [parkId, parkEvents] of byPark) {
        const groupIds = new Set(parkEvents.map((event) => event.groupId));
        const totals = attendanceOpportunities(assignedStudents.filter((student) => groupIds.has(student.groupId)), parkEvents, periodRecords);
        const forPark = parkDayTotals.get(parkId) ?? new Map<string, DayTotals>();
        forPark.set(date, dayTotalsOf(totals));
        parkDayTotals.set(parkId, forPark);
        sumTotals(dayTotals, totals);
      }
      for (const [groupId, groupEvents] of byGroup) {
        const totals = attendanceOpportunities(assignedStudents.filter(student => student.groupId === groupId), groupEvents, periodRecords);
        const forGroup = groupDayTotals.get(groupId) ?? new Map<string, DayTotals>();
        forGroup.set(date, dayTotalsOf(totals));
        groupDayTotals.set(groupId, forGroup);
      }
      return withRate(date, dayTotals);
    });

    const latestSessionFor = (totalsByDate?: Map<string, DayTotals>) => {
      if (!totalsByDate || totalsByDate.size === 0) return null;
      const dates = [...totalsByDate.keys()].sort();
      const date = dates[dates.length - 1];
      return withRate(date, totalsByDate.get(date)!);
    };

    const parkIds = [...new Set(groupScopes.map(entry => entry.scope.parkId))];
    const parks = await db.park.findMany({ where: { id: { in: parkIds } }, select: { id: true, name: true } });
    const parkAttendance = parks.map(park => {
      const parkGroups = groupScopes.filter(entry => entry.scope.parkId === park.id).map(entry => entry.group);
      const groupIds = new Set(parkGroups.map(g => g.id));
      const participants = assignedStudents.filter(p => groupIds.has(p.groupId));
      const totals = attendanceOpportunities(participants, periodEvents.filter(event => groupIds.has(event.groupId)), periodRecords);
      const currentStudents = participants.filter(p => p.state === "active").length;
      return { id: park.id, parkId: park.id, name: park.name, parkName: park.name, parkInitials: park.name.slice(0, 2).toUpperCase(), initials: park.name.slice(0, 2).toUpperCase(), murabbiCount: new Set(parkGroups.flatMap(g => g.murabbis.map(m => m.id))).size, studentCount: currentStudents, studentsCount: currentStudents, totalStudents: currentStudents, ...totals, presentToday: totals.attended, presentCount: totals.attended, percentage: totals.rate, attendancePercentage: totals.rate, latestSession: latestSessionFor(parkDayTotals.get(park.id)), dotColor: totals.rate === null ? "gray" : totals.rate >= 75 ? "green" : totals.rate >= 50 ? "orange" : "red" };
    });
    const byMurabbi = groupScopes.flatMap(({ group }) => {
      const totals = attendanceOpportunities(assignedStudents.filter(p => p.groupId === group.id), periodEvents.filter(event => event.groupId === group.id), periodRecords);
      return group.murabbis.map(m => ({ id: m.id, groupId: group.id, name: m.user.name ?? "Unnamed staff member", ...totals, latestSession: latestSessionFor(groupDayTotals.get(group.id)) }));
    });
    const staffEvents = await db.staffAttendanceEvent.findMany({ where: { parkId: { in: parkIds }, eventDate: { gte: start, lte: new Date(Math.min(queryEnd.getTime(), Date.now())) } }, include: { records: { where: scope.kind === "group" ? { staffMeta: { userId: auth.user.id } } : undefined, select: { status: true } } } });
    const staffAttendance = { present: 0, absent: 0, late: 0, excused: 0, recorded: 0 };
    for (const event of staffEvents) for (const record of event.records) { if (record.status === "present" || record.status === "absent" || record.status === "late" || record.status === "excused") { staffAttendance[record.status]++; staffAttendance.recorded++; } }
    const totalStudents = assignedStudents.filter(p => p.state === "active").length;
    return NextResponse.json({ parks: parkAttendance, parksList: parkAttendance, parkAttendance, parksCount: parks.length, totalParks: parks.length, students: totalStudents, studentsCount: totalStudents, totalStudents, presentToday: attendance.attended, attendance, todayAttendance: attendance, byPark: parkAttendance, byMurabbi, daily: periodRepresentable ? dailySeries : [], batch: singleBatch ? { id: singleBatch.id, name: singleBatch.name, startDate: formatPKT(singleBatch.startDate, "yyyy-MM-dd"), endDate: singleBatch.endDate ? formatPKT(singleBatch.endDate, "yyyy-MM-dd") : null } : null, batches: activeBatches.map((batch) => ({ id: batch.id, name: batch.name, startDate: formatPKT(batch.startDate, "yyyy-MM-dd"), endDate: batch.endDate ? formatPKT(batch.endDate, "yyyy-MM-dd") : null })), multiBatch, periodStart: periodRepresentable ? from : null, periodEnd: periodRepresentable ? periodEnd : null, hasCompletedSession: dailySeries.length > 0, staffAttendance, basis: "Present plus late divided by eligible participant-session opportunities. Excused and unmarked remain separate. Staff totals count persisted marks; historical staff roster membership is unavailable.", from, to: periodEnd ?? to }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Analytics could not be loaded" }, { status: 503 }); }
}
