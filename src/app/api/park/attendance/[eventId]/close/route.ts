import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { evaluateConsecutiveAbsenceWeeks } from "@/lib/attendance/dropout-policy";
import { parseClassWeekdays } from "@/lib/attendance/schedule";
import { closeAttendanceEventSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

const EVENT_SUPERVISOR_ROLES = ["super_admin", "program_admin", "city_head", "park_lead"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("attendance.correct");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const parsedBody = closeAttendanceEventSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  try {
    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { group: { include: { batch: { include: { park: true, settings: true } } } } },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.isClosed) return NextResponse.json({ error: "Event is already closed" }, { status: 409 });
    const scopeError = requireResourceScope(auth.user, {
      cityId: event.group.batch.cityId ?? event.group.batch.park.cityId,
      parkId: event.group.batch.parkId,
      groupId: event.groupId,
    }, EVENT_SUPERVISOR_ROLES);
    if (scopeError) return scopeError;

    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: auth.user.id },
      include: { user: { select: { name: true } } },
    });
    const settings = event.group.batch.settings;
    const classWeekdays = parseClassWeekdays(settings?.classWeekdays);
    const eventWeekday = (event.eventDate.getUTCDay() + 6) % 7;
    const isFinalWeeklySession = eventWeekday === Math.max(...classWeekdays.map((day) => (day + 6) % 7));

    const result = await db.$transaction(async (tx) => {
      const closed = await tx.attendanceEvent.updateMany({
        where: { id: eventId, isClosed: false },
        data: { isClosed: true, closedAt: new Date(), closedBy: staffMeta?.id },
      });
      if (closed.count !== 1) throw new Error("ATTENDANCE_ALREADY_CLOSED");

      let automaticDropouts = 0;
      if ((settings?.automaticDropoutEnabled ?? true) && isFinalWeeklySession) {
        const participants = await tx.participant.findMany({ where: { groupId: event.groupId, state: "active" } });
        const closedEvents = await tx.attendanceEvent.findMany({
          where: { groupId: event.groupId, eventDate: { lte: event.eventDate }, isClosed: true },
          select: { id: true, eventDate: true },
        });
        const records = participants.length === 0 ? [] : await tx.attendanceRecord.findMany({
          where: {
            participantId: { in: participants.map((participant) => participant.id) },
            eventId: { in: closedEvents.map((closedEvent) => closedEvent.id) },
          },
        });
        const recordMap = new Map(records.map((record) => [`${record.participantId}:${record.eventId}`, record.status]));
        for (const participant of participants) {
          const evaluation = evaluateConsecutiveAbsenceWeeks(
            closedEvents.map((closedEvent) => ({
              eventId: closedEvent.id,
              eventDate: closedEvent.eventDate,
              // Missing marks make the week incomplete; they must not trigger dropout.
              status: recordMap.get(`${participant.id}:${closedEvent.id}`) ?? "excused",
            })),
            {
              warningConsecutiveWeeks: settings?.warningConsecutiveWeeks ?? 2,
              dropoutConsecutiveWeeks: settings?.dropoutConsecutiveWeeks ?? 3,
            },
          );
          if (!evaluation.shouldDropout) continue;
          const dropoutReason = `${evaluation.consecutiveAbsentWeeks} consecutive fully absent class weeks`;
          const changed = await tx.participant.updateMany({
            where: { id: participant.id, state: "active" },
            data: {
              state: "dropout",
              dropoutAt: event.eventDate,
              dropoutReason,
              dropoutSource: "automatic",
              reactivatedAt: null,
            },
          });
          if (changed.count !== 1) continue;
          automaticDropouts += 1;
          await tx.auditLog.create({ data: createAuditLogData({
            userId: auth.user.id,
            action: "student.dropout.automatic",
            entityType: "participant",
            entityId: participant.id,
            oldValues: { state: participant.state },
            newValues: { state: "dropout", dropoutAt: event.eventDate, dropoutSource: "automatic" },
            reason: dropoutReason,
          }) });
        }
      }
      await tx.auditLog.create({ data: createAuditLogData({
        userId: auth.user.id,
        action: "event_close",
        entityType: "attendance_events",
        entityId: eventId,
        newValues: { closedByName: staffMeta?.user?.name, automaticDropouts },
        reason: parsedBody.data.reason,
      }) });
      return { automaticDropouts };
    });

    return NextResponse.json({
      success: true,
      event: { id: eventId, isClosed: true, closedAt: new Date().toISOString(), closedByName: staffMeta?.user?.name ?? null },
      automaticDropouts: result.automaticDropouts,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ATTENDANCE_ALREADY_CLOSED") {
      return NextResponse.json({ error: "Event is already closed" }, { status: 409 });
    }
    console.error("Close event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
