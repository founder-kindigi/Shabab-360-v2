import { NextResponse } from "next/server";
import { subDays } from "date-fns";
import { z } from "zod";
import { requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { evaluateConsecutiveAbsenceWeeks } from "@/lib/attendance/dropout-policy";
import { db } from "@/lib/db";

const querySchema = z.object({
  parkId: z.string().cuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "from must be on or before to",
  path: ["to"],
}).refine((value) => !value.from || !value.to || Date.parse(value.to) - Date.parse(value.from) <= 366 * 86400000, {
  message: "Date range must not exceed 366 days",
  path: ["to"],
});

function percentage(attended: number, total: number) {
  return total === 0 ? 0 : Math.round((attended / total) * 100);
}

export async function GET(request: Request) {
  const auth = await requireCapability("attendance.mark");
  if (auth instanceof NextResponse) return auth;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: auth.user.id },
    include: { assignedGroup: { include: { batch: true } } },
  });
  const parkId = auth.user.assignedParkId
    ?? staffMeta?.assignedParkId
    ?? staffMeta?.assignedGroup?.batch.parkId
    ?? parsed.data.parkId;
  if (!parkId) return NextResponse.json({ error: "parkId required" }, { status: 400 });
  const park = await db.park.findUnique({ where: { id: parkId }, select: { id: true, name: true, cityId: true } });
  if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });
  const groupId = auth.user.assignedGroupId ?? staffMeta?.assignedGroupId ?? undefined;
  const scopeError = requireResourceScope(auth.user, { cityId: park.cityId, parkId, groupId });
  if (scopeError) return scopeError;

  const to = parsed.data.to ? new Date(`${parsed.data.to}T23:59:59.999Z`) : new Date();
  const from = parsed.data.from ? new Date(`${parsed.data.from}T00:00:00.000Z`) : subDays(to, 89);
  const groups = await db.group.findMany({
    where: { isActive: true, ...(groupId ? { id: groupId } : { parkId }) },
    select: {
      id: true,
      name: true,
      batch: { select: { name: true, settings: true } },
      murabbis: { where: { isActive: true }, select: { id: true, user: { select: { name: true } } } },
      participants: {
        where: { state: { in: ["active", "dropout"] } },
        select: { id: true, name: true, state: true, dropoutAt: true, dropoutSource: true },
      },
    },
    orderBy: { name: "asc" },
  });
  const groupIds = groups.map((group) => group.id);
  const events = groupIds.length === 0 ? [] : await db.attendanceEvent.findMany({
    where: { groupId: { in: groupIds }, eventDate: { gte: from, lte: to }, isClosed: true },
    select: { id: true, groupId: true, eventDate: true },
    orderBy: { eventDate: "asc" },
  });
  const records = events.length === 0 ? [] : await db.attendanceRecord.findMany({
    where: { eventId: { in: events.map((event) => event.id) } },
    select: { eventId: true, participantId: true, status: true },
  });
  const recordsByParticipant = new Map<string, typeof records>();
  for (const record of records) recordsByParticipant.set(record.participantId, [...(recordsByParticipant.get(record.participantId) ?? []), record]);

  const students = groups.flatMap((group) => group.participants.map((participant) => {
    const participantRecords = recordsByParticipant.get(participant.id) ?? [];
    const expectedEvents = events.filter((event) => event.groupId === group.id
      && (!participant.dropoutAt || event.eventDate < participant.dropoutAt));
    const present = participantRecords.filter((record) => record.status === "present").length;
    const late = participantRecords.filter((record) => record.status === "late").length;
    const absent = participantRecords.filter((record) => record.status === "absent").length;
    const excused = participantRecords.filter((record) => record.status === "excused").length;
    const settings = group.batch.settings;
    const participantRecordMap = new Map(participantRecords.map((record) => [record.eventId, record.status]));
    const streak = evaluateConsecutiveAbsenceWeeks(expectedEvents.map((event) => ({
      eventId: event.id,
      eventDate: event.eventDate,
      // An incomplete locked session pauses the streak instead of creating risk.
      status: participantRecordMap.get(event.id) ?? "excused",
    })), {
      warningConsecutiveWeeks: settings?.warningConsecutiveWeeks ?? 2,
      dropoutConsecutiveWeeks: settings?.dropoutConsecutiveWeeks ?? 3,
    });
    return {
      participantId: participant.id,
      name: participant.name,
      groupId: group.id,
      groupName: group.name,
      state: participant.state,
      dropoutAt: participant.dropoutAt?.toISOString() ?? null,
      dropoutSource: participant.dropoutSource,
      present,
      late,
      absent,
      excused,
      total: expectedEvents.length,
      unmarked: Math.max(0, expectedEvents.length - participantRecords.length),
      attendanceRate: percentage(present + late, expectedEvents.length),
      consecutiveAbsentWeeks: streak.consecutiveAbsentWeeks,
      warning: participant.state !== "dropout" && streak.shouldWarn,
    };
  }));

  const groupStats = groups.map((group) => {
    const members = students.filter((student) => student.groupId === group.id);
    const attended = members.reduce((sum, member) => sum + member.present + member.late, 0);
    const total = members.reduce((sum, member) => sum + member.total, 0);
    return {
      groupId: group.id,
      groupName: group.name,
      batchName: group.batch.name,
      studentCount: group.participants.length,
      sessionCount: events.filter((event) => event.groupId === group.id).length,
      attendanceRate: percentage(attended, total),
      warnings: members.filter((member) => member.warning).length,
      dropouts: members.filter((member) => member.state === "dropout").length,
      murabbis: group.murabbis.map((murabbi) => ({ staffMetaId: murabbi.id, name: murabbi.user.name })),
    };
  });

  const murabbiIds = [...new Set(groups.flatMap((group) => group.murabbis.map((murabbi) => murabbi.id)))];
  const staffRecords = murabbiIds.length === 0 ? [] : await db.staffAttendanceRecord.findMany({
    where: { staffMetaId: { in: murabbiIds }, event: { parkId, eventDate: { gte: from, lte: to }, isClosed: true } },
    select: { staffMetaId: true, status: true },
  });
  const murabbis = groups.flatMap((group) => group.murabbis.map((murabbi) => {
    const ownRecords = staffRecords.filter((record) => record.staffMetaId === murabbi.id);
    const groupStat = groupStats.find((item) => item.groupId === group.id)!;
    return {
      staffMetaId: murabbi.id,
      name: murabbi.user.name,
      groupName: group.name,
      studentAttendanceRate: groupStat.attendanceRate,
      staffAttendanceRate: percentage(ownRecords.filter((record) => record.status === "present" || record.status === "late").length, ownRecords.length),
      staffSessions: ownRecords.length,
      warningStudents: groupStat.warnings,
    };
  }));

  const totalMarks = students.reduce((sum, student) => sum + student.total, 0);
  const attendedMarks = students.reduce((sum, student) => sum + student.present + student.late, 0);
  return NextResponse.json({
    scope: { parkId: park.id, parkName: park.name, from: from.toISOString(), to: to.toISOString() },
    overview: {
      groups: groups.length,
      students: students.length,
      closedSessions: events.length,
      attendanceRate: percentage(attendedMarks, totalMarks),
      warnings: students.filter((student) => student.warning).length,
      dropouts: students.filter((student) => student.state === "dropout").length,
    },
    groupStats,
    students: students.sort((a, b) => a.attendanceRate - b.attendanceRate || a.name.localeCompare(b.name)),
    murabbis,
  });
}
