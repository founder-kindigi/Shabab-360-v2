import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { closeAttendanceEventSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

const EVENT_SUPERVISOR_ROLES = ["super_admin", "program_admin", "city_head", "park_lead"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("attendance.correct");
  if (capability instanceof NextResponse) return capability;
  const parsed = closeAttendanceEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400 }
    );
  }

  const { eventId } = await params;
  const event = await db.attendanceEvent.findUnique({
    where: { id: eventId },
    include: { group: { include: { batch: { include: { park: true } } } } },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const scopeError = requireResourceScope(auth.user, {
    cityId: event.group.batch.cityId ?? event.group.batch.park.cityId,
    parkId: event.group.batch.parkId,
    groupId: event.groupId,
  }, EVENT_SUPERVISOR_ROLES);
  if (scopeError) return scopeError;
  if (!event.isClosed) {
    return NextResponse.json({ error: "Attendance is already open" }, { status: 409 });
  }

  try {
    await db.$transaction(async (tx) => {
      const reopened = await tx.attendanceEvent.updateMany({
        where: { id: eventId, isClosed: true },
        data: { isClosed: false, closedAt: null, closedBy: null },
      });
      if (reopened.count !== 1) throw new Error("ATTENDANCE_ALREADY_OPEN");
      await tx.auditLog.create({ data: createAuditLogData({
        userId: auth.user.id,
        action: "event_reopen",
        entityType: "attendance_events",
        entityId: eventId,
        oldValues: { isClosed: true, closedAt: event.closedAt },
        newValues: { isClosed: false },
        reason: parsed.data.reason,
      }) });
    });
    return NextResponse.json({ success: true, event: { id: eventId, isClosed: false } });
  } catch (error) {
    if (error instanceof Error && error.message === "ATTENDANCE_ALREADY_OPEN") {
      return NextResponse.json({ error: "Attendance is already open" }, { status: 409 });
    }
    console.error("Reopen attendance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
