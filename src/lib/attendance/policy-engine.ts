import { db } from "@/lib/db";
import { formatPKT, toPKT } from "@/lib/timezone";
import { createAuditLogData } from "@/lib/audit";
import { startOfWeek } from "date-fns";

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
  actorUserId: string;
  source?: string;
}

/**
 * Manually drops out a student, updating profile state and logging audit.
 * Denies transition if already dropped out (idempotent conflict check).
 */
export async function performManualDropout({
  participantId,
  reason,
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

  if (participant.state === "dropout") {
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
        state: "dropout",
        dropoutAt: now,
        dropoutReason: reason,
        dropoutSource: "manual",
      },
    });

    await tx.auditLog.create({
      data: createAuditLogData({
        userId: actorUserId,
        action: "student_dropout_manual",
        entityType: "participant",
        entityId: participantId,
        reason,
        newValues: { source: "manual", previousState: participant.state },
      }),
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

  if (participant.state === "dropout") {
    return { processed: false, droppedOut: false, consecutiveWeeks: 0, reason: "already_dropped_out" };
  }

  const batchSettings = participant.group?.batch?.settings;
  if (!batchSettings || !batchSettings.automaticDropoutEnabled) {
    return { processed: false, droppedOut: false, consecutiveWeeks: 0, reason: "automatic_dropout_disabled" };
  }

  const requiredConsecutiveWeeks = batchSettings.dropoutConsecutiveWeeks || 3;

  // Evaluate closed sessions, not only rows that happen to have an attendance
  // record. A missing/unmarked session cannot be treated as an absence.
  const events = await db.attendanceEvent.findMany({
    where: {
      groupId: participant.groupId ?? undefined,
      isClosed: true,
    },
    include: {
      records: {
        where: { participantId },
        select: { status: true },
      },
    },
    orderBy: { eventDate: "asc" },
  });

  if (events.length === 0) {
    return { processed: true, droppedOut: false, consecutiveWeeks: 0 };
  }

  // Group eligible closed sessions into calendar-week buckets. Off days are
  // removed entirely; unmarked or excused sessions invalidate that week.
  const weekMap = new Map<string, typeof events>();
  for (const event of events) {
    if (isBatchOffDay(batchSettings, event.eventDate)) continue;
    const datePKT = toPKT(event.eventDate);
    const weekStart = startOfWeek(datePKT, { weekStartsOn: 1 });
    const weekKey = formatPKT(weekStart, "yyyy-MM-dd");
    const existing = weekMap.get(weekKey) || [];
    existing.push(event);
    weekMap.set(weekKey, existing);
  }

  // Sort week keys chronologically
  const sortedWeekKeys = Array.from(weekMap.keys()).sort();

  let consecutiveAbsentWeeks = 0;
  let previousWeekStart: Date | null = null;
  for (const weekKey of sortedWeekKeys) {
    const weekStart = new Date(`${weekKey}T00:00:00.000Z`);
    if (previousWeekStart && weekStart.getTime() - previousWeekStart.getTime() > 7 * 24 * 60 * 60 * 1000) {
      consecutiveAbsentWeeks = 0;
    }
    previousWeekStart = weekStart;

    const weekEvents = weekMap.get(weekKey)!;
    const statuses = weekEvents.flatMap((event) => event.records.map((record) => record.status));
    const hasUnmarked = weekEvents.some((event) => event.records.length === 0);
    const hasPresent = statuses.some((status) => status === "present" || status === "late");
    const hasAbsent = statuses.some((status) => status === "absent");

    if (hasUnmarked || hasPresent) {
      // Attended this week -> resets streak
      consecutiveAbsentWeeks = 0;
    } else if (hasAbsent) {
      // Absent this week without any present -> increment streak
      consecutiveAbsentWeeks++;
    } else {
      // Leave/excused/N/A-only weeks do not count as absence and cannot keep a
      // consecutive absence streak alive.
      consecutiveAbsentWeeks = 0;
    }
  }

  if (consecutiveAbsentWeeks >= requiredConsecutiveWeeks) {
    const now = new Date();
    const reason = `${consecutiveAbsentWeeks} consecutive completed absent weeks (automatic policy)`;
    await db.$transaction(async (tx) => {
      await tx.participant.update({
        where: { id: participantId },
        data: {
          state: "dropout",
          dropoutAt: now,
          dropoutReason: reason,
          dropoutSource: "automatic",
        },
      });

      await tx.auditLog.create({
        data: createAuditLogData({
          action: "student_dropout_automatic",
          entityType: "participant",
          entityId: participantId,
          reason,
          newValues: { consecutiveAbsentWeeks, threshold: requiredConsecutiveWeeks },
        }),
      });
    });

    return { processed: true, droppedOut: true, consecutiveWeeks: consecutiveAbsentWeeks };
  }

  return { processed: true, droppedOut: false, consecutiveWeeks: consecutiveAbsentWeeks };
}
