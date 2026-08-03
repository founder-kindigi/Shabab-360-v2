import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { createAuditLogData } from "@/lib/audit";
import { db } from "@/lib/db";

const registrationSchema = z.object({
  participantId: z.string().trim().min(1),
}).strict();

async function accessEvent(eventId: string, capability: "events.view" | "events.manage") {
  const auth = await requireCapability(capability);
  if (auth instanceof NextResponse) return auth;
  const access = await verifyEventCityAccess(auth.user, eventId);
  if (access.error || !access.event) return NextResponse.json({ error: access.error }, { status: access.status });
  return { auth, event: access.event };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await accessEvent(id, "events.view");
  if (access instanceof NextResponse) return access;

  const registrations = await db.eventRegistration.findMany({
    where: { eventId: access.event.id },
    orderBy: { registeredAt: "asc" },
    select: { id: true, participantId: true, status: true, consentStatus: true, feeStatus: true, registeredAt: true, cancelledAt: true },
  });
  return NextResponse.json({ data: registrations });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await accessEvent(id, "events.manage");
  if (access instanceof NextResponse) return access;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const participant = await db.participant.findFirst({
    where: { id: parsed.data.participantId, state: "active", group: { batch: { park: { cityId: access.event.cityId } } } },
    select: { id: true },
  });
  if (!participant) return NextResponse.json({ error: "Active participant not found in this event city" }, { status: 404 });

  const existing = await db.eventRegistration.findUnique({ where: { eventId_participantId: { eventId: access.event.id, participantId: participant.id } } });
  if (existing) return NextResponse.json({ error: "Participant is already registered for this event" }, { status: 409 });

  if (access.event.capacity !== null) {
    const count = await db.eventRegistration.count({ where: { eventId: access.event.id, status: { in: ["registered", "confirmed"] } } });
    if (count >= access.event.capacity) return NextResponse.json({ error: "Event capacity has been reached" }, { status: 409 });
  }

  const registration = await db.$transaction(async (tx) => {
    const created = await tx.eventRegistration.create({ data: { eventId: access.event.id, participantId: participant.id } });
    await tx.auditLog.create({ data: createAuditLogData({ userId: access.auth.user.id, action: "event.registration.create", entityType: "event_registration", entityId: created.id, newValues: { eventId: access.event.id, participantId: participant.id } }) });
    return created;
  });
  return NextResponse.json(registration, { status: 201 });
}
