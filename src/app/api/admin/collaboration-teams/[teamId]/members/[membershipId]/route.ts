import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string; membershipId: string }> }
) {
  const roleError = await requireRole(["super_admin"]);
  if (roleError) return roleError;

  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { teamId, membershipId } = await params;
  const membership = await db.staffTeamMembership.findFirst({
    where: { id: membershipId, teamId, isActive: true },
    select: { id: true, teamId: true, staffMetaId: true, title: true },
  });
  if (!membership) return NextResponse.json({ error: "Active membership not found" }, { status: 404 });

  await db.staffTeamMembership.update({
    where: { id: membership.id },
    data: { isActive: false, endedAt: new Date() },
  });
  await logAudit({
    userId: capabilityAuth.user.id!,
    action: "delete",
    entityType: "staff_team_membership",
    entityId: membership.id,
    oldValues: { teamId: membership.teamId, staffMetaId: membership.staffMetaId, title: membership.title },
  });

  return NextResponse.json({ success: true });
}
