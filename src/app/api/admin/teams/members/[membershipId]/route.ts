import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireCityScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ membershipId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof NextResponse) return auth;

  const { membershipId } = await params;
  const membership = await db.staffTeamMembership.findUnique({
    where: { id: membershipId },
    include: {
      team: { select: { id: true, cityId: true, name: true } },
    },
  });

  if (!membership) {
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

  const updated = await db.staffTeamMembership.update({
    where: { id: membershipId },
    data: {
      isActive: false,
      endedAt: new Date(),
    },
  });

  await logAudit({
    userId: auth.user.id!,
    action: "team_membership.revoke",
    entityType: "StaffTeamMembership",
    entityId: membershipId,
    oldValues: { isActive: membership.isActive, endedAt: membership.endedAt },
    newValues: { isActive: false, endedAt: updated.endedAt },
  });

  return NextResponse.json(updated);
}
