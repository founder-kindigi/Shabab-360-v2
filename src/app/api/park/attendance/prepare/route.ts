import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { attendanceDateStart, isBatchClassDate } from "@/lib/attendance/schedule";
import { prepareAttendanceSessionsSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("attendance.mark");
  if (capability instanceof NextResponse) return capability;

  const parsed = prepareAttendanceSessionsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { user } = auth;
  const { date } = parsed.data;
  let parkId = parsed.data.parkId ?? user.assignedParkId;
  let assignedGroupId: string | undefined;

  if (user.role === "murabbi") {
    assignedGroupId = user.assignedGroupId ?? undefined;
    const scopeError = requireResourceScope(user, { groupId: assignedGroupId }, ATTENDANCE_ROLES);
    if (scopeError) return scopeError;
    const assignedGroup = await db.group.findUnique({
      where: { id: assignedGroupId! },
      select: { batch: { select: { parkId: true } } },
    });
    if (!assignedGroup) return NextResponse.json({ error: "Assigned group not found" }, { status: 403 });
    parkId = assignedGroup.batch.parkId;
  }

  if (!parkId) return NextResponse.json({ error: "parkId required" }, { status: 400 });
  const park = await db.park.findUnique({ where: { id: parkId, isActive: true }, select: { id: true, cityId: true } });
  if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });
  const scopeError = requireResourceScope(user, { cityId: park.cityId, parkId, groupId: assignedGroupId }, ATTENDANCE_ROLES);
  if (scopeError) return scopeError;

  const eventDate = attendanceDateStart(date);
  const nextDate = new Date(eventDate.getTime() + 86_400_000);
  const offDate = await db.operationalOffDate.findFirst({
    where: { cityId: park.cityId, offDate: { gte: eventDate, lt: nextDate } },
    select: { label: true },
  });
  if (offDate) return NextResponse.json({ date, prepared: 0, isOffDate: true, reason: offDate.label });

  const groups = await db.group.findMany({
    where: {
      isActive: true,
      ...(assignedGroupId ? { id: assignedGroupId } : {}),
      batch: { parkId, isActive: true },
    },
    select: {
      id: true,
      name: true,
      batch: {
        select: {
          name: true,
          startDate: true,
          endDate: true,
          settings: { select: { classWeekdays: true } },
          extraClassDates: { where: { classDate: { gte: eventDate, lt: nextDate } }, select: { classDate: true } },
        },
      },
    },
  });

  const eligible = groups.filter((group) => isBatchClassDate({
    date,
    startDate: group.batch.startDate,
    endDate: group.batch.endDate,
    classWeekdays: group.batch.settings?.classWeekdays,
    extraClassDates: group.batch.extraClassDates.map((item) => item.classDate),
  }));

  const prepared = await db.$transaction(async (tx) => {
    let created = 0;
    for (const group of eligible) {
      const existing = await tx.attendanceEvent.findUnique({
        where: { groupId_eventDate: { groupId: group.id, eventDate } },
        select: { id: true },
      });
      if (existing) continue;
      const event = await tx.attendanceEvent.create({
        data: { groupId: group.id, eventDate, title: `${group.name} - ${group.batch.name}` },
      });
      await tx.auditLog.create({ data: createAuditLogData({
        userId: user.id,
        action: "attendance_session_prepare",
        entityType: "attendance_events",
        entityId: event.id,
        newValues: { groupId: group.id, eventDate: date, source: "batch_schedule" },
      }) });
      created += 1;
    }
    return created;
  });

  return NextResponse.json({ date, prepared, eligibleGroups: eligible.length, isOffDate: false });
}
