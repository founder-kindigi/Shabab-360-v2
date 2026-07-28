import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { updateEventSchema } from "@/lib/validations/event";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("events.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const verified = await verifyEventCityAccess(user, id);
  if (verified.error || !verified.event) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const canManage = await userHasCapability(user, "events.manage");
  if (verified.event.status === "planned" && !canManage) {
    return NextResponse.json(
      { error: "Forbidden: planned event visibility requires events.manage capability" },
      { status: 403 }
    );
  }

  const event = await db.event.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true, code: true } },
      teams: {
        include: {
          memberships: {
            where: { isActive: true },
            include: { staffMeta: { include: { user: { select: { id: true, name: true, email: true } } } } },
          },
        },
      },
      responsibilities: {
        where: { isActive: true },
        include: {
          assignedToStaffMeta: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
      plannerItems: true,
    },
  });

  return NextResponse.json(event);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const verified = await verifyEventCityAccess(user, id);
  if (verified.error || !verified.event) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.cityId !== undefined && body.cityId !== verified.event.cityId) {
    return NextResponse.json({ error: "cityId is immutable" }, { status: 400 });
  }

  if (verified.event.status === "cancelled") {
    return NextResponse.json({ error: "Event is already cancelled" }, { status: 409 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.venue !== undefined) updateData.venue = data.venue;
  if (data.venueNotes !== undefined) updateData.venueNotes = data.venueNotes;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.cost !== undefined) updateData.cost = data.cost;
  if (data.requiresConsent !== undefined) updateData.requiresConsent = data.requiresConsent;
  if (data.requiresMedical !== undefined) updateData.requiresMedical = data.requiresMedical;

  const updatedEvent = await db.event.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    userId: user.id,
    action: "event.update",
    entityType: "Event",
    entityId: id,
    oldValues: {
      title: verified.event.title,
      status: verified.event.status,
      eventType: verified.event.eventType,
    },
    newValues: {
      title: updatedEvent.title,
      status: updatedEvent.status,
      eventType: updatedEvent.eventType,
    },
  });

  return NextResponse.json(updatedEvent);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const verified = await verifyEventCityAccess(user, id);
  if (verified.error || !verified.event) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  if (verified.event.status === "cancelled") {
    return NextResponse.json({ error: "Event is already cancelled" }, { status: 409 });
  }

  const cancelledEvent = await db.event.update({
    where: { id },
    data: { status: "cancelled" },
  });

  await logAudit({
    userId: user.id,
    action: "event.cancel",
    entityType: "Event",
    entityId: id,
    oldValues: { status: verified.event.status },
    newValues: { status: "cancelled" },
  });

  return NextResponse.json(cancelledEvent);
}
