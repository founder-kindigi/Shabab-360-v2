import { applyAttendanceMutation } from "@/lib/attendance/apply-mutation";
import { syncMutationSchema } from "@/lib/attendance/schemas";
import { requireResolvedGroupScope, groupResourceScope } from "@/lib/auth/hierarchy";
import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { checkAttendanceAlerts } from "@/lib/attendance-alerts";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { parseISO } from "date-fns";
import { markAttendanceSchema } from "@/lib/attendance/schemas";
import { userHasCapability } from "@/lib/auth/capability-access";

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
            park: true,
            batch: { include: { park: true } },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const scopeError = requireResolvedGroupScope(user, { ...event.group, id: event.groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

    // Keep historical rosters available while excluding students whose dropout
    // became effective on or before this session.
    const participants = await db.participant.findMany({
      where: {
        groupId: event.groupId,
        OR: [
          { state: "active" },
          { state: "dropout", dropoutAt: { gt: event.eventDate } },
        ],
      },
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
        participantState: p.state,
        dropoutAt: p.dropoutAt?.toISOString() ?? null,
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
      permissions: {
        canCorrect: await userHasCapability(user, "attendance.correct"),
      },
      event: {
        id: event.id,
        title: event.title,
        groupId: event.groupId,
        groupName: event.group.name,
        batchName: event.group.batch.name,
        parkName: (event.group.parkId ? event.group.park : event.group.batch.park)?.name ?? null,
        eventDate: event.eventDate.toISOString(),
        isClosed: event.isClosed,
        resetVersion: event.resetVersion,
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

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("attendance.mark");
  if (capability instanceof NextResponse) return capability;
  const body = await req.json().catch(() => null);
  if (!body || !("expectedVersion" in body)) return NextResponse.json({ error: "Reload the roster before marking attendance" }, { status: 428 });
  const parsed = syncMutationSchema.safeParse({ ...body, eventId, ownerId: auth.user.id });
  if (!parsed.success) return NextResponse.json({ error: "Invalid attendance mark" }, { status: 400 });
  const result = await applyAttendanceMutation(auth.user, parsed.data);
  if (result.status === "failed") return NextResponse.json({ error: result.error, code: result.code }, { status: result.code === "FORBIDDEN" ? 403 : result.code === "EVENT_NOT_FOUND" ? 404 : result.retryable ? 503 : 409 });
  return NextResponse.json({ success: true, record: { id: result.recordId, eventId, participantId: parsed.data.participantId, status: parsed.data.status, markedAt: result.version } });
}
