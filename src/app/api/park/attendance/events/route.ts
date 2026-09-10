import { requireResolvedGroupScope, resolveRequestedHierarchy, hierarchyGroupWhere } from "@/lib/auth/hierarchy";
import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, fromPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { parseISO } from "date-fns";
import { createAttendanceEventSchema } from "@/lib/attendance/schemas";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const parsedBody = createAttendanceEventSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { groupId, title, eventDate } = parsedBody.data;

    // Scope check
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { park: true, batch: { include: { park: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const scopeError = requireResolvedGroupScope(user, group, ATTENDANCE_ROLES);
    if (scopeError) return scopeError;

    // Determine event date
    const parsedDate = eventDate ? parseISO(eventDate) : null;
    const date = parsedDate ? fromPKT(parsedDate) : todayPKT();
    const dayAfter = new Date(date.getTime() + 24 * 60 * 60 * 1000);

    // Check for existing event
    const existing = await db.attendanceEvent.findFirst({
      where: {
        groupId,
        eventDate: { gte: date, lt: dayAfter },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Event already exists for this group and date", existingEventId: existing.id },
        { status: 409 }
      );
    }

    const event = await db.attendanceEvent.create({
      data: {
        groupId,
        title: title.trim(),
        eventDate: date,
      },
    });

    await logAudit({
      userId: user.id,
      action: "event_create",
      entityType: "attendance_events",
      entityId: event.id,
      newValues: { groupId, title: title.trim(), eventDate: date.toISOString() },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET: List groups available for event creation.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const scope = await resolveRequestedHierarchy(user);
    if (scope instanceof NextResponse) return scope;
    const groups = await db.group.findMany({ where: { ...hierarchyGroupWhere(scope), isActive: true }, select: { id: true, name: true, batchId: true, batch: { select: { name: true } } } });
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("List groups error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
