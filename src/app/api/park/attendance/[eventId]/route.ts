import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { checkAttendanceAlerts } from "@/lib/attendance-alerts";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { parseISO } from "date-fns";

const VALID_STATUSES = ["present", "absent", "late", "excused"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

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

    // Get all active participants in the group
    const participants = await db.participant.findMany({
      where: { groupId: event.groupId, state: "active" },
      orderBy: { name: "asc" },
    });

    // Get all records for this event
    const records = await db.attendanceRecord.findMany({
      where: { eventId },
    });

    // Resolve markedBy names from StaffMeta
    const markedByIds = records
      .map((r) => r.markedBy)
      .filter((id): id is string => !!id);
    // Also include the event's closedBy if present
    const allStaffIds = [...new Set([...markedByIds, ...(event.closedBy ? [event.closedBy] : [])])];
    const staffMetas = allStaffIds.length > 0
      ? await db.staffMeta.findMany({
          where: { id: { in: allStaffIds } },
          include: { user: { select: { name: true } } },
        })
      : [];
    const staffNameMap = new Map(
      staffMetas.map((s) => [s.id, s.user.name])
    );

    // Build a map of participantId -> record
    const recordMap = new Map(
      records.map((r) => [
        r.participantId,
        {
          status: r.status,
          recordId: r.id,
          markedAt: r.markedAt.toISOString(),
          markedByName: r.markedBy ? staffNameMap.get(r.markedBy) || null : null,
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
        closedByName: event.closedBy ? staffNameMap.get(event.closedBy) || null : null,
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
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

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

    const scopeError = requireResourceScope(
      user,
      { parkId: event.group.batch.parkId, groupId: event.groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

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
      include: { user: { select: { name: true } } },
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

      await logAudit({
        userId: user.id,
        action: "attendance_update",
        entityType: "attendance_records",
        entityId: record.id,
        oldValues: {
          status: existingRecord.status,
        },
        newValues: {
          status,
          editReason,
          mutationId,
        },
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

      await logAudit({
        userId: user.id,
        action: "attendance_mark",
        entityType: "attendance_records",
        entityId: record.id,
        newValues: {
          status,
          mutationId,
        },
      });
    }

    // Alert evaluation runs in-process so it cannot fail on a relative server fetch.
    if (status === "absent") {
      try {
        await checkAttendanceAlerts(participantId, eventId);
      } catch (error) {
        console.error("Attendance alert evaluation failed:", error);
      }
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
