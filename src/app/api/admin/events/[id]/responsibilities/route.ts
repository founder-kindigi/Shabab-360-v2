import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createEventResponsibilityBodySchema } from "@/lib/validations/event-responsibility";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const canView = await userHasCapability(user, "events.view");
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const verified = await verifyEventCityAccess(user, id);
  if (verified.error || !verified.event) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const responsibilities = await db.eventResponsibility.findMany({
    where: { eventId: id },
    include: {
      assignedToStaffMeta: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(responsibilities);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const canManageResp = await userHasCapability(user, "events.responsibilities.manage");
  const canManageEvent = await userHasCapability(user, "events.manage");
  if (!canManageResp && !canManageEvent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    return NextResponse.json(
      { error: "Client-supplied cityId is rejected. City is derived from event" },
      { status: 400 }
    );
  }

  const parsed = createEventResponsibilityBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const assigneeStaffMeta = await db.staffMeta.findUnique({
    where: { id: data.assignedToStaffMetaId },
    include: {
      assignedCity: true,
      assignedPark: { include: { city: true } },
    },
  });

  if (!assigneeStaffMeta || !assigneeStaffMeta.isActive) {
    return NextResponse.json(
      { error: "Assignee staff assignment not found or inactive" },
      { status: 400 }
    );
  }

  const assigneeCityId =
    assigneeStaffMeta.assignedCityId || assigneeStaffMeta.assignedPark?.cityId;

  if (assigneeCityId !== verified.event.cityId) {
    return NextResponse.json(
      { error: "Assignee staff member belongs to a different city than the event" },
      { status: 400 }
    );
  }

  const responsibility = await db.eventResponsibility.create({
    data: {
      eventId: id,
      title: data.title,
      description: data.description || null,
      assignedToStaffMetaId: data.assignedToStaffMetaId,
      assignedBy: user.id,
      cityId: verified.event.cityId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: true,
    },
  });

  await logAudit({
    userId: user.id,
    action: "event.responsibility.assign",
    entityType: "EventResponsibility",
    entityId: responsibility.id,
    newValues: {
      id: responsibility.id,
      eventId: id,
      title: responsibility.title,
      assignedToStaffMetaId: responsibility.assignedToStaffMetaId,
      startDate: responsibility.startDate,
      endDate: responsibility.endDate,
    },
  });

  return NextResponse.json(responsibility, { status: 201 });
}
