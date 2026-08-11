import { NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { closeAttendanceEventSchema } from "@/lib/attendance/schemas";

const EVENT_SUPERVISOR_ROLES = ["super_admin", "program_admin", "city_head", "park_lead"] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.correct");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const parsedBody = closeAttendanceEventSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { reason } = parsedBody.data;

    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: {
        group: { include: { batch: { include: { park: true } } } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isClosed) {
      return NextResponse.json(
        { error: "Event is already closed" },
        { status: 409 }
      );
    }

    // Scope check
    const scopeError = requireResourceScope(
      user,
      { cityId: event.group.batch.park.cityId, parkId: event.group.batch.parkId, groupId: event.groupId },
      EVENT_SUPERVISOR_ROLES
    );
    if (scopeError) return scopeError;

    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
      include: { user: { select: { name: true } } },
    });

    const updatedEvent = await db.attendanceEvent.update({
      where: { id: eventId },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedBy: staffMeta?.id,
      },
    });

    await logAudit({
      userId: user.id,
      action: "event_close",
      entityType: "attendance_events",
      entityId: eventId,
      newValues: { reason, closedByName: staffMeta?.user?.name },
    });

    return NextResponse.json({
      success: true,
      event: {
        id: updatedEvent.id,
        isClosed: true,
        closedAt: updatedEvent.closedAt?.toISOString(),
        closedByName: staffMeta?.user?.name || null,
      },
    });
  } catch (error) {
    console.error("Close event error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
