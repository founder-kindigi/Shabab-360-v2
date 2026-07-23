import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";
import { updateTeamMemberSchema } from "@/lib/validations/teams";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; membershipId: string }> }
) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId, membershipId } = await params;

  const membership = await db.staffTeamMembership.findUnique({
    where: { id: membershipId },
    include: { team: true },
  });

  if (!membership || membership.teamId !== teamId) {
    return NextResponse.json({ error: "Team membership not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(auth.user);
  if (!resolved.success || resolved.cityId !== membership.team.cityId) {
    return NextResponse.json({ error: "Forbidden city scope mismatch" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  const updated = await db.staffTeamMembership.update({
    where: { id: membershipId },
    data: {
      title: parsed.data.title ?? null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: auth.user.id,
      action: "update_team_membership",
      entityType: "StaffTeamMembership",
      entityId: membershipId,
      oldValues: JSON.stringify({ title: membership.title }),
      newValues: JSON.stringify({ title: parsed.data.title ?? null }),
      reason: "Updated team member title",
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; membershipId: string }> }
) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId, membershipId } = await params;

  const membership = await db.staffTeamMembership.findUnique({
    where: { id: membershipId },
    include: { team: true },
  });

  if (!membership || membership.teamId !== teamId) {
    return NextResponse.json({ error: "Team membership not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(auth.user);
  if (!resolved.success || resolved.cityId !== membership.team.cityId) {
    return NextResponse.json({ error: "Forbidden city scope mismatch" }, { status: 403 });
  }

  const revoked = await db.staffTeamMembership.update({
    where: { id: membershipId },
    data: {
      isActive: false,
      endedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      userId: auth.user.id,
      action: "revoke_team_membership",
      entityType: "StaffTeamMembership",
      entityId: membershipId,
      reason: "Revoked team membership",
    },
  });

  return NextResponse.json({ data: revoked });
}
