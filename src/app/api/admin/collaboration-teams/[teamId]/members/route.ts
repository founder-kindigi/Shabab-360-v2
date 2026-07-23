import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { getStaffMetaDerivedCity, resolveActorCity } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";
import { assignTeamMemberSchema } from "@/lib/validations/teams";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(auth.user);
  if (!resolved.success || resolved.cityId !== team.cityId) {
    return NextResponse.json({ error: "Forbidden city scope mismatch" }, { status: 403 });
  }

  const members = await db.staffTeamMembership.findMany({
    where: { teamId },
    include: {
      staffMeta: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { startedAt: "desc" }],
  });

  return NextResponse.json({ data: members });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (!team.isActive) {
    return NextResponse.json({ error: "Cannot assign members to an inactive team" }, { status: 400 });
  }

  const resolved = await resolveActorCity(auth.user);
  if (!resolved.success || resolved.cityId !== team.cityId) {
    return NextResponse.json({ error: "Forbidden city scope mismatch" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = assignTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  const { staffMetaId, title } = parsed.data;

  const targetCityId = await getStaffMetaDerivedCity(staffMetaId);
  if (!targetCityId || targetCityId !== team.cityId) {
    return NextResponse.json(
      { error: "Target staff city mismatch or inactive staff member" },
      { status: 400 }
    );
  }

  const existing = await db.staffTeamMembership.findFirst({
    where: {
      staffMetaId,
      teamId,
      isActive: true,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Staff member is already an active member of this team" },
      { status: 400 }
    );
  }

  const membership = await db.staffTeamMembership.create({
    data: {
      staffMetaId,
      teamId,
      title: title || null,
      isActive: true,
      startedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      userId: auth.user.id,
      action: "create_team_membership",
      entityType: "StaffTeamMembership",
      entityId: membership.id,
      newValues: JSON.stringify({ staffMetaId, teamId, title: title || null }),
      reason: "Assigned member to collaboration team",
    },
  });

  return NextResponse.json({ data: membership }, { status: 201 });
}
