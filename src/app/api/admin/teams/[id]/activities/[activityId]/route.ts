import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { updateTeamActivitySchema } from "@/lib/validations/team";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: teamId, activityId } = await params;

  const existing = await db.activityPlanItem.findUnique({
    where: { id: activityId },
    include: { team: { select: { id: true, cityId: true } } },
  });

  if (!existing || existing.teamId !== teamId) {
    return NextResponse.json(
      { error: "Team activity not found" },
      { status: 404 }
    );
  }

  const resolved = await resolveActorCity(user, existing.team.cityId);
  if (resolved.error || resolved.cityId !== existing.team.cityId) {
    return NextResponse.json(
      { error: "Access denied: team is outside assigned scope" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateTeamActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { title, description, assignedStaffMetaId, contentBlockId, status, scheduledFor } = parsed.data;
  const canManage = await userHasCapability(user, "organisation.manage");
  const currentMembership = await db.staffTeamMembership.findFirst({
    where: {
      teamId,
      isActive: true,
      endedAt: null,
      staffMeta: { userId: user.id, isActive: true },
    },
    select: { staffMetaId: true },
  });
  const isOwnAssignment = Boolean(
    currentMembership && existing.assignedStaffMetaId === currentMembership.staffMetaId
  );

  if (!canManage) {
    const isSelfStart =
      isOwnAssignment &&
      existing.status === "planned" &&
      status === "in_progress" &&
      title === undefined &&
      description === undefined &&
      assignedStaffMetaId === undefined &&
      contentBlockId === undefined &&
      scheduledFor === undefined;

    if (!isSelfStart) {
      return NextResponse.json(
        { error: "Forbidden: only managers may edit this activity; assignees may only start their own planned work" },
        { status: 403 }
      );
    }
  }

  if (["completed", "cancelled"].includes(existing.status)) {
    return NextResponse.json({ error: "Conflict: completed or cancelled activities cannot be changed" }, { status: 409 });
  }

  if (status && !canManage && status !== "in_progress") {
    return NextResponse.json({ error: "Forbidden: assignees may only start work" }, { status: 403 });
  }

  // Enforce active membership check if updating to a new assigned staff member
  if (assignedStaffMetaId && assignedStaffMetaId !== existing.assignedStaffMetaId) {
    const activeMembership = await db.staffTeamMembership.findFirst({
      where: {
        staffMetaId: assignedStaffMetaId,
        teamId,
        isActive: true,
        endedAt: null,
      },
    });

    if (!activeMembership) {
      return NextResponse.json(
        {
          error:
            "Invalid assignment: target staff member is not an active member of this team.",
        },
        { status: 400 }
      );
    }
  }

  const updateData = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(assignedStaffMetaId !== undefined && { assignedStaffMetaId }),
    ...(contentBlockId !== undefined && { contentBlockId }),
    ...(status !== undefined && { status }),
    ...(scheduledFor !== undefined && { scheduledFor: scheduledFor ? new Date(scheduledFor) : null }),
  };

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.activityPlanItem.updateMany({
      where: { id: activityId, status: existing.status },
      data: updateData,
    });
    if (result.count !== 1) {
      throw new Error("ACTIVITY_STATE_CONFLICT");
    }
    const activity = await tx.activityPlanItem.findUnique({
      where: { id: activityId },
      include: { assignedStaff: { select: { id: true, user: { select: { name: true, email: true } } } } },
    });
    if (!activity) throw new Error("ACTIVITY_NOT_FOUND");
    await tx.auditLog.create({
      data: createAuditLogData({
        userId: user.id,
        action: "team.activity.update",
        entityType: "team_activity",
        entityId: activity.id,
        oldValues: { status: existing.status },
        newValues: { teamId, activityId, status: activity.status },
      }),
    });
    return activity;
  }).catch((error) => {
    if (error instanceof Error && error.message === "ACTIVITY_STATE_CONFLICT") {
      return null;
    }
    throw error;
  });

  if (!updated) {
    return NextResponse.json({ error: "Conflict: activity changed by another user" }, { status: 409 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> }
) {
  const auth = await requireCapability("organisation.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: teamId, activityId } = await params;

  const existing = await db.activityPlanItem.findUnique({
    where: { id: activityId },
    include: { team: { select: { id: true, cityId: true } } },
  });

  if (!existing || existing.teamId !== teamId) {
    return NextResponse.json(
      { error: "Team activity not found" },
      { status: 404 }
    );
  }

  const resolved = await resolveActorCity(user, existing.team.cityId);
  if (resolved.error || resolved.cityId !== existing.team.cityId) {
    return NextResponse.json(
      { error: "Access denied: team is outside assigned scope" },
      { status: 403 }
    );
  }

  await db.$transaction(async (tx) => {
    await tx.activityPlanItem.delete({
      where: { id: activityId },
    });
    await tx.auditLog.create({
      data: createAuditLogData({
        userId: user.id,
        action: "team.activity.delete",
        entityType: "team_activity",
        entityId: activityId,
        newValues: { teamId, title: existing.title },
      }),
    });
  });

  return NextResponse.json({ success: true });
}
