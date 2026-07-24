import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assignTeamMemberSchema } from "@/lib/validations/team";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("organisation.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  const { id } = await params;
  const team = await db.collaborationTeam.findUnique({
    where: { id },
    select: { id: true, cityId: true },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, team.cityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json(
      { error: resolved.error || "City resolution failed" },
      { status: resolved.status || 400 }
    );
  }

  const memberships = await db.staffTeamMembership.findMany({
    where: { teamId: id, isActive: true },
    orderBy: { createdAt: "asc" },
    include: {
      staffMeta: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        },
      },
    },
  });

  return NextResponse.json(memberships);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("organisation.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  const { id } = await params;
  const team = await db.collaborationTeam.findUnique({
    where: { id },
    select: { id: true, cityId: true },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, team.cityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json(
      { error: resolved.error || "City resolution failed" },
      { status: resolved.status || 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const staff = await db.staffMeta.findUnique({
    where: { id: parsed.data.staffMetaId },
    include: {
      assignedCity: true,
      assignedPark: { include: { city: true } },
      assignedGroup: { include: { batch: { include: { city: true } }, park: { include: { city: true } } } },
    },
  });

  if (!staff || !staff.isActive) {
    return NextResponse.json({ error: "Active staff member not found" }, { status: 404 });
  }

  const staffCityId = staff.assignedCityId
    || staff.assignedPark?.cityId
    || staff.assignedGroup?.batch?.cityId
    || staff.assignedGroup?.park?.cityId;

  if (staffCityId !== team.cityId) {
    return NextResponse.json(
      { error: "Target staff member city mismatch: staff does not belong to the team city" },
      { status: 400 }
    );
  }

  const existing = await db.staffTeamMembership.findFirst({
    where: { teamId: id, staffMetaId: staff.id, isActive: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Staff member is already an active member of this team" },
      { status: 409 }
    );
  }

  const membership = await db.staffTeamMembership.create({
    data: {
      teamId: id,
      staffMetaId: staff.id,
      title: parsed.data.title || null,
      isActive: true,
      startedAt: new Date(),
    },
    include: {
      staffMeta: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  await logAudit({
    userId: user.id!,
    action: "team_membership.assign",
    entityType: "StaffTeamMembership",
    entityId: membership.id,
    newValues: { teamId: id, staffMetaId: staff.id, title: membership.title },
  });

  return NextResponse.json(membership, { status: 201 });
}
