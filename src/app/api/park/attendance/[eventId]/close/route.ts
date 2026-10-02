import { requireResolvedGroupScope } from "@/lib/auth/hierarchy";
import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { closeAttendanceEventSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

const EVENT_SUPERVISOR_ROLES = ["super_admin", "program_admin", "city_head", "park_lead", "park_admin"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("attendance.correct");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const parsedBody = closeAttendanceEventSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  try {
    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { group: { include: { park: true, batch: { include: { park: true } } } } },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.isClosed) return NextResponse.json({ error: "Event is already closed" }, { status: 409 });
    const scopeError = requireResolvedGroupScope(auth.user, { ...event.group, id: event.groupId }, EVENT_SUPERVISOR_ROLES);
    if (scopeError) return scopeError;

    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: auth.user.id },
      include: { user: { select: { name: true } } },
    });

    await db.$transaction(async (tx) => {
      const closed = await tx.attendanceEvent.updateMany({
        where: { id: eventId, isClosed: false },
        data: { isClosed: true, closedAt: new Date(), closedBy: staffMeta?.id },
      });
      if (closed.count !== 1) throw new Error("ATTENDANCE_ALREADY_CLOSED");

      // Closing records attendance only. Participant lifecycle changes are
      // separate, authorized, audited actions and never happen here, even when a
      // legacy batch setting still carries automaticDropoutEnabled.
      await tx.auditLog.create({ data: createAuditLogData({
        userId: auth.user.id,
        action: "event_close",
        entityType: "attendance_events",
        entityId: eventId,
        newValues: { closedByName: staffMeta?.user?.name, automaticDropouts: 0 },
        reason: parsedBody.data.reason,
      }) });
    });

    return NextResponse.json({
      success: true,
      event: { id: eventId, isClosed: true, closedAt: new Date().toISOString(), closedByName: staffMeta?.user?.name ?? null },
      automaticDropouts: 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ATTENDANCE_ALREADY_CLOSED") {
      return NextResponse.json({ error: "Event is already closed" }, { status: 409 });
    }
    console.error("Close event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
