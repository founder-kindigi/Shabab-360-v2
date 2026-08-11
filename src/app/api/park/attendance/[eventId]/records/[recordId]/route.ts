import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { editAttendanceRecordSchema } from "@/lib/attendance/schemas";

const EDIT_ROLES = ["super_admin", "program_admin", "city_head", "park_lead"] as const;

/**
 * PATCH /api/park/attendance/[eventId]/records/[recordId]
 * Edit an existing attendance record with a required reason.
 * Only available to HQ staff and the assigned Park Lead.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; recordId: string }> }
) {
  const { eventId, recordId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.correct");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const parsedBody = editAttendanceRecordSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { status, editReason } = parsedBody.data;

    // Fetch the record with event for scope check
    const record = await db.attendanceRecord.findUnique({
      where: { id: recordId },
      include: {
        event: {
          include: {
            group: { include: { batch: { include: { park: true } } } },
          },
        },
      },
    });

    if (!record || record.eventId !== eventId) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      user,
      { cityId: record.event.group.batch.park.cityId, parkId: record.event.group.batch.parkId, groupId: record.event.groupId },
      EDIT_ROLES
    );
    if (scopeError) return scopeError;

    // Get staff meta
    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
    });

    // Update the record
    const oldStatus = record.status;
    const updated = await db.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status,
        editReason: editReason.trim(),
        markedBy: staffMeta?.id ?? record.markedBy,
        markedAt: new Date(),
      },
    });

    // Audit log
    await logAudit({
      userId: user.id,
      action: "attendance_edit",
      entityType: "attendance_records",
      entityId: record.id,
      oldValues: { status: oldStatus },
      newValues: { status, editReason: editReason.trim() },
      reason: editReason.trim(),
    });

    return NextResponse.json({
      success: true,
      record: {
        id: updated.id,
        status: updated.status,
        editReason: updated.editReason,
        markedAt: updated.markedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Attendance record edit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
