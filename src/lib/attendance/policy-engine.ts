import { db } from "@/lib/db";
import { formatPKT, toPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";

export interface BatchSettingsWithOffDays {
  automaticDropoutEnabled: boolean;
  dropoutConsecutiveWeeks: number;
  offWeekdays?: { weekday: number }[];
  offDates?: { offDate: Date }[];
}

/**
 * Checks if a given date falls on a batch off-day (configurable off-weekdays or one-off off-dates).
 */
export function isBatchOffDay(
  batchSettings: BatchSettingsWithOffDays | null | undefined,
  date: Date
): boolean {
  if (!batchSettings) return false;

  const datePKT = toPKT(date);
  const weekday = datePKT.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Check offWeekdays
  if (batchSettings.offWeekdays && batchSettings.offWeekdays.length > 0) {
    if (batchSettings.offWeekdays.some((w) => w.weekday === weekday)) {
      return true;
    }
  }

  // Check offDates
  if (batchSettings.offDates && batchSettings.offDates.length > 0) {
    const targetDateKey = formatPKT(datePKT, "yyyy-MM-dd");
    for (const od of batchSettings.offDates) {
      const offDateKey = formatPKT(toPKT(od.offDate), "yyyy-MM-dd");
      if (offDateKey === targetDateKey) {
        return true;
      }
    }
  }

  return false;
}

export interface ManualDropoutParams {
  participantId: string;
  reason: string;
  source?: string;
  actorUserId: string;
}

/**
 * Manually drops out a student, updating profile state and logging audit.
 * Denies transition if already dropped out (idempotent conflict check).
 */
export async function performManualDropout({
  participantId,
  reason,
  source = "manual",
  actorUserId,
}: ManualDropoutParams) {
  const participant = await db.participant.findUnique({
    where: { id: participantId },
    include: {
      group: {
        include: {
          batch: {
            include: {
              park: true,
            },
          },
        },
      },
    },
  });

  if (!participant) {
    return { success: false, notFound: true, error: "Participant not found" };
  }

  if (participant.state === "dropped_out") {
    return {
      success: false,
      conflict: true,
      error: "Participant is already dropped out",
      participant,
    };
  }

  const now = new Date();
  const updatedParticipant = await db.$transaction(async (tx) => {
    const updated = await tx.participant.update({
      where: { id: participantId },
      data: {
        state: "dropped_out",
        dropoutAt: now,
        dropoutReason: reason,
        dropoutSource: source,
      },
    });

    logAudit({
      userId: actorUserId,
      action: "student_dropout_manual",
      entityType: "participant",
      entityId: participantId,
      reason,
      newValues: {
        source,
        previousState: participant.state,
      },
    });

    return updated;
  });

  return { success: true, participant: updatedParticipant };
}

export interface AutomaticDropoutResult {
  processed: boolean;
  droppedOut: boolean;
  consecutiveWeeks: number;
  reason?: string;
}

/**
 * Evaluates automatic dropout policy for a participant based on 3 consecutive completed absent weeks.
 * Off-days, leave/excused, N/A, and unclosed sessions DO NOT count towards absent weeks or reset the count.
 */
export async function evaluateAutomaticDropout(
  participantId: string
): Promise<AutomaticDropoutResult> {
  const participant = await db.participant.findUnique({
    where: { id: participantId },
    include: {
      group: {
        include: {
          batch: {
            include: {
              settings: {
                include: {
                  offWeekdays: true,
                  offDates: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!participant) {
    return { processed: false, droppedOut: false, consecutiveWeeks: 0, reason: "participant_not_found" };
  }

  if (participant.state === "dropped_out") {
    return { processed: false, droppedOut: false, consecutiveWeeks: 0, reason: "already_dropped_out" };
  }

  const batchSettings = participant.group?.batch?.settings;
  if (!batchSettings || !batchSettings.automaticDropoutEnabled) {
    return { processed: false, droppedOut: false, consecutiveWeeks: 0, reason: "automatic_dropout_disabled" };
  }

  const requiredConsecutiveWeeks = batchSettings.dropoutConsecutiveWeeks || 3;

  // Fetch all attendance records for closed events
  const records = await db.attendanceRecord.findMany({
    where: {
      participantId,
      event: { isClosed: true },
    },
    include: {
      event: { select: { eventDate: true, isClosed: true } },
    },
    orderBy: { event: { eventDate: "asc" } },
  });

  if (records.length === 0) {
    return { processed: true, droppedOut: false, consecutiveWeeks: 0 };
  }

  // Filter out off-days
  const validRecords = records.filter(
    (r) => !isBatchOffDay(batchSettings, r.event.eventDate)
  );

  // Group valid records into calendar week buckets (Monday to Sunday)
  const weekMap = new Map<string, typeof validRecords>();
  for (const r of validRecords) {
    const datePKT = toPKT(r.event.eventDate);
    const weekStart = startOfWeek(datePKT, { weekStartsOn: 1 });
    const weekKey = formatPKT(weekStart, "yyyy-MM-dd");
    const existing = weekMap.get(weekKey) || [];
    existing.push(r);
    weekMap.set(weekKey, existing);
  }

  // Sort week keys chronologically
  const sortedWeekKeys = Array.from(weekMap.keys()).sort();

  let consecutiveAbsentWeeks = 0;
  for (const weekKey of sortedWeekKeys) {
    const weekRecords = weekMap.get(weekKey)!;
    const hasPresent = weekRecords.some(
      (r) => r.status === "present" || r.status === "late"
    );
    const hasAbsent = weekRecords.some((r) => r.status === "absent");
    const isAllExcusedOrNA = weekRecords.every(
      (r) => r.status === "excused" || r.status === "na"
    );

    if (hasPresent) {
      // Attended this week -> resets streak
      consecutiveAbsentWeeks = 0;
    } else if (hasAbsent) {
      // Absent this week without any present -> increment streak
      consecutiveAbsentWeeks++;
    } else if (isAllExcusedOrNA) {
      // Leave / N/A -> does NOT count as absent and does NOT reset count
      continue;
    }
  }

  if (consecutiveAbsentWeeks >= requiredConsecutiveWeeks) {
    const now = new Date();
    const reason = `${consecutiveAbsentWeeks} consecutive completed absent weeks (automatic policy)`;
    await db.$transaction(async (tx) => {
      await tx.participant.update({
        where: { id: participantId },
        data: {
          state: "dropped_out",
          dropoutAt: now,
          dropoutReason: reason,
          dropoutSource: "automatic",
        },
      });

      logAudit({
        userId: "system",
        action: "student_dropout_automatic",
        entityType: "participant",
        entityId: participantId,
        reason,
        newValues: {
          consecutiveAbsentWeeks,
          threshold: requiredConsecutiveWeeks,
        },
      });
    });

    return { processed: true, droppedOut: true, consecutiveWeeks: consecutiveAbsentWeeks };
  }

  return { processed: true, droppedOut: false, consecutiveWeeks: consecutiveAbsentWeeks };
}
