import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { updatePlannerItemSchema } from "@/lib/validations/event-team-planner";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("events.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const item = await db.eventPlannerItem.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!item || !item.event) {
    return NextResponse.json({ error: "Event planner item not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, item.event.cityId);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const canManage = await userHasCapability(user, "events.manage");
  const isAssignee = item.assignedToStaffMetaId
    ? await db.staffMeta.findFirst({ where: { id: item.assignedToStaffMetaId, userId: user.id } })
    : false;

  if (!canManage && !isAssignee) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to update planner item" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updatePlannerItemSchema.safeParse(body);
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
  if (data.assignedToStaffMetaId !== undefined) updateData.assignedToStaffMetaId = data.assignedToStaffMetaId;
  if (data.teamId !== undefined) updateData.teamId = data.teamId;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "completed" && !item.completedAt) {
      updateData.completedAt = new Date();
    }
  }
  if (data.completionNote !== undefined) updateData.completionNote = data.completionNote;

  const updatedItem = await db.eventPlannerItem.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    userId: user.id,
    action: "event.planner_item.update",
    entityType: "EventPlannerItem",
    entityId: id,
    oldValues: { status: item.status },
    newValues: { status: updatedItem.status },
  });

  return NextResponse.json(updatedItem);
}
