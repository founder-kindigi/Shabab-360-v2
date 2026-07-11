import { NextResponse } from "next/server";
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

const ALLOWED_ROLES = ["park_admin", "park_lead"];

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    if (user.assignedParkId && user.assignedParkId !== event.group.batch.parkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    logAudit({
      userId: user.id,
      action: "attendance_reset",
      entityType: "attendance_records",
      newValues: JSON.stringify({
        eventId,
        deletedCount: result.count,
      }),
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