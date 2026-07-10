import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { parseISO, isValid } from "date-fns";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const VALID_STATUSES = ["present", "absent", "late", "excused"];
const ALLOWED_ROLES = ["park_admin", "park_lead", "murabbi"];

export async function GET(
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
    // Fetch event with group to get the park
    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: {
        group: {
          include: {
            batch: { include: { park: true } },
          },
        },
        closer: { include: { user: { select: { name: true } } } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Scope check
    const parkId = event.group.batch.parkId;
    if (user.role === "murabbi") {
      if (user.assignedGroupId !== event.groupId) {
        return NextResponse.json(
          { error: "Forbidden - event not in your scope" },
          { status: 403 }
        );
      }
    } else {
      if (user.assignedParkId && user.assignedParkId !== parkId) {
        return NextResponse.json(
          { error: "Forbidden - event not in your scope" },
          { status: 403 }
        );
      }
    }

    // Get all active participants in the group
    const participants = await db.participant.findMany({
      where: { groupId: event.groupId, state: "active" },
      orderBy: { name: "asc" },
    });

    // Get all records for this event
    const records = await db.attendanceRecord.findMany({
      where: { eventId },
      include: {
        marker: { include: { user: { select: { name: true } } } },
      },
    });

    // Build a map of participantId -> record
    const recordMap = new Map(
      records.map((r) => [
        r.participantId,
        {
          status: r.status,
          recordId: r.id,
          markedAt: r.markedAt.toISOString(),
          markedByName: r.marker?.user.name || null,
        },
      ])
    );

    // Join participants with records
    const roster = participants.map((p) => {
      const record = recordMap.get(p.id);
      return {
        participantId: p.id,
        participantName: p.name,
        phone: p.phone,
        status: record?.status || null,
        recordId: record?.recordId || null,
        markedAt: record?.markedAt || null,
        markedByName: record?.markedByName || null,
      };
    });

    // Summary counts
    const statusCounts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    for (const item of roster) {
      if (item.status && VALID_STATUSES.includes(item.status)) {
        statusCounts[item.status as keyof typeof statusCounts]++;
      } else {
        statusCounts.unmarked++;
      }
    }

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        groupId: event.groupId,
        groupName: event.group.name,
        batchName: event.group.batch.name,
        parkName: event.group.batch.park.name,
        eventDate: event.eventDate.toISOString(),
        isClosed: event.isClosed,
        closedAt: event.closedAt?.toISOString() || null,
        closedByName: event.closer?.user.name || null,
      },
      roster,
      summary: {
        total: roster.length,
        ...statusCounts,
      },
    });
  } catch (error) {
    console.error("Roster error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
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
    const body = await req.json();
    const { participantId, status, mutationId, editReason, markedAt } = body;

    if (!participantId || !status) {
      return NextResponse.json(
        { error: "participantId and status are required" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // Fetch event with scope info
    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: {
        group: { include: { batch: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Scope check
    if (user.role === "murabbi") {
      if (user.assignedGroupId !== event.groupId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const parkId = event.group.batch.parkId;
      if (user.assignedParkId && user.assignedParkId !== parkId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if event is closed
    if (event.isClosed) {
      if (
        user.role !== "park_admin" &&
        user.role !== "park_lead"
      ) {
        return NextResponse.json({ error: "Event is closed" }, { status: 403 });
      }
      if (!editReason) {
        return NextResponse.json(
          { error: "editReason required for closed events" },
          { status: 400 }
        );
      }
    }

    // Verify participant belongs to the event's group
    const participant = await db.participant.findFirst({
      where: { id: participantId, groupId: event.groupId, state: "active" },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not in this group" },
        { status: 409 }
      );
    }

    // Get staff meta ID for the marker
    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
    });

    // Upsert the attendance record
    const existingRecord = await db.attendanceRecord.findUnique({
      where: {
        eventId_participantId: { eventId, participantId },
      },
    });

    let record;

    if (existingRecord) {
      // Update existing
      if (!editReason && event.isClosed) {
        return NextResponse.json(
          { error: "editReason required for updates" },
          { status: 400 }
        );
      }

      record = await db.attendanceRecord.update({
        where: {
          eventId_participantId: { eventId, participantId },
        },
        data: {
          status,
          markedBy: staffMeta?.id,
          markedAt: markedAt ? parseISO(markedAt) : new Date(),
          editReason: editReason || null,
        },
      });

      logAudit({
        userId: user.id,
        action: "attendance_update",
        entityType: "attendance_records",
        entityId: record.id,
        oldValues: JSON.stringify({
          status: existingRecord.status,
        }),
        newValues: JSON.stringify({
          status,
          editReason,
          mutationId,
        }),
      });
    } else {
      // Create new
      record = await db.attendanceRecord.create({
        data: {
          eventId,
          participantId,
          status,
          markedBy: staffMeta?.id,
          markedAt: markedAt ? parseISO(markedAt) : new Date(),
        },
      });

      logAudit({
        userId: user.id,
        action: "attendance_mark",
        entityType: "attendance_records",
        entityId: record.id,
        newValues: JSON.stringify({
          status,
          mutationId,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        eventId,
        participantId,
        status: record.status,
        markedAt: record.markedAt.toISOString(),
        markedByName: staffMeta?.user?.name || null,
      },
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}