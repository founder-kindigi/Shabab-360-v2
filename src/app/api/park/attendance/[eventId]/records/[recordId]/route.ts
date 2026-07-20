import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const VALID_STATUSES = ["present", "absent", "late", "excused"] as const;
const EDIT_ROLES = ["super_admin", "program_admin", "park_admin", "park_lead"] as const;

function isAttendanceStatus(
  status: string
): status is (typeof VALID_STATUSES)[number] {
  return (VALID_STATUSES as readonly string[]).includes(status);
}

/**
 * PATCH /api/park/attendance/[eventId]/records/[recordId]
 * Edit an existing attendance record with a required reason.
 * Only available to HQ staff and park administrators/leads.
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
    const body = await req.json();
    const { status, editReason } = body as { status?: string; editReason?: string };

    if (!status || !isAttendanceStatus(status)) {
      return NextResponse.json({ error: "Invalid or missing status" }, { status: 400 });
    }

    if (!editReason || typeof editReason !== "string" || editReason.trim().length < 10) {
      return NextResponse.json(
        { error: "editReason is required and must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Fetch the record with event for scope check
    const record = await db.attendanceRecord.findUnique({
      where: { id: recordId },
      include: {
        event: {
          include: {
            group: { include: { batch: true } },
          },
        },
      },
    });

    if (!record || record.eventId !== eventId) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      user,
      { parkId: record.event.group.batch.parkId, groupId: record.event.groupId },
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
