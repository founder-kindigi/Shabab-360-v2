import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendAbsenceAlert } from "@/lib/email-service";

export type AttendanceAlertResult = {
  warnings: string[];
  dropouts: string[];
};

export class AttendanceAlertError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409
  ) {
    super(message);
  }
}

type ParticipantWithGuardians = Prisma.ParticipantGetPayload<{
  include: {
    guardianLinks: {
      include: {
        guardian: {
          include: { user: { select: { id: true; email: true } } };
        };
      };
    };
  };
}>;

export async function checkAttendanceAlerts(
  participantId: string,
  eventId: string
): Promise<AttendanceAlertResult> {
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
    throw new AttendanceAlertError("Event not found", 404);
  }

  const participant = await db.participant.findFirst({
    where: { id: participantId, groupId: event.groupId },
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
  if (!participant) {
    throw new AttendanceAlertError("Participant not in this event group", 409);
  }

  const allEvents = await db.attendanceEvent.findMany({
    where: {
      groupId: event.groupId,
      eventDate: { lte: event.eventDate },
    },
    select: { id: true },
    orderBy: { eventDate: "desc" },
  });
  const records = await db.attendanceRecord.findMany({
    where: {
      eventId: { in: allEvents.map((item) => item.id) },
      participantId,
    },
    select: { eventId: true, status: true },
  });

  const recordByEvent = new Map(records.map((record) => [record.eventId, record.status]));
  let consecutiveAbsents = 0;
  for (const attendanceEvent of allEvents) {
    if (recordByEvent.get(attendanceEvent.id) !== "absent") {
      break;
    }
    consecutiveAbsents++;
  }

  const warningAbsents = event.group.batch.settings?.warningAbsents ?? 3;
  const dropoutAbsents = event.group.batch.settings?.dropoutAbsents ?? 6;
  const result: AttendanceAlertResult = { warnings: [], dropouts: [] };

  if (consecutiveAbsents >= dropoutAbsents) {
    result.dropouts.push(
      `${participantId} has ${consecutiveAbsents} consecutive absences (dropout threshold: ${dropoutAbsents})`
    );
    await queueGuardianAlert(participant, event.title, consecutiveAbsents, "dropout", dropoutAbsents);
  } else if (consecutiveAbsents >= warningAbsents) {
    result.warnings.push(
      `${participantId} has ${consecutiveAbsents} consecutive absences (warning threshold: ${warningAbsents})`
    );
    await queueGuardianAlert(participant, event.title, consecutiveAbsents, "warning", warningAbsents);
  }

  return result;
}

async function queueGuardianAlert(
  participant: ParticipantWithGuardians,
  eventTitle: string,
  consecutiveAbsents: number,
  level: "warning" | "dropout",
  threshold: number
) {
  if (!participant) return;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingAlert = await db.notification.findFirst({
    where: {
      channel: "absence_alert",
      status: { in: ["pending", "sent"] },
      createdAt: { gte: oneDayAgo },
      AND: [
        { data: { contains: `\"participantId\":\"${participant.id}\"` } },
        { data: { contains: `\"level\":\"${level}\"` } },
      ],
    },
  });
  if (existingAlert) return;

  for (const link of participant.guardianLinks) {
    const guardian = link.guardian;
    await sendAbsenceAlert(
      {
        id: guardian.id,
        userId: guardian.userId ?? undefined,
        name: guardian.name,
        phone: guardian.phone,
        user: guardian.user ? { email: guardian.user.email } : null,
      },
      { id: participant.id, name: participant.name },
      eventTitle,
      consecutiveAbsents,
      level,
      threshold
    );
  }
}
