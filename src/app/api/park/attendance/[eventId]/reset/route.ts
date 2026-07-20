import { NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const EVENT_SUPERVISOR_ROLES = ["park_lead"] as const;

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.correct");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    // Fetch event for scope check
    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { group: { include: { batch: true } } },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isClosed) {
      return NextResponse.json(
        { error: "Cannot reset a closed event" },
        { status: 400 }
      );
    }

    // Scope check
    const scopeError = requireResourceScope(
      user,
      { parkId: event.group.batch.parkId, groupId: event.groupId },
      EVENT_SUPERVISOR_ROLES
    );
    if (scopeError) return scopeError;

    // Count records before deletion for audit
    const count = await db.attendanceRecord.count({
      where: { eventId },
    });

    if (count === 0) {
      return NextResponse.json({ deleted: 0, message: "No records to reset" });
    }

    // Delete all records for this event
    const result = await db.attendanceRecord.deleteMany({
      where: { eventId },
    });

    await logAudit({
      userId: user.id,
      action: "attendance_reset",
      entityType: "attendance_records",
      newValues: {
        eventId,
        deletedCount: result.count,
      },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Cleared ${result.count} attendance record(s)`,
    });
  } catch (error) {
    console.error("Reset attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
