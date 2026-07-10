import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayPKT, formatPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const ALLOWED_ROLES = ["park_admin", "park_lead", "murabbi"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { groupId, title, eventDate } = body;

    if (!groupId || !title) {
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

    if (user.role === "murabbi") {
      if (user.assignedGroupId !== groupId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (user.assignedParkId !== group.batch.parkId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Determine event date
    const date = eventDate
      ? new Date(eventDate + "T00:00:00.000Z")
      : todayPKT();
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
        title,
        eventDate: date,
      },
    });

    logAudit({
      userId: user.id,
      action: "event_create",
      entityType: "attendance_events",
      entityId: event.id,
      newValues: JSON.stringify({ groupId, title, eventDate: date.toISOString() }),
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
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let groupIds: string[];

    if (user.role === "murabbi") {
      groupIds = [user.assignedGroupId!];
    } else {
      const batches = await db.batch.findMany({
        where: { parkId: user.assignedParkId!, isActive: true },
        select: { id: true },
      });
      const groups = await db.group.findMany({
        where: { batchId: { in: batches.map((b) => b.id) }, isActive: true },
        select: { id: true, name: true, batchId: true },
        include: { batch: { select: { name: true } } },
      });
      return NextResponse.json({ groups });
    }

    const groups = await db.group.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, name: true, batchId: true },
      include: { batch: { select: { name: true } } },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("List groups error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}