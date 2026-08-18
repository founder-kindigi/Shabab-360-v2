import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";

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

  if (!membership.isActive || membership.endedAt !== null) {
    return NextResponse.json({ error: "Membership is already inactive" }, { status: 409 });
  }

  const resolved = await resolveActorCity(user, membership.team.cityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json(
      { error: resolved.error || "City resolution failed" },
      { status: resolved.status || 400 }
    );
  }

  let updated;
  try {
    updated = await db.$transaction(async (tx) => {
      const endedAt = new Date();
      const result = await tx.staffTeamMembership.updateMany({
        where: { id: membershipId, isActive: true, endedAt: null },
        data: { isActive: false, endedAt },
      });

      if (result.count !== 1) {
        throw new Error("MEMBERSHIP_ALREADY_INACTIVE");
      }

      await tx.auditLog.create({
        data: createAuditLogData({
          userId: user.id!,
          action: "team_membership.revoke",
          entityType: "StaffTeamMembership",
          entityId: membershipId,
          oldValues: { isActive: membership.isActive, endedAt: membership.endedAt },
          newValues: { isActive: false, endedAt },
        }),
      });

      return { ...membership, isActive: false, endedAt };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBERSHIP_ALREADY_INACTIVE") {
      return NextResponse.json({ error: "Membership is already inactive" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json(updated);
}
