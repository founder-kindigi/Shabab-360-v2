import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { ATTENDANCE_ROLES, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { closeAttendanceEventSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

class AlreadyClosedError extends Error {}

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireCapability("attendance.staff.manage");
  if (auth instanceof NextResponse) return auth;
  const parsed = closeAttendanceEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const event = await db.staffAttendanceEvent.findUnique({ where: { id: (await params).eventId }, select: { id: true, parkId: true } });
  if (!event) return NextResponse.json({ error: "Staff attendance not found" }, { status: 404 });
  const park = await db.park.findUnique({ where: { id: event.parkId }, select: { cityId: true } });
  if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });
  const scopeError = requireResourceScope(auth.user, { cityId: park.cityId, parkId: event.parkId }, ATTENDANCE_ROLES);
  if (scopeError) return scopeError;
  try {
    const closed = await db.$transaction(async (tx) => {
      const update = await tx.staffAttendanceEvent.updateMany({ where: { id: event.id, isClosed: false }, data: { isClosed: true, closedAt: new Date(), closedBy: auth.user.id } });
      if (update.count !== 1) throw new AlreadyClosedError();
      await tx.auditLog.create({ data: createAuditLogData({
        userId: auth.user.id,
        action: "staff_attendance_lock",
        entityType: "staff_attendance_events",
        entityId: event.id,
        reason: parsed.data.reason,
      }) });
      return tx.staffAttendanceEvent.findUnique({ where: { id: event.id } });
    });
    return NextResponse.json({ event: closed });
  } catch (error) {
    if (error instanceof AlreadyClosedError) return NextResponse.json({ error: "Staff attendance is already locked" }, { status: 409 });
    throw error;
  }
}
