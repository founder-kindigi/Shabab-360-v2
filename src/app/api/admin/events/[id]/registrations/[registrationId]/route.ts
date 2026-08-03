import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { createAuditLogData } from "@/lib/audit";
import { db } from "@/lib/db";

const updateRegistrationSchema = z.object({
  consentStatus: z.enum(["pending", "provided", "not_required"]).optional(),
  cancel: z.literal(true).optional(),
}).strict().refine((data) => data.cancel || data.consentStatus, { message: "Provide a supported lifecycle update" });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; registrationId: string }> }) {
  const { id, registrationId } = await params;
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const access = await verifyEventCityAccess(auth.user, id);
  if (access.error || !access.event) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = updateRegistrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const registration = await db.eventRegistration.findFirst({ where: { id: registrationId, eventId: access.event.id } });
  if (!registration) return NextResponse.json({ error: "Event registration not found" }, { status: 404 });
  if (registration.status === "cancelled") return NextResponse.json({ error: "Event registration is already cancelled" }, { status: 409 });
  if (parsed.data.consentStatus === "not_required" && access.event.requiresConsent) {
    return NextResponse.json({ error: "Consent is required for this event" }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    const record = await tx.eventRegistration.update({
      where: { id: registration.id },
      data: parsed.data.cancel ? { status: "cancelled", cancelledAt: new Date() } : { consentStatus: parsed.data.consentStatus },
    });
    await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: parsed.data.cancel ? "event.registration.cancel" : "event.registration.consent", entityType: "event_registration", entityId: record.id, newValues: { status: record.status, consentStatus: record.consentStatus } }) });
    return record;
  });
  return NextResponse.json(updated);
}
