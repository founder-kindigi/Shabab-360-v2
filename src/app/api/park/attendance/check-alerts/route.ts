import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAbsenceAlert } from "@/lib/email-service";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const ALLOWED_ROLES = ["park_admin", "park_lead", "murabbi"];

/**
 * POST /api/park/attendance/check-alerts
 * Called when attendance is marked. Checks if the participant has reached
 * warning or dropout thresholds and creates notifications for guardians.
 *
 * Body: { participantId: string, eventId: string }
 * Returns: { warnings: Array, dropouts: Array }
 */
export async function POST(req: Request) {
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
    const { participantId, eventId } = body as {
      participantId?: string;
      eventId?: string;
    };

    if (!participantId || !eventId) {
      return NextResponse.json(
        { error: "participantId and eventId are required" },
        { status: 400 }
      );
    }

    // Fetch the event with group → batch → settings
    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: {
        group: {
          include: {
            batch: {
              include: { settings: true },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const batchSettings = event.group.batch.settings;
    const warningAbsents = batchSettings?.warningAbsents ?? 3;
    const dropoutAbsents = batchSettings?.dropoutAbsents ?? 6;

    // Count consecutive absences for this participant across all events in this group
    // ordered by date DESC
    const allEvents = await db.attendanceEvent.findMany({
      where: { groupId: event.groupId },
      select: { id: true, eventDate: true },
      orderBy: { eventDate: "desc" },
    });

    const eventIds = allEvents.map((e) => e.id);

    const records = await db.attendanceRecord.findMany({
      where: {
        eventId: { in: eventIds },
        participantId,
      },
      select: {
        eventId: true,
        status: true,
      },
    });

    // Count consecutive absences from most recent events
    const recordByEvent = new Map(records.map((r) => [r.eventId, r.status]));
    let consecutiveAbsents = 0;

    for (const evt of allEvents) {
      const status = recordByEvent.get(evt.id);
      if (status === "absent") {
        consecutiveAbsents++;
      } else if (status === "present" || status === "late") {
        break;
      }
      // "excused" or no record: not counted as absent, stop counting
    }

    const result: { warnings: string[]; dropouts: string[] } = {
      warnings: [],
      dropouts: [],
    };

    // Check thresholds
    if (consecutiveAbsents >= dropoutAbsents) {
      result.dropouts.push(
        `${participantId} has ${consecutiveAbsents} consecutive absences (dropout threshold: ${dropoutAbsents})`
      );

      // Queue notification for guardian(s)
      await queueGuardianAlert(
        participantId,
        event.title,
        consecutiveAbsents,
        "dropout",
        dropoutAbsents
      );
    } else if (consecutiveAbsents >= warningAbsents) {
      result.warnings.push(
        `${participantId} has ${consecutiveAbsents} consecutive absences (warning threshold: ${warningAbsents})`
      );

      // Only send warning notification once per threshold crossing
      await queueGuardianAlert(
        participantId,
        event.title,
        consecutiveAbsents,
        "warning",
        warningAbsents
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Check alerts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Find guardians for a participant and queue an absence alert notification.
 * Only sends if no identical notification has been sent for this participant
 * at this same level within the last 24 hours (deduplication).
 */
async function queueGuardianAlert(
  participantId: string,
  eventTitle: string,
  consecutiveAbsents: number,
  level: "warning" | "dropout",
  threshold: number
) {
  // Fetch participant with guardian links
  const participant = await db.participant.findUnique({
    where: { id: participantId },
    include: {
      guardianLinks: {
        include: {
          guardian: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      },
    },
  });

  if (!participant) return;

  // Dedup: check if we already sent this exact alert in the last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingAlert = await db.notification.findFirst({
    where: {
      channel: "absence_alert",
      status: { in: ["pending", "sent"] },
      createdAt: { gte: oneDayAgo },
      data: {
        contains: participantId,
      },
    },
  });

  if (existingAlert) return;

  // Send to all linked guardians
  for (const link of participant.guardianLinks) {
    const guardian = link.guardian;
    await sendAbsenceAlert(
      {
        id: guardian.id,
        userId: guardian.userId,
        name: guardian.name,
        phone: guardian.phone,
        user: guardian.user
          ? { email: guardian.user.email }
          : null,
      },
      { id: participant.id, name: participant.name },
      eventTitle,
      consecutiveAbsents,
      level,
      threshold
    );
  }
}