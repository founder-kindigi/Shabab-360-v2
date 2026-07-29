import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { requireAuth } from "@/lib/auth/authorize";
import { updateActivitySchema } from "@/lib/teams/activity-schemas";
import { requireTeamWorkspaceAccess } from "@/lib/teams/workspace-auth";
import { ACTIVE_MEMBERSHIP_FILTER } from "@/lib/collaboration-teams/schemas";

type Params = { params: Promise<{ id: string; activityId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id: teamId, activityId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 }); }
  const parsed = updateActivitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const activity = await db.activityPlanItem.findFirst({ where: { id: activityId, teamId }, select: { id: true, status: true, assignedStaffMetaId: true } });
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const manage = await requireTeamWorkspaceAccess(auth.user, teamId, "teams.workspace.manage");
  const isManager = manage.ok;
  const access = isManager ? manage : await requireTeamWorkspaceAccess(auth.user, teamId, "teams.workspace.view");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const ownStart = !isManager && activity.assignedStaffMetaId === access.staffMetaId && activity.status === "planned" && parsed.data.status === "in_progress" && Object.keys(parsed.data).length === 1;
  if (!isManager && !ownStart) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isManager && parsed.data.status) {
    const allowedManagerTransition =
      (activity.status === "planned" && parsed.data.status === "in_progress") ||
      (activity.status === "in_progress" && ["completed", "cancelled"].includes(parsed.data.status));
    if (!allowedManagerTransition) {
      return NextResponse.json({ error: "Invalid activity status transition" }, { status: 409 });
    }
  }

  if (isManager && parsed.data.assignedStaffMetaId) {
    const member = await db.staffTeamMembership.findFirst({ where: { teamId, staffMetaId: parsed.data.assignedStaffMetaId, ...ACTIVE_MEMBERSHIP_FILTER, staffMeta: { isActive: true } }, select: { id: true } });
    if (!member) return NextResponse.json({ error: "Assignee must be an active member of this team" }, { status: 400 });
  }
  if (parsed.data.status && !isManager && parsed.data.status !== "in_progress") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await db.$transaction(async (tx) => {
    const saved = await tx.activityPlanItem.update({ where: { id: activityId }, data: parsed.data });
    await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "update_activity_status", entityType: "activity_plan_item", entityId: saved.id, oldValues: { status: activity.status }, newValues: { activityId: saved.id, teamId, previousStatus: activity.status, newStatus: saved.status, assigneeId: saved.assignedStaffMetaId } }) });
    return saved;
  });
  return NextResponse.json(updated);
}
