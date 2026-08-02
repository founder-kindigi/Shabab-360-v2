import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { markStaffAttendanceRecord } from "@/lib/attendance/summaries";
import { db } from "@/lib/db";
import { z } from "zod";

const markStaffAttendanceSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  status: z.enum(["present", "absent", "late", "excused"]),
  editReason: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: {
        group: { include: { batch: { include: { park: true } } } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      user,
      { parkId: event.group.batch.parkId, groupId: event.groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

    const staffRecords = await db.staffAttendanceRecord.findMany({
      where: { eventId },
      include: {
        staff: {
          select: {
            id: true,
            role: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { markedAt: "desc" },
    });

    return NextResponse.json({ staffRecords });
  } catch (error) {
    console.error("Staff attendance GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("attendance.mark");
  if (capAuth instanceof NextResponse) return capAuth;

  try {
    const parseResult = markStaffAttendanceSchema.safeParse(
      await req.json().catch(() => ({}))
    );
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const { staffId, status, editReason } = parseResult.data;

    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: {
        group: { include: { batch: { include: { park: true } } } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      user,
      { parkId: event.group.batch.parkId, groupId: event.groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

    const targetStaff = await db.staffMeta.findUnique({
      where: { id: staffId },
      include: {
        assignedPark: { select: { cityId: true } },
        assignedGroup: { select: { batch: { select: { park: { select: { cityId: true } } } } } },
      },
    });
    if (!targetStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    if (!targetStaff.isActive) {
      return NextResponse.json({ error: "Staff member is inactive" }, { status: 403 });
    }
    const targetCityId =
      targetStaff.assignedCityId ??
      targetStaff.assignedPark?.cityId ??
      targetStaff.assignedGroup?.batch.park.cityId;
    if (!targetCityId || targetCityId !== event.group.batch.park.cityId) {
      return NextResponse.json({ error: "Staff member is outside the event city" }, { status: 403 });
    }

    // Get staff meta ID of current marker
    const markerStaffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
    });

    const record = await markStaffAttendanceRecord({
      eventId,
      staffId,
      status,
      markedBy: markerStaffMeta?.id ?? user.id,
      editReason,
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Staff attendance POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
