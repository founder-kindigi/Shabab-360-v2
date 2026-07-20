import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, fromPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { isValid, parseISO } from "date-fns";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const body = await req.json();
    const { groupId, title, eventDate } = body;

    if (typeof groupId !== "string" || typeof title !== "string" || !groupId || !title.trim()) {
      return NextResponse.json(
        { error: "groupId and title are required" },
        { status: 400 }
      );
    }

    // Scope check
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { batch: { include: { park: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      user,
      { parkId: group.batch.parkId, groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

    // Determine event date
    const parsedDate = typeof eventDate === "string" ? parseISO(eventDate) : null;
    if (parsedDate && !isValid(parsedDate)) {
      return NextResponse.json({ error: "Invalid eventDate" }, { status: 400 });
    }
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
    if (user.role === "murabbi") {
      const scopeError = requireResourceScope(
        user,
        { groupId: user.assignedGroupId },
        ATTENDANCE_ROLES
      );
      if (scopeError) return scopeError;

      const groups = await db.group.findMany({
        where: { id: user.assignedGroupId!, isActive: true },
        select: { id: true, name: true, batchId: true, batch: { select: { name: true } } },
      });
      return NextResponse.json({ groups });
    } else {
      const scopeError = requireResourceScope(user, { parkId: user.assignedParkId }, ATTENDANCE_ROLES);
      if (scopeError) return scopeError;

      const batches = await db.batch.findMany({
        where: { parkId: user.assignedParkId!, isActive: true },
        select: { id: true },
      });
      const groups = await db.group.findMany({
        where: { batchId: { in: batches.map((b) => b.id) }, isActive: true },
        select: { id: true, name: true, batchId: true, batch: { select: { name: true } } },
      });
      return NextResponse.json({ groups });
    }
  } catch (error) {
    console.error("List groups error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
