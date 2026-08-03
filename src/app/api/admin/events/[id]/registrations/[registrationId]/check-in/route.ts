import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { createAuditLogData } from "@/lib/audit";
import { db } from "@/lib/db";

const checkInSchema = z.object({ status: z.enum(["present", "absent", "late", "excused"]) }).strict();

function utcDayRange(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; registrationId: string }> }) {
  const { id, registrationId } = await params;
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const access = await verifyEventCityAccess(auth.user, id);
  if (access.error || !access.event) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const registration = await db.eventRegistration.findFirst({
    where: { id: registrationId, eventId: access.event.id, status: { in: ["registered", "confirmed"] } },
    include: { participant: { select: { id: true, groupId: true, state: true } } },
  });
  if (!registration) return NextResponse.json({ error: "Active event registration not found" }, { status: 404 });
  if (!registration.participant.groupId || registration.participant.state !== "active") {
    return NextResponse.json({ error: "Participant is not eligible for regular attendance projection" }, { status: 409 });
  }
  if (registration.attendanceRecordId) return NextResponse.json({ error: "Registration has already been projected to attendance" }, { status: 409 });

  const regularSessions = await db.attendanceEvent.findMany({
    where: { groupId: registration.participant.groupId, eventDate: utcDayRange(access.event.startDate) },
    select: { id: true, isClosed: true },
    take: 2,
  });
  if (regularSessions.length !== 1) return NextResponse.json({ error: "Exactly one regular attendance session is required for this group and event date" }, { status: 409 });
  if (regularSessions[0].isClosed) return NextResponse.json({ error: "Regular attendance session is already closed" }, { status: 409 });

  try {
    const result = await db.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.upsert({
      where: { eventId_participantId: { eventId: regularSessions[0].id, participantId: registration.participant.id } },
      create: { eventId: regularSessions[0].id, participantId: registration.participant.id, status: parsed.data.status, markedBy: auth.user.id },
      update: { status: parsed.data.status, markedBy: auth.user.id, markedAt: new Date(), editReason: "Event attendance projection" },
    });
    const linked = await tx.eventRegistration.updateMany({
      where: { id: registration.id, attendanceRecordId: null },
      data: { attendanceRecordId: record.id, status: "attended" },
    });
    if (linked.count !== 1) throw new Error("STALE_EVENT_REGISTRATION");
    await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "event.registration.check_in", entityType: "event_registration", entityId: registration.id, newValues: { attendanceRecordId: record.id, status: parsed.data.status } }) });
      return record;
    });

    return NextResponse.json({ attendanceRecord: result });
  } catch (error) {
    if (error instanceof Error && error.message === "STALE_EVENT_REGISTRATION") {
      return NextResponse.json({ error: "Registration was updated concurrently" }, { status: 409 });
    }
    throw error;
  }
}
