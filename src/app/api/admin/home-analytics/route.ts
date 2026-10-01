import { NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { resolveRequestedHierarchy, hierarchyGroupWhere, groupHierarchyInclude, groupResourceScope } from "@/lib/auth/hierarchy";
import { attendanceOpportunities } from "@/lib/attendance/opportunities";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";
import { z } from "zod";
const querySchema = z.object({ from: z.string().date().optional(), to: z.string().date().optional(), cityId: z.string().max(128).optional(), parkId: z.string().max(128).optional(), groupId: z.string().max(128).optional() }).strict();
export async function GET(request: Request) {
  const auth = await requireAuth(); if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("reports.view"); if (capability instanceof NextResponse) return capability;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid analytics filters" }, { status: 400 });
  const today = formatPKT(new Date(), "yyyy-MM-dd");
  const from = parsed.data.from ?? today, to = parsed.data.to ?? today;
  const start = new Date(from + "T00:00:00+05:00"), end = new Date(to + "T23:59:59.999+05:00");
  if (from > to || end.getTime() - start.getTime() > 366 * 86400000) return NextResponse.json({ error: "Select an ordered date range of at most one year" }, { status: 400 });
  try {
    const scope = await resolveRequestedHierarchy(auth.user, parsed.data); if (scope instanceof NextResponse) return scope;
    const groups = await db.group.findMany({ where: hierarchyGroupWhere(scope), include: { ...groupHierarchyInclude, murabbis: { where: { isActive: true }, include: { user: { select: { name: true } } } } } });
    const visibleGroups = groups.filter(g => groupResourceScope(g));
    const ids = visibleGroups.map(g => g.id);
    const [students, events] = await Promise.all([
      db.participant.findMany({ where: { groupId: { in: ids } }, select: { id: true, groupId: true, state: true, joinedAt: true, dropoutAt: true } }),
      db.attendanceEvent.findMany({ where: { groupId: { in: ids }, eventDate: { gte: start, lte: new Date(Math.min(end.getTime(), Date.now())) } }, select: { id: true, groupId: true, eventDate: true } }),
    ]);
    const records = await db.attendanceRecord.findMany({ where: { eventId: { in: events.map(e => e.id) } }, select: { eventId: true, participantId: true, status: true } });
    const attendance = attendanceOpportunities(students, events, records);
    const parkIds = [...new Set(visibleGroups.map(g => groupResourceScope(g)!.parkId))];
    const parks = await db.park.findMany({ where: { id: { in: parkIds } }, select: { id: true, name: true } });
    const parkAttendance = parks.map(park => {
      const parkGroups = visibleGroups.filter(g => groupResourceScope(g)!.parkId === park.id);
      const groupIds = new Set(parkGroups.map(g => g.id));
      const participants = students.filter(p => groupIds.has(p.groupId));
      const totals = attendanceOpportunities(participants, events.filter(e => groupIds.has(e.groupId)), records);
      const currentStudents = participants.filter(p => p.state === "active").length;
      return { id: park.id, parkId: park.id, name: park.name, parkName: park.name, parkInitials: park.name.slice(0, 2).toUpperCase(), initials: park.name.slice(0, 2).toUpperCase(), murabbiCount: new Set(parkGroups.flatMap(g => g.murabbis.map(m => m.id))).size, studentCount: currentStudents, studentsCount: currentStudents, totalStudents: currentStudents, ...totals, presentToday: totals.attended, presentCount: totals.attended, percentage: totals.rate, attendancePercentage: totals.rate, dotColor: totals.rate === null ? "gray" : totals.rate >= 75 ? "green" : totals.rate >= 50 ? "orange" : "red" };
    });
    const byMurabbi = visibleGroups.flatMap(group => {
      const totals = attendanceOpportunities(students.filter(p => p.groupId === group.id), events.filter(e => e.groupId === group.id), records);
      return group.murabbis.map(m => ({ id: m.id, groupId: group.id, name: m.user.name ?? "Unnamed staff member", ...totals }));
    });
    const staffEvents = await db.staffAttendanceEvent.findMany({ where: { parkId: { in: parkIds }, eventDate: { gte: start, lte: new Date(Math.min(end.getTime(), Date.now())) } }, include: { records: { where: scope.kind === "group" ? { staffMeta: { userId: auth.user.id } } : undefined, select: { status: true } } } });
    const staffAttendance = { present: 0, absent: 0, late: 0, excused: 0, recorded: 0 };
    for (const event of staffEvents) for (const record of event.records) { if (record.status === "present" || record.status === "absent" || record.status === "late" || record.status === "excused") { staffAttendance[record.status]++; staffAttendance.recorded++; } }
    const totalStudents = students.filter(p => p.state === "active").length;
    return NextResponse.json({ parks: parkAttendance, parksList: parkAttendance, parkAttendance, parksCount: parks.length, totalParks: parks.length, students: totalStudents, studentsCount: totalStudents, totalStudents, presentToday: attendance.attended, attendance, todayAttendance: attendance, byPark: parkAttendance, byMurabbi, staffAttendance, basis: "Present plus late divided by eligible participant-session opportunities. Excused and unmarked remain separate. Staff totals count persisted marks; historical staff roster membership is unavailable.", from, to }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Analytics could not be loaded" }, { status: 503 }); }
}
