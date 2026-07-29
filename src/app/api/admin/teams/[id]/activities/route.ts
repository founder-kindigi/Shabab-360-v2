import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { queryParamsToObject, queryValidationError } from "@/lib/api/query-params";
import { createActivitySchema, activityListQuerySchema } from "@/lib/teams/activity-schemas";
import { requireTeamWorkspaceAccess } from "@/lib/teams/workspace-auth";
import { requireAuth } from "@/lib/auth/authorize";
import { ACTIVE_MEMBERSHIP_FILTER } from "@/lib/collaboration-teams/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id: teamId } = await params;
  const access = await requireTeamWorkspaceAccess(auth.user, teamId, "teams.workspace.view");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = activityListQuerySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json(queryValidationError(parsed.error), { status: 400 });
  const { page, pageSize, status, assignedToMe } = parsed.data;
  const where = {
    teamId,
    ...(status ? { status } : {}),
    ...(assignedToMe === "true" ? { assignedStaffMetaId: access.staffMetaId } : {}),
  };
  const [data, total] = await Promise.all([
    db.activityPlanItem.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
      include: { assignedStaff: { select: { id: true, user: { select: { name: true, isActive: true } } } } },
    }),
    db.activityPlanItem.count({ where }),
  ]);
  const manageAccess = await requireTeamWorkspaceAccess(auth.user, teamId, "teams.workspace.manage");
  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    meta: {
      canManage: manageAccess.ok,
      currentStaffMetaId: access.staffMetaId,
    },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id: teamId } = await params;
  const access = await requireTeamWorkspaceAccess(auth.user, teamId, "teams.workspace.manage");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 }); }
  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  if (parsed.data.assignedStaffMetaId) {
    const member = await db.staffTeamMembership.findFirst({
      where: { teamId, staffMetaId: parsed.data.assignedStaffMetaId, ...ACTIVE_MEMBERSHIP_FILTER, staffMeta: { isActive: true } },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Assignee must be an active member of this team" }, { status: 400 });
  }
  if (parsed.data.contentBlockId) {
    const block = await db.contentPlanBlock.findFirst({ where: { id: parsed.data.contentBlockId, teamId } , select: { id: true } });
    if (!block) return NextResponse.json({ error: "Content block not found for this team" }, { status: 404 });
  }

  const activity = await db.$transaction(async (tx) => {
    const created = await tx.activityPlanItem.create({ data: { teamId, ...parsed.data } });
    await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "create_activity", entityType: "activity_plan_item", entityId: created.id, newValues: { activityId: created.id, teamId, status: created.status, assigneeId: created.assignedStaffMetaId } }) });
    return created;
  });
  return NextResponse.json(activity, { status: 201 });
}
