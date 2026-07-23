import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isStaffActiveTeamMember } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";
import { updateActivitySchema } from "@/lib/validations/teams";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; id: string }> }
) {
  const auth = await requireCapability("teams.workspace.view");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId, id } = await params;

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: auth.user.id },
  });

  if (!staffMeta || !(await isStaffActiveTeamMember(staffMeta.id, teamId))) {
    return NextResponse.json({ error: "Active team membership required" }, { status: 403 });
  }

  const item = await db.activityPlanItem.findUnique({
    where: { id },
  });

  if (!item || item.teamId !== teamId) {
    return NextResponse.json({ error: "Activity plan item not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  const hasManageCapability = await userHasCapability(auth.user, "teams.workspace.manage");

  const updateData: {
    status?: string;
    assignedStaffMetaId?: string | null;
    scheduledFor?: Date | null;
  } = {};

  if (hasManageCapability) {
    if (parsed.data.assignedStaffMetaId !== undefined) {
      if (parsed.data.assignedStaffMetaId !== null) {
        const isAssigneeMember = await isStaffActiveTeamMember(parsed.data.assignedStaffMetaId, teamId);
        if (!isAssigneeMember) {
          return NextResponse.json(
            { error: "Assignee is not an active member of this team" },
            { status: 400 }
          );
        }
      }
      updateData.assignedStaffMetaId = parsed.data.assignedStaffMetaId;
    }

    if (parsed.data.scheduledFor !== undefined) {
      updateData.scheduledFor = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null;
    }

    updateData.status = parsed.data.status;
  } else {
    // Viewer view transition rule: caller must be direct assignee and transitioning from planned to in_progress only
    if (item.assignedStaffMetaId !== staffMeta.id) {
      return NextResponse.json({ error: "Forbidden: Not direct assignee" }, { status: 403 });
    }

    if (parsed.data.status !== "in_progress" || item.status !== "planned") {
      return NextResponse.json(
        { error: "Forbidden: teams.workspace.view users may only transition direct assignments from planned to in_progress" },
        { status: 403 }
      );
    }

    if (parsed.data.assignedStaffMetaId !== undefined || parsed.data.scheduledFor !== undefined) {
      return NextResponse.json(
        { error: "Forbidden: Cannot modify assignee or schedule without teams.workspace.manage" },
        { status: 403 }
      );
    }

    updateData.status = "in_progress";
  }

  const updated = await db.activityPlanItem.update({
    where: { id },
    data: updateData,
  });

  await db.auditLog.create({
    data: {
      userId: auth.user.id,
      action: "update_activity_status",
      entityType: "ActivityPlanItem",
      entityId: id,
      oldValues: JSON.stringify({ status: item.status }),
      newValues: JSON.stringify({ status: updated.status }),
      reason: "Updated activity status",
    },
  });

  return NextResponse.json({ data: updated });
}
