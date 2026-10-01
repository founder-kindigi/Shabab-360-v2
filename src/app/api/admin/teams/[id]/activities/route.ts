import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { createTeamActivitySchema } from "@/lib/validations/team";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: teamId } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: { id: true, cityId: true, name: true },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, team.cityId);
  if (resolved.error || resolved.cityId !== team.cityId) {
    return NextResponse.json(
      { error: "Access denied: team is outside assigned scope" },
      { status: 403 }
    );
  }

  const [canView, canManage, currentMembership] = await Promise.all([
    userHasCapability(user, "organisation.view"),
    userHasCapability(user, "organisation.manage"),
    db.staffTeamMembership.findFirst({
      where: {
        teamId,
        isActive: true,
        endedAt: null,
        staffMeta: { userId: user.id, isActive: true },
      },
      select: { staffMetaId: true },
    }),
  ]);

  if (!canView && !currentMembership) {
    return NextResponse.json({ error: "Forbidden: active team membership is required" }, { status: 403 });
  }

  const activities = await db.activityPlanItem.findMany({
    where: { teamId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      assignedStaff: {
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
      },
      contentBlock: { select: { id: true, category: true } },
    },
  });

  const activeMemberships = await db.staffTeamMembership.findMany({
    where: { teamId, isActive: true, endedAt: null },
    select: { staffMetaId: true },
  });
  const activeMemberMetaIds = new Set(activeMemberships.map((m) => m.staffMetaId));

  const formatted = activities.map((a) => {
    const isCurrentMember = a.assignedStaff
      ? activeMemberMetaIds.has(a.assignedStaff.id)
      : true;

    return {
      id: a.id,
      teamId: a.teamId,
      title: a.title,
      description: a.description,
      status: a.status,
      scheduledFor: a.scheduledFor,
      contentBlockId: a.contentBlockId,
      assignedStaffMetaId: a.assignedStaffMetaId,
      assignedStaff: a.assignedStaff,
      isCurrentMember,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  });

  return NextResponse.json({
    data: formatted,
    total: formatted.length,
    meta: {
      canManage,
      currentStaffMetaId: currentMembership?.staffMetaId || null,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("organisation.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: teamId } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: { id: true, cityId: true, isActive: true },
  });

  if (!team || !team.isActive) {
    return NextResponse.json(
      { error: "Collaboration team not found or archived" },
      { status: 400 }
    );
  }

  const resolved = await resolveActorCity(user, team.cityId);
  if (resolved.error || resolved.cityId !== team.cityId) {
    return NextResponse.json(
      { error: "Access denied: team is outside assigned scope" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createTeamActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  if (parsed.data.assignedStaffMetaId) {
    const activeMembership = await db.staffTeamMembership.findFirst({
      where: {
        teamId,
        staffMetaId: parsed.data.assignedStaffMetaId,
        isActive: true,
        endedAt: null,
      },
    });

    if (!activeMembership) {
      return NextResponse.json(
        { error: "Target staff is not an active member of this team" },
        { status: 400 }
      );
    }
  }

  const activity = await db.$transaction(async (tx) => {
    const created = await tx.activityPlanItem.create({
      data: {
        teamId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        scheduledFor: parsed.data.scheduledFor
          ? new Date(parsed.data.scheduledFor)
          : null,
        contentBlockId: parsed.data.contentBlockId || null,
        assignedStaffMetaId: parsed.data.assignedStaffMetaId || null,
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

    await tx.auditLog.create({
      data: createAuditLogData({
        userId: user.id,
        action: "team.activity.create",
        entityType: "team_activity",
        entityId: created.id,
        newValues: {
          teamId,
          title: created.title,
          assignedStaffMetaId: created.assignedStaffMetaId || null,
          status: created.status,
        },
      }),
    });

    return created;
  });

  return NextResponse.json(activity, { status: 201 });
}
