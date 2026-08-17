import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { attendanceDateStart, parseClassWeekdays } from "@/lib/attendance/schedule";
import { updateAttendanceScheduleSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";

async function scopedBatch(id: string, user: Parameters<typeof requireResourceScope>[0]) {
  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      park: { select: { cityId: true } },
      settings: true,
      extraClassDates: { orderBy: { classDate: "asc" } },
    },
  });
  if (!batch) return { error: NextResponse.json({ error: "Batch not found" }, { status: 404 }) };
  const scopeError = requireResourceScope(user, { cityId: batch.cityId ?? batch.park.cityId, parkId: batch.parkId });
  return scopeError ? { error: scopeError } : { batch };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("organisation.view");
  if (capability instanceof NextResponse) return capability;
  const result = await scopedBatch((await params).id, auth.user);
  if ("error" in result) return result.error;
  return NextResponse.json({
    batchId: result.batch.id,
    classWeekdays: parseClassWeekdays(result.batch.settings?.classWeekdays),
    extraClassDates: result.batch.extraClassDates.map((item) => formatPKT(item.classDate, "yyyy-MM-dd")),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("organisation.manage");
  if (capability instanceof NextResponse) return capability;
  const result = await scopedBatch((await params).id, auth.user);
  if ("error" in result) return result.error;
  const parsed = updateAttendanceScheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await db.$transaction(async (tx) => {
    const settings = await tx.batchSettings.upsert({
      where: { batchId: result.batch.id },
      create: { batchId: result.batch.id, classWeekdays: JSON.stringify(parsed.data.classWeekdays) },
      update: { classWeekdays: JSON.stringify(parsed.data.classWeekdays) },
    });
    await tx.batchClassDate.deleteMany({ where: { batchId: result.batch.id } });
    for (const date of parsed.data.extraClassDates) {
      await tx.batchClassDate.create({ data: { batchId: result.batch.id, classDate: attendanceDateStart(date) } });
    }
    await tx.auditLog.create({ data: createAuditLogData({
      userId: auth.user.id,
      action: "attendance_schedule_update",
      entityType: "batch",
      entityId: result.batch.id,
      oldValues: {
        classWeekdays: parseClassWeekdays(result.batch.settings?.classWeekdays),
        extraClassDates: result.batch.extraClassDates.map((item) => formatPKT(item.classDate, "yyyy-MM-dd")),
      },
      newValues: parsed.data,
    }) });
    return settings;
  });
  return NextResponse.json({
    batchId: result.batch.id,
    classWeekdays: parseClassWeekdays(updated.classWeekdays),
    extraClassDates: parsed.data.extraClassDates,
  });
}
