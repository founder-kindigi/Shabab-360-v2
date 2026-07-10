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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only park_admin and park_lead can close events
  if (user.role !== "park_admin" && user.role !== "park_lead") {
    return NextResponse.json(
      { error: "Forbidden - only park_admin and park_lead can close events" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 }
      );
    }

    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: {
        group: { include: { batch: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isClosed) {
      return NextResponse.json(
        { error: "Event is already closed" },
        { status: 409 }
      );
    }

    // Scope check
    if (user.assignedParkId !== event.group.batch.parkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
      include: { user: { select: { name: true } } },
    });

    const updatedEvent = await db.attendanceEvent.update({
      where: { id: eventId },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedBy: staffMeta?.id,
      },
    });

    logAudit({
      userId: user.id,
      action: "event_close",
      entityType: "attendance_events",
      entityId: eventId,
      newValues: JSON.stringify({ reason, closedByName: staffMeta?.user?.name }),
    });

    return NextResponse.json({
      success: true,
      event: {
        id: updatedEvent.id,
        isClosed: true,
        closedAt: updatedEvent.closedAt?.toISOString(),
        closedByName: staffMeta?.user?.name || null,
      },
    });
  } catch (error) {
    console.error("Close event error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}