import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { todayPKT, formatPKT, fromPKT } from "@/lib/timezone";
import { parseISO, isValid } from "date-fns";
import {
  optionalDateOnly,
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";
import { createAttendanceEventSchema } from "@/lib/attendance/schemas";
import { listAttendanceSessions } from "@/lib/attendance/session-list";

const listQuerySchema = z.object({
  parkId: optionalIdentifier(),
  date: optionalDateOnly(),
  status: z.enum(["open", "closed"]).optional(),
});

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const query = listQuerySchema.safeParse(queryParamsToObject(new URL(req.url).searchParams));
    if (!query.success) {
      return NextResponse.json(queryValidationError(query.error), { status: 400 });
    }
    let parkId = query.data.parkId || user.assignedParkId;
    const dateParam = query.data.date;
    const statusFilter = query.data.status;

    let groupIds: string[];
    if (user.role === "murabbi") {
      const scopeError = requireResourceScope(
        user,
        { groupId: user.assignedGroupId },
        ATTENDANCE_ROLES
      );
      if (scopeError) return scopeError;

      const group = await db.group.findUnique({
        where: { id: user.assignedGroupId! },
        select: { batch: { select: { parkId: true } } },
      });
      if (!group) {
        return NextResponse.json({ error: "Assigned group not found" }, { status: 403 });
      }
      parkId = group.batch.parkId;
      groupIds = [user.assignedGroupId!];
    } else {
      if (!parkId) return NextResponse.json({ error: "parkId required" }, { status: 400 });
      const park = await db.park.findUnique({
        where: { id: parkId, isActive: true },
        select: { id: true, cityId: true },
      });
      if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });

      const scopeError = requireResourceScope(user, { parkId, cityId: park.cityId }, ATTENDANCE_ROLES);
      if (scopeError) return scopeError;

      const groups = await db.group.findMany({
        where: { batch: { parkId, isActive: true }, isActive: true },
        select: { id: true },
      });
      groupIds = groups.map((group) => group.id);
    }

    // Determine date range
    let startDate: Date;
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (!isValid(parsed)) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }
      const pktDate = fromPKT(parsed);
      startDate = new Date(pktDate.getFullYear(), pktDate.getMonth(), pktDate.getDate());
    } else {
      startDate = todayPKT();
    }

    return NextResponse.json(await listAttendanceSessions({
      date: formatPKT(startDate, "yyyy-MM-dd"),
      eventDate: startDate,
      groupIds,
      parkId,
      status: statusFilter,
    }));
  } catch (error) {
    console.error("Attendance list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new attendance event for a group.
 */
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

    // Scope check: verify group belongs to user's scope
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { batch: { include: { park: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const scopeError = requireResourceScope(
      user,
      { cityId: group.batch.park.cityId, parkId: group.batch.parkId, groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

    // Check if event already exists for this group+date
    const parsedDate = eventDate ? parseISO(eventDate) : null;
    const date = parsedDate ? fromPKT(parsedDate) : todayPKT();
    const existingEvent = await db.attendanceEvent.findFirst({
      where: {
        groupId,
        eventDate: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
      },
    });

    if (existingEvent) {
      return NextResponse.json(
        { error: "Event already exists for this group and date" },
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
      newValues: { groupId, title: title.trim(), eventDate: event.eventDate.toISOString() },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error("Event create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
