import { requireResolvedGroupScope } from "@/lib/auth/hierarchy";
import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";
import { evaluateConsecutiveAbsenceWeeks } from "@/lib/attendance/dropout-policy";
import { eligibleForSession } from "@/lib/attendance/opportunities";

const warningsQuerySchema = z.object({ groupId: optionalIdentifier() });

export async function GET(req: Request) {
  const auth = await requireCapability("attendance.mark");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const query = warningsQuerySchema.safeParse(queryParamsToObject(new URL(req.url).searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const groupId = query.data.groupId;

  if (!groupId) {
    return NextResponse.json(
      { error: "groupId is required" },
      { status: 400 }
    );
  }

  try {
    // Verify scope: the group must belong to the user's park or be their assigned group
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        park: true,
        batch: {
          include: {
            park: true,
            settings: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const scopeError = requireResolvedGroupScope(user, group, ATTENDANCE_ROLES);
    if (scopeError) return scopeError;

    // Use the authoritative weekly threshold model (same as attendance summaries).
    const batchSettings = group.batch.settings;
    const warningConsecutiveWeeks = batchSettings?.warningConsecutiveWeeks ?? 2;
    const dropoutConsecutiveWeeks = batchSettings?.dropoutConsecutiveWeeks ?? 3;
    // F-19: criticalThreshold is an undocumented sub-warning tier visible in the
    // API response. Removing it requires an owner decision on whether it is part
    // of the supported contract. It is preserved here pending that decision.
    const criticalThreshold = Math.ceil(warningConsecutiveWeeks * 0.67);

    // Get all participants in the group including lifecycle fields needed for
    // eligibleForSession filtering (F-11 pattern applied to warnings).
    const participants = await db.participant.findMany({
      where: { groupId, state: "active" },
      select: {
        id: true,
        name: true,
        state: true,
        joinedAt: true,
        dropoutAt: true,
        reactivatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    if (participants.length === 0) {
      return NextResponse.json({
        warnings: [],
        settings: { warningConsecutiveWeeks, dropoutConsecutiveWeeks },
      });
    }

    const participantIds = participants.map((p) => p.id);

    // Get all attendance events for this group, ordered by date DESC
    const events = await db.attendanceEvent.findMany({
      where: { groupId },
      select: { id: true, eventDate: true },
      orderBy: { eventDate: "desc" },
    });

    const eventIds = events.map((e) => e.id);

    // Get all attendance records for these events and participants
    const records = await db.attendanceRecord.findMany({
      where: {
        eventId: { in: eventIds },
        participantId: { in: participantIds },
      },
      select: {
        eventId: true,
        participantId: true,
        status: true,
      },
    });

    // Build a map: eventId → eventDate for eligibility checks
    const eventDateById = new Map(events.map((e) => [e.id, e.eventDate]));

    const warnings: Array<{
      participantId: string;
      participantName: string;
      consecutiveAbsentWeeks: number;
      level: "warning" | "critical" | "dropout";
      threshold: number;
      lastAttendanceDate: string | null;
    }> = [];

    for (const participant of participants) {
      // Filter records to only sessions where this participant was eligible.
      // Ineligible sessions (before joinedAt, during dropout gap) are excluded.
      const eligibleRecords = records
        .filter((rec) => {
          if (rec.participantId !== participant.id) return false;
          const eventDate = eventDateById.get(rec.eventId);
          if (!eventDate) return false;
          return eligibleForSession(participant, eventDate);
        })
        .map((rec) => ({
          eventId: rec.eventId,
          eventDate: eventDateById.get(rec.eventId)!,
          status: rec.status as "present" | "absent" | "late" | "excused",
        }));

      const weeklyResult = evaluateConsecutiveAbsenceWeeks(eligibleRecords, {
        warningConsecutiveWeeks,
        dropoutConsecutiveWeeks,
      });

      // Determine last attendance date from records (most recent present/late)
      let lastAttendanceDate: string | null = null;
      for (const rec of eligibleRecords.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())) {
        if (rec.status === "present" || rec.status === "late") {
          lastAttendanceDate = formatPKT(rec.eventDate, "yyyy-MM-dd");
          break;
        }
      }

      // Determine warning level using weekly thresholds
      let level: "warning" | "critical" | "dropout" | null = null;
      let threshold = 0;

      if (weeklyResult.shouldDropout) {
        level = "dropout";
        threshold = dropoutConsecutiveWeeks;
      } else if (weeklyResult.shouldWarn) {
        level = "warning";
        threshold = warningConsecutiveWeeks;
      } else if (weeklyResult.consecutiveAbsentWeeks >= criticalThreshold) {
        // F-19: Undocumented critical sub-tier. Requires owner decision to keep or remove.
        level = "critical";
        threshold = criticalThreshold;
      }

      if (level) {
        warnings.push({
          participantId: participant.id,
          participantName: participant.name,
          consecutiveAbsentWeeks: weeklyResult.consecutiveAbsentWeeks,
          level,
          threshold,
          lastAttendanceDate,
        });
      }
    }

    return NextResponse.json({
      warnings,
      settings: { warningConsecutiveWeeks, dropoutConsecutiveWeeks },
    });
  } catch (error) {
    console.error("Attendance warnings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
