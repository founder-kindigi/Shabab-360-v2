import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const membership = await db.eventTeamMembership.findUnique({
    where: { id },
    include: { team: { include: { event: true } } },
  });

  if (!membership || !membership.team?.event) {
    return NextResponse.json({ error: "Event team membership not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, membership.team.event.cityId);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let revokedReason: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.revokedReason === "string") {
      revokedReason = body.revokedReason;
    }
  } catch {
    // Body optional for simple deletion
  }

  const updated = await db.eventTeamMembership.update({
    where: { id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: revokedReason || "Removed from temporary team",
    },
  });

  await logAudit({
    userId: user.id,
    action: "event.team_member.remove",
    entityType: "EventTeamMembership",
    entityId: id,
    oldValues: { isActive: true },
    newValues: { isActive: false, revokedReason },
  });

  return NextResponse.json(updated);
}
