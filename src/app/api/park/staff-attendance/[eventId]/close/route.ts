import { NextResponse } from "next/server";
import {
  ATTENDANCE_ROLES,
  requireCapability,
  requireResourceScope,
} from "@/lib/auth/authorize";
import { createAuditLogData } from "@/lib/audit";
import { closeAttendanceEventSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

class AlreadyClosedError extends Error {}

function canCloseParkStaffAttendance(role: string | undefined): boolean {
  return role === "park_lead" || role === "park_admin";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const capabilityAuth = await requireCapability("attendance.correct");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { eventId } = await params;
  const parsedBody = closeAttendanceEventSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const event = await db.parkStaffAttendanceEvent.findUnique({
    where: { id: eventId },
    select: { id: true, parkId: true, isClosed: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Staff attendance event not found" }, { status: 404 });
  }
  if (!canCloseParkStaffAttendance(capabilityAuth.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const scopeError = requireResourceScope(capabilityAuth.user, { parkId: event.parkId }, ATTENDANCE_ROLES);
  if (scopeError) return scopeError;

  try {
    const closedEvent = await db.$transaction(async (tx) => {
      const updated = await tx.parkStaffAttendanceEvent.updateMany({
        where: { id: event.id, isClosed: false },
        data: {
          isClosed: true,
          closedAt: new Date(),
          closedBy: capabilityAuth.user.id,
        },
      });
      if (updated.count !== 1) throw new AlreadyClosedError();

      await tx.auditLog.create({
        data: createAuditLogData({
          userId: capabilityAuth.user.id,
          action: "park_staff_attendance_close",
          entityType: "park_staff_attendance_events",
          entityId: event.id,
          newValues: { reason: parsedBody.data.reason },
        }),
      });
      return tx.parkStaffAttendanceEvent.findUnique({
        where: { id: event.id },
        select: { id: true, isClosed: true, closedAt: true },
      });
    });

    return NextResponse.json({
      event: closedEvent && {
        ...closedEvent,
        closedAt: closedEvent.closedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof AlreadyClosedError) {
      return NextResponse.json({ error: "Staff attendance event is already closed" }, { status: 409 });
    }
    console.error("Park staff attendance close error", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to close staff attendance" }, { status: 500 });
  }
}
