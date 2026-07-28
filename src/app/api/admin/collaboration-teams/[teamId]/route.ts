/**
 * GET /api/admin/collaboration-teams/[teamId]
 *
 * Returns team detail with active-member count.
 * Authorization: teams.memberships.manage + city scope.
 * No static role gate.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireCityScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { ACTIVE_MEMBERSHIP_FILTER } from "@/lib/collaboration-teams/schemas";

type Params = { params: Promise<{ teamId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof NextResponse) return auth;

  const { teamId } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      cityId: true,
      name: true,
      code: true,
      description: true,
      isActive: true,
      createdAt: true,
      city: { select: { id: true, name: true } },
      _count: {
        select: {
          memberships: { where: { ...ACTIVE_MEMBERSHIP_FILTER } },
        },
      },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (!requireCityScope(auth.user, team.cityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(team);
}
