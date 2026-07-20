import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { AttendanceAlertError, checkAttendanceAlerts } from "@/lib/attendance-alerts";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const body = await req.json();
    const participantId = typeof body.participantId === "string" ? body.participantId : null;
    const eventId = typeof body.eventId === "string" ? body.eventId : null;
    if (!participantId || !eventId) {
      return NextResponse.json({ error: "participantId and eventId are required" }, { status: 400 });
    }

    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { group: { include: { batch: true } } },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      auth.user,
      { parkId: event.group.batch.parkId, groupId: event.groupId },
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
