import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const registerParticipantSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required"),
  feeStatus: z.enum(["unpaid", "paid", "exempt"]).optional().default("unpaid"),
  hasConsent: z.boolean().optional().default(false),
  hasMedical: z.boolean().optional().default(false),
  action: z.enum(["register", "check_in"]).optional().default("register"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("organisation.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: eventId } = await params;

  const eventItem = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      cityId: true,
      capacity: true,
      cost: true,
      requiresConsent: true,
      requiresMedical: true,
      status: true,
    },
  });

  if (!eventItem) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, eventItem.cityId);
  if (resolved.error || resolved.cityId !== eventItem.cityId) {
    return NextResponse.json(
      { error: "Access denied: event is outside assigned scope" },
      { status: 403 }
    );
  }

  const [registrations, registeredCount, waitlistedCount, checkedInCount] =
    await Promise.all([
      db.eventRegistration.findMany({
        where: { eventId },
        orderBy: { registeredAt: "desc" },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              phone: true,
              group: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.eventRegistration.count({ where: { eventId, status: "registered" } }),
      db.eventRegistration.count({ where: { eventId, status: "waitlisted" } }),
      db.eventRegistration.count({ where: { eventId, status: "checked_in" } }),
    ]);

  const formatted = registrations.map((r) => ({
    id: r.id,
    participantId: r.participantId,
    participantName: r.participant.name,
    participantPhone: r.participant.phone,
    groupName: r.participant.group?.name || null,
    status: r.status,
    feeStatus: r.feeStatus,
    feeAmount: r.feeAmount ? Number(r.feeAmount) : 0,
    hasConsent: r.hasConsent,
    hasMedical: r.hasMedical,
    checkedInAt: r.checkedInAt,
    registeredAt: r.registeredAt,
  }));

  return NextResponse.json({
    event: {
      id: eventItem.id,
      title: eventItem.title,
      capacity: eventItem.capacity,
      cost: eventItem.cost ? Number(eventItem.cost) : 0,
      requiresConsent: eventItem.requiresConsent,
      requiresMedical: eventItem.requiresMedical,
      status: eventItem.status,
    },
    counts: {
      registered: registeredCount,
      waitlisted: waitlistedCount,
      checkedIn: checkedInCount,
      totalRegistrations: registrations.length,
      availableCapacity:
        eventItem.capacity !== null
          ? Math.max(eventItem.capacity - (registeredCount + checkedInCount), 0)
          : null,
    },
    registrations: formatted,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("organisation.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: eventId } = await params;

  const eventItem = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      cityId: true,
      capacity: true,
      cost: true,
      requiresConsent: true,
      requiresMedical: true,
    },
  });

  if (!eventItem) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, eventItem.cityId);
  if (resolved.error || resolved.cityId !== eventItem.cityId) {
    return NextResponse.json(
      { error: "Access denied: event is outside assigned scope" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = registerParticipantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { participantId, feeStatus, hasConsent, hasMedical, action } = parsed.data;

  const participant = await db.participant.findUnique({
    where: { id: participantId },
    select: { id: true, name: true, state: true },
  });

  if (!participant || participant.state !== "active") {
    return NextResponse.json(
      { error: "Target participant not found or inactive" },
      { status: 400 }
    );
  }

  // Check current registered count against event capacity limit
  const activeCount = await db.eventRegistration.count({
    where: { eventId, status: { in: ["registered", "checked_in"] } },
  });

  let assignedStatus = action === "check_in" ? "checked_in" : "registered";
  if (
    action !== "check_in" &&
    eventItem.capacity !== null &&
    activeCount >= eventItem.capacity
  ) {
    assignedStatus = "waitlisted"; // Auto-waitlist when capacity exceeded
  }

  const registration = await db.eventRegistration.upsert({
    where: {
      eventId_participantId: { eventId, participantId },
    },
    create: {
      eventId,
      participantId,
      status: assignedStatus,
      feeStatus,
      feeAmount: eventItem.cost || 0,
      hasConsent: Boolean(hasConsent),
      hasMedical: Boolean(hasMedical),
      checkedInAt: action === "check_in" ? new Date() : null,
    },
    update: {
      status: assignedStatus,
      feeStatus,
      hasConsent: Boolean(hasConsent),
      hasMedical: Boolean(hasMedical),
      ...(action === "check_in" && { checkedInAt: new Date() }),
    },
  });

  logAudit({
    userId: user.id,
    action: action === "check_in" ? "event.checkin" : "event.register",
    entityType: "event_registration",
    entityId: registration.id,
    newValues: {
      eventId,
      participantId,
      status: registration.status,
      feeStatus: registration.feeStatus,
    },
  });

  return NextResponse.json(registration, { status: 201 });
}
