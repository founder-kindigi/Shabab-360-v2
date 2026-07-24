import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyEventCityAccess } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createPlannerItemSchema } from "@/lib/validations/event-team-planner";

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

  const items = await db.eventPlannerItem.findMany({
    where: { eventId: id },
    include: {
      assignedStaffMeta: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      team: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

  const parsed = createPlannerItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.assignedToStaffMetaId) {
    const staffMeta = await db.staffMeta.findUnique({
      where: { id: data.assignedToStaffMetaId },
      include: { assignedCity: true, assignedPark: { include: { city: true } } },
    });
    if (!staffMeta || !staffMeta.isActive) {
      return NextResponse.json({ error: "Assignee staff member not found or inactive" }, { status: 400 });
    }
    const staffCityId = staffMeta.assignedCityId || staffMeta.assignedPark?.cityId;
    if (staffCityId !== verified.event.cityId) {
      return NextResponse.json(
        { error: "Assignee staff member belongs to a different city than the event" },
        { status: 400 }
      );
    }
  }

  if (data.teamId) {
    const team = await db.temporaryEventTeam.findUnique({
      where: { id: data.teamId },
    });
    if (!team || team.eventId !== id || !team.isActive) {
      return NextResponse.json(
        { error: "Target temporary team not found or does not belong to this event" },
        { status: 400 }
      );
    }
  }

  const item = await db.eventPlannerItem.create({
    data: {
      eventId: id,
      title: data.title,
      description: data.description || null,
      assignedToStaffMetaId: data.assignedToStaffMetaId || null,
      teamId: data.teamId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority || "medium",
      status: data.status || "pending",
    },
  });

  await logAudit({
    userId: user.id,
    action: "event.planner_item.create",
    entityType: "EventPlannerItem",
    entityId: item.id,
    newValues: { eventId: id, title: item.title, priority: item.priority },
  });

  return NextResponse.json(item, { status: 201 });
}
