import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ membershipId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("organisation.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

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

  const resolved = await resolveActorCity(user, membership.team.cityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json(
      { error: resolved.error || "City resolution failed" },
      { status: resolved.status || 400 }
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
    userId: user.id!,
    action: "team_membership.revoke",
    entityType: "StaffTeamMembership",
    entityId: membershipId,
    oldValues: { isActive: membership.isActive, endedAt: membership.endedAt },
    newValues: { isActive: false, endedAt: updated.endedAt },
  });

  return NextResponse.json(updated);
}
