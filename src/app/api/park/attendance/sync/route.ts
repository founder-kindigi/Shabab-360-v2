import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, canAccessResourceScope, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { checkAttendanceAlerts } from "@/lib/attendance-alerts";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isValid, parseISO } from "date-fns";

const VALID_STATUSES = ["present", "absent", "late", "excused"] as const;
type AttendanceStatus = (typeof VALID_STATUSES)[number];

type SyncMutation = {
  mutationId: string | null;
  eventId: string | null;
  participantId: string | null;
  status: AttendanceStatus | null;
  markedAt: Date | null;
};

type SyncResult = {
  mutationId: string | null;
  status: "processed" | "failed";
  recordId: string | null;
  error: string | null;
};

function parseMutation(value: unknown): SyncMutation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { mutationId: null, eventId: null, participantId: null, status: null, markedAt: null };
  }

  const mutation = value as Record<string, unknown>;
  const status = typeof mutation.status === "string" && VALID_STATUSES.includes(mutation.status as AttendanceStatus)
    ? mutation.status as AttendanceStatus
    : null;
  const parsedMarkedAt = typeof mutation.markedAt === "string" ? parseISO(mutation.markedAt) : null;

  return {
    mutationId: typeof mutation.mutationId === "string" ? mutation.mutationId : null,
    eventId: typeof mutation.eventId === "string" ? mutation.eventId : null,
    participantId: typeof mutation.participantId === "string" ? mutation.participantId : null,
    status,
    markedAt: parsedMarkedAt && isValid(parsedMarkedAt) ? parsedMarkedAt : null,
  };
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const body = await req.json();
    const mutations = body?.mutations;

    if (!Array.isArray(mutations)) {
      return NextResponse.json({ error: "mutations array required" }, { status: 400 });
    }
    if (mutations.length > 50) {
      return NextResponse.json({ error: "Max 50 mutations per sync request" }, { status: 400 });
    }

    const staffMeta = await db.staffMeta.findUnique({ where: { userId: user.id } });
    const results: SyncResult[] = [];

    for (const rawMutation of mutations) {
      const mutation = parseMutation(rawMutation);
      const { mutationId, eventId, participantId, status, markedAt } = mutation;

      if (!mutationId || !eventId || !participantId || !status) {
        results.push({
          mutationId,
          status: "failed",
          recordId: null,
          error: "mutationId, eventId, participantId, and a valid status are required",
        });
        continue;
      }
      if (typeof (rawMutation as Record<string, unknown>).markedAt === "string" && !markedAt) {
        results.push({ mutationId, status: "failed", recordId: null, error: "Invalid markedAt" });
        continue;
      }

      try {
        const event = await db.attendanceEvent.findUnique({
          where: { id: eventId },
          include: { group: { include: { batch: true } } },
        });
        if (!event) {
          results.push({ mutationId, status: "failed", recordId: null, error: "Event not found" });
          continue;
        }
        if (!canAccessResourceScope(
          user,
          { parkId: event.group.batch.parkId, groupId: event.groupId },
          ATTENDANCE_ROLES
        )) {
          results.push({ mutationId, status: "failed", recordId: null, error: "Forbidden" });
          continue;
        }
        if (event.isClosed) {
          results.push({ mutationId, status: "failed", recordId: null, error: "Event is closed" });
          continue;
        }

        const participant = await db.participant.findFirst({
          where: { id: participantId, groupId: event.groupId, state: "active" },
        });
        if (!participant) {
          results.push({ mutationId, status: "failed", recordId: null, error: "Participant not in this group" });
          continue;
        }

        const record = await db.attendanceRecord.upsert({
          where: { eventId_participantId: { eventId, participantId } },
          create: {
            eventId,
            participantId,
            status,
            markedBy: staffMeta?.id,
            markedAt: markedAt ?? new Date(),
          },
          update: {
            status,
            markedBy: staffMeta?.id,
            markedAt: markedAt ?? new Date(),
          },
        });

        if (status === "absent") {
          try {
            await checkAttendanceAlerts(participantId, eventId);
          } catch (error) {
            console.error("Attendance alert evaluation failed during sync:", error);
          }
        }

        results.push({ mutationId, status: "processed", recordId: record.id, error: null });
      } catch (error) {
        results.push({
          mutationId,
          status: "failed",
          recordId: null,
          error: error instanceof Error ? error.message : "Processing error",
        });
      }
    }

    const processed = results.filter((result) => result.status === "processed").length;
    const failed = results.filter((result) => result.status === "failed").length;

    await logAudit({
      userId: user.id,
      action: "attendance_sync",
      entityType: "attendance_records",
      newValues: { total: mutations.length, processed, failed },
    });

    return NextResponse.json({
      results,
      summary: { total: mutations.length, processed, failed },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
