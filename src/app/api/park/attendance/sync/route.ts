import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, canAccessResourceScope, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { checkAttendanceAlerts } from "@/lib/attendance-alerts";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { parseISO } from "date-fns";
import { syncAttendanceRequestSchema } from "@/lib/attendance/schemas";

type SyncResult = {
  mutationId: string;
  status: "processed" | "failed";
  recordId: string | null;
  error: string | null;
  code: string | null;
  retryable: boolean;
};

function failedResult(
  mutationId: string,
  code: string,
  error: string,
  retryable = false
): SyncResult {
  return { mutationId, status: "failed", recordId: null, error, code, retryable };
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    const parsedBody = syncAttendanceRequestSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { mutations } = parsedBody.data;

    const staffMeta = await db.staffMeta.findUnique({ where: { userId: user.id } });
    const results: SyncResult[] = [];
    const latestMutationByRecord = new Map<string, string>();
    for (const mutation of mutations) {
      latestMutationByRecord.set(
        `${mutation.eventId}:${mutation.participantId}`,
        mutation.mutationId
      );
    }

    for (const mutation of mutations) {
      const { mutationId, eventId, participantId, status, markedAt } = mutation;
      const markedAtDate = markedAt ? parseISO(markedAt) : new Date();
      if (latestMutationByRecord.get(`${eventId}:${participantId}`) !== mutationId) {
        results.push({
          mutationId,
          status: "processed",
          recordId: null,
          error: null,
          code: "SUPERSEDED",
          retryable: false,
        });
        continue;
      }

      try {
        const event = await db.attendanceEvent.findUnique({
          where: { id: eventId },
          include: { group: { include: { batch: { include: { park: true } } } } },
        });
        if (!event) {
          results.push(failedResult(mutationId, "EVENT_NOT_FOUND", "Event not found"));
          continue;
        }
        if (!canAccessResourceScope(
          user,
          { cityId: event.group.batch.park.cityId, parkId: event.group.batch.parkId, groupId: event.groupId },
          ATTENDANCE_ROLES
        )) {
          results.push(failedResult(mutationId, "FORBIDDEN", "Forbidden"));
          continue;
        }
        if (event.isClosed) {
          results.push(failedResult(mutationId, "EVENT_LOCKED", "Attendance is locked"));
          continue;
        }

        const participant = await db.participant.findFirst({
          where: { id: participantId, groupId: event.groupId },
        });
        if (!participant) {
          results.push(failedResult(
            mutationId,
            "PARTICIPANT_SCOPE_CHANGED",
            "Participant is no longer in this group"
          ));
          continue;
        }
        const dropoutEffective = participant.state === "dropout"
          && (!participant.dropoutAt || participant.dropoutAt <= event.eventDate);
        if (participant.state === "inactive" || dropoutEffective) {
          results.push(failedResult(
            mutationId,
            "ATTENDANCE_DISCONTINUED",
            "Attendance is discontinued for this participant"
          ));
          continue;
        }

        const record = await db.attendanceRecord.upsert({
          where: { eventId_participantId: { eventId, participantId } },
          create: {
            eventId,
            participantId,
            status,
            markedBy: staffMeta?.id,
            markedAt: markedAtDate,
          },
          update: {
            status,
            markedBy: staffMeta?.id,
            markedAt: markedAtDate,
          },
        });

        if (status === "absent") {
          try {
            await checkAttendanceAlerts(participantId, eventId);
          } catch (error) {
            console.error("Attendance alert evaluation failed during sync:", error);
          }
        }

        results.push({
          mutationId,
          status: "processed",
          recordId: record.id,
          error: null,
          code: null,
          retryable: false,
        });
      } catch (error) {
        results.push(failedResult(
          mutationId,
          "PROCESSING_ERROR",
          "Processing error",
          true
        ));
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
