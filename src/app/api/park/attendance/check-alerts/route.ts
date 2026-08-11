import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { AttendanceAlertError, checkAttendanceAlerts } from "@/lib/attendance-alerts";
import { db } from "@/lib/db";
import { checkAttendanceAlertsSchema } from "@/lib/attendance/schemas";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const parsedBody = checkAttendanceAlertsSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { participantId, eventId } = parsedBody.data;

    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { group: { include: { batch: { include: { park: true } } } } },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      auth.user,
      { cityId: event.group.batch.park.cityId, parkId: event.group.batch.parkId, groupId: event.groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

    const result = await checkAttendanceAlerts(participantId, eventId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AttendanceAlertError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Check alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
