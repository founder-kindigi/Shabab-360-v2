import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const VALID_STATUSES = ["present", "absent", "late", "excused"];
const EDIT_ROLES = ["admin", "park_admin", "park_lead"];

/**
 * PATCH /api/park/attendance/[eventId]/records/[recordId]
 * Edit an existing attendance record with a required reason.
 * Only available to admin and park_admin/park_lead roles.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; recordId: string }> }
) {
  const { eventId, recordId } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin and park_admin/park_lead can edit records with reasons
  if (!user.role || !EDIT_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden — only admin and park leads can edit records" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { status, editReason } = body as { status?: string; editReason?: string };

    if (!status || !VALID_STATUSES.includes(status)) {
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

    // Scope check
    if (user.role !== "admin") {
      const parkId = record.event.group.batch.parkId;
      if (user.assignedParkId && user.assignedParkId !== parkId) {
        return NextResponse.json({ error: "Forbidden — record not in your scope" }, { status: 403 });
      }
    }

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