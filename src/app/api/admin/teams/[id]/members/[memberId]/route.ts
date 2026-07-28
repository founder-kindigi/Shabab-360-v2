/**
 * PATCH  /api/admin/teams/[id]/members/[memberId]
 * DELETE /api/admin/teams/[id]/members/[memberId]
 *
 * Canonical membership mutation endpoints.
 * Authorization: teams.memberships.manage + city scope.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireCityScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { updateMembershipSchema } from "@/lib/collaboration-teams/schemas";

type Params = { params: Promise<{ id: string; memberId: string }> };

// ── Shared lookup ─────────────────────────────────────────────────────────────

async function resolveMembership(teamId: string, memberId: string) {
  return db.staffTeamMembership.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      teamId: true,
      staffMetaId: true,
      title: true,
      isActive: true,
      endedAt: true,
      team: { select: { cityId: true } },
    },
  });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof NextResponse) return auth;

  const { id: teamId, memberId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const parsed = updateMembershipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const membership = await resolveMembership(teamId, memberId);
  if (!membership || membership.teamId !== teamId) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  if (!requireCityScope(auth.user, membership.team.cityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!membership.isActive) {
    return NextResponse.json(
      { error: "Cannot update an inactive membership" },
      { status: 409 }
    );
  }

  const oldValues = { title: membership.title, endedAt: membership.endedAt };

  const updated = await db.staffTeamMembership.update({
    where: { id: memberId },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
    },
    select: {
      id: true,
      teamId: true,
      staffMetaId: true,
      title: true,
      startedAt: true,
      endedAt: true,
      isActive: true,
    },
  });

  await logAudit({
    userId: auth.user.id!,
    action: "update",
    entityType: "staff_team_membership",
    entityId: memberId,
    oldValues,
    newValues: { title: updated.title, endedAt: updated.endedAt },
  });

  return NextResponse.json(updated);
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof NextResponse) return auth;

  const { id: teamId, memberId } = await params;

  const membership = await resolveMembership(teamId, memberId);
  if (!membership || membership.teamId !== teamId) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  if (!requireCityScope(auth.user, membership.team.cityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!membership.isActive) {
    return NextResponse.json(
      { error: "Membership is already inactive" },
      { status: 409 }
    );
  }

  const deactivated = await db.staffTeamMembership.update({
    where: { id: memberId },
    data: { isActive: false, endedAt: new Date() },
    select: {
      id: true,
      teamId: true,
      staffMetaId: true,
      isActive: true,
      endedAt: true,
    },
  });

  await logAudit({
    userId: auth.user.id!,
    action: "delete",
    entityType: "staff_team_membership",
    entityId: memberId,
    oldValues: { isActive: true },
    newValues: { isActive: false, endedAt: deactivated.endedAt },
  });

  return NextResponse.json(deactivated);
}
