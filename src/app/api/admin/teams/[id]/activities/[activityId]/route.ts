import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { updateTeamActivitySchema } from "@/lib/validations/team";

export async function PATCH(
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

  const body = await request.json().catch(() => ({}));
  const parsed = updateTeamActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { title, description, assignedStaffMetaId, contentBlockId, status, scheduledFor } =
    parsed.data;

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

  const updated = await db.activityPlanItem.update({
    where: { id: activityId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(assignedStaffMetaId !== undefined && { assignedStaffMetaId }),
      ...(contentBlockId !== undefined && { contentBlockId }),
      ...(status !== undefined && { status }),
      ...(scheduledFor !== undefined && {
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      }),
    },
    include: {
      assignedStaff: {
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  logAudit({
    userId: user.id,
    action: "team.activity.update",
    entityType: "team_activity",
    entityId: updated.id,
    newValues: {
      teamId,
      activityId,
      status: updated.status,
    },
  });

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

  await db.activityPlanItem.delete({
    where: { id: activityId },
  });

  logAudit({
    userId: user.id,
    action: "delete",
    entityType: "team_activity",
    entityId: activityId,
    newValues: { teamId, title: existing.title },
  });

  return NextResponse.json({ success: true });
}
