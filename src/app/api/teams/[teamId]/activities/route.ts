import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { isStaffActiveTeamMember } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";
import { createActivitySchema } from "@/lib/validations/teams";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireCapability("teams.workspace.view");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId } = await params;

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: auth.user.id },
  });

  if (!staffMeta || !(await isStaffActiveTeamMember(staffMeta.id, teamId))) {
    return NextResponse.json({ error: "Active team membership required" }, { status: 403 });
  }

  const activities = await db.activityPlanItem.findMany({
    where: { teamId },
    include: {
      assignedStaff: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      contentBlock: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: activities });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireCapability("teams.workspace.manage");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId } = await params;

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: auth.user.id },
  });

  if (!staffMeta || !(await isStaffActiveTeamMember(staffMeta.id, teamId))) {
    return NextResponse.json({ error: "Active team membership required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  const { title, description, contentBlockId, assignedStaffMetaId, scheduledFor } = parsed.data;

  const isAssigneeMember = await isStaffActiveTeamMember(assignedStaffMetaId, teamId);
  if (!isAssigneeMember) {
    return NextResponse.json(
      { error: "Assignee is not an active member of this team" },
      { status: 400 }
    );
  }

  const item = await db.activityPlanItem.create({
    data: {
      teamId,
      title,
      description: description || null,
      contentBlockId: contentBlockId || null,
      assignedStaffMetaId,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      status: "planned",
    },
  });

  await db.auditLog.create({
    data: {
      userId: auth.user.id,
      action: "create_activity_plan_item",
      entityType: "ActivityPlanItem",
      entityId: item.id,
      newValues: JSON.stringify({ title, assignedStaffMetaId, scheduledFor }),
      reason: "Created team activity item",
    },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
