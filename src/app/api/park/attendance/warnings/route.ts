import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const warningsQuerySchema = z.object({ groupId: optionalIdentifier() });

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("attendance.mark");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

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

    const scopeError = requireResourceScope(
      user,
      { parkId: group.batch.parkId, groupId },
      ATTENDANCE_ROLES
    );
    if (scopeError) return scopeError;

    // Get batch settings for thresholds
    const settings = group.batch.settings || {
      warningAbsents: 3,
      dropoutAbsents: 6,
    };

    const warningAbsents = settings.warningAbsents || 3;
    const dropoutAbsents = settings.dropoutAbsents || 6;
    const criticalThreshold = Math.ceil(warningAbsents * 0.67);

    // Get all active participants in the group
    const participants = await db.participant.findMany({
      where: { groupId, state: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    if (participants.length === 0) {
      return NextResponse.json({
        warnings: [],
        settings: { warningAbsents, dropoutAbsents },
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

    // Build a map: eventId -> Set of participant IDs with "absent" status
    const absentByEvent = new Map<string, Set<string>>();
    // Build a map: participantId -> Set of event IDs where they were present/late/excused
    const attendedEvents = new Map<string, Set<string>>();

    for (const rec of records) {
      if (rec.status === "absent") {
        const set = absentByEvent.get(rec.eventId) || new Set();
        set.add(rec.participantId);
        absentByEvent.set(rec.eventId, set);
      } else if (rec.status === "present" || rec.status === "late") {
        // Not absent in this event
        const set = attendedEvents.get(rec.participantId) || new Set();
        set.add(rec.eventId);
        attendedEvents.set(rec.participantId, set);
      }
    }

    // For each participant, count consecutive absences from most recent events
    const warnings: Array<{
      participantId: string;
      participantName: string;
      consecutiveAbsents: number;
      level: "warning" | "critical" | "dropout";
      threshold: number;
      lastAttendanceDate: string | null;
    }> = [];

    for (const participant of participants) {
      let consecutiveAbsents = 0;
      let lastAttendanceDate: string | null = null;
      const participantAttended = attendedEvents.get(participant.id);

      for (const event of events) {
        const absentSet = absentByEvent.get(event.id);
        if (absentSet && absentSet.has(participant.id)) {
          consecutiveAbsents++;
        } else if (participantAttended && participantAttended.has(event.id)) {
          // Participant attended this event — stop counting consecutive absences
          lastAttendanceDate = formatPKT(event.eventDate, "yyyy-MM-dd");
          break;
        }
        // If participant has no record for this event, we skip it (not counted as absent)
        // unless all events have records — but we only count "absent" records
      }

      // Determine warning level
      let level: "warning" | "critical" | "dropout" | null = null;
      let threshold = 0;

      if (consecutiveAbsents >= dropoutAbsents) {
        level = "dropout";
        threshold = dropoutAbsents;
      } else if (consecutiveAbsents >= warningAbsents) {
        level = "warning";
        threshold = warningAbsents;
      } else if (consecutiveAbsents >= criticalThreshold) {
        level = "critical";
        threshold = criticalThreshold;
      }

      if (level) {
        warnings.push({
          participantId: participant.id,
          participantName: participant.name,
          consecutiveAbsents,
          level,
          threshold,
          lastAttendanceDate,
        });
      }
    }

    return NextResponse.json({
      warnings,
      settings: { warningAbsents, dropoutAbsents },
    });
  } catch (error) {
    console.error("Attendance warnings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
