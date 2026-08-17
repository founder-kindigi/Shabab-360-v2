import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { ATTENDANCE_ROLES, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { attendanceDateStart, isBatchClassDate } from "@/lib/attendance/schedule";
import { prepareStaffAttendanceSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";
import { optionalDateOnly, optionalIdentifier, queryParamsToObject, queryValidationError } from "@/lib/api/query-params";
import { z } from "zod";

const listSchema = z.object({ parkId: optionalIdentifier(), date: optionalDateOnly() }).strict();

type ResolvedPark =
  | { park: { id: string; name: string; cityId: string }; error: null }
  | { error: NextResponse; park: null };

async function resolvePark(user: Parameters<typeof requireResourceScope>[0], requestedParkId?: string): Promise<ResolvedPark> {
  const parkId = requestedParkId ?? user.assignedParkId;
  if (!parkId) return { error: NextResponse.json({ error: "parkId required" }, { status: 400 }), park: null };
  const park = await db.park.findUnique({ where: { id: parkId, isActive: true }, select: { id: true, name: true, cityId: true } });
  if (!park) return { error: NextResponse.json({ error: "Park not found" }, { status: 404 }), park: null };
  const scopeError = requireResourceScope(user, { cityId: park.cityId, parkId }, ATTENDANCE_ROLES);
  return scopeError ? { error: scopeError, park: null } : { park, error: null };
}

async function isOperatingDate(parkId: string, cityId: string, date: string) {
  const eventDate = attendanceDateStart(date);
  const nextDate = new Date(eventDate.getTime() + 86_400_000);
  const [offDate, batches] = await Promise.all([
    db.operationalOffDate.findFirst({ where: { cityId, offDate: { gte: eventDate, lt: nextDate } }, select: { label: true } }),
    db.batch.findMany({
      where: { parkId, isActive: true },
      select: {
        startDate: true,
        endDate: true,
        settings: { select: { classWeekdays: true } },
        extraClassDates: { where: { classDate: { gte: eventDate, lt: nextDate } }, select: { classDate: true } },
      },
    }),
  ]);
  if (offDate) return { scheduled: false, reason: offDate.label };
  return {
    scheduled: batches.some((batch) => isBatchClassDate({
      date,
      startDate: batch.startDate,
      endDate: batch.endDate,
      classWeekdays: batch.settings?.classWeekdays,
      extraClassDates: batch.extraClassDates.map((item) => item.classDate),
    })),
  };
}

export async function GET(request: Request) {
  const auth = await requireCapability("attendance.staff.manage");
  if (auth instanceof NextResponse) return auth;
  const parsed = listSchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
  if (!parsed.success || !parsed.data.date) return NextResponse.json(parsed.success ? { error: "date required" } : queryValidationError(parsed.error), { status: 400 });
  const result = await resolvePark(auth.user, parsed.data.parkId);
  if (result.error) return result.error;
  const eventDate = attendanceDateStart(parsed.data.date);
  const event = await db.staffAttendanceEvent.findUnique({
    where: { parkId_eventDate: { parkId: result.park.id, eventDate } },
    include: { _count: { select: { records: true } } },
  });
  return NextResponse.json({ park: result.park, date: parsed.data.date, event });
}

export async function POST(request: Request) {
  const auth = await requireCapability("attendance.staff.manage");
  if (auth instanceof NextResponse) return auth;
  const parsed = prepareStaffAttendanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const result = await resolvePark(auth.user, parsed.data.parkId);
  if (result.error) return result.error;
  const operating = await isOperatingDate(result.park.id, result.park.cityId, parsed.data.date);
  if (!operating.scheduled) return NextResponse.json({ error: operating.reason ?? "No staff roll-call is scheduled for this date" }, { status: 400 });
  const eventDate = attendanceDateStart(parsed.data.date);

  const outcome = await db.$transaction(async (tx) => {
    const existing = await tx.staffAttendanceEvent.findUnique({ where: { parkId_eventDate: { parkId: result.park.id, eventDate } } });
    if (existing) return { event: existing, created: false };
    const event = await tx.staffAttendanceEvent.create({ data: { parkId: result.park.id, eventDate, title: `${result.park.name} staff roll-call` } });
    await tx.auditLog.create({ data: createAuditLogData({
      userId: auth.user.id,
      action: "staff_attendance_prepare",
      entityType: "staff_attendance_events",
      entityId: event.id,
      newValues: { parkId: result.park.id, eventDate: parsed.data.date, source: "batch_schedule" },
    }) });
    return { event, created: true };
  });
  return NextResponse.json(outcome, { status: outcome.created ? 201 : 200 });
}
