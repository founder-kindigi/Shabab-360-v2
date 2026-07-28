import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { addTeamMemberSchema } from "@/lib/validations/event-team-planner";

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("events.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { teamId } = await params;
  const team = await db.temporaryEventTeam.findUnique({
    where: { id: teamId },
    include: { event: true },
  });

  if (!team || !team.event) {
    return NextResponse.json({ error: "Temporary event team not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, team.event.cityId);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const staffMeta = await db.staffMeta.findUnique({
    where: { id: parsed.data.staffMetaId },
    include: { assignedCity: true, assignedPark: { include: { city: true } } },
  });

  if (!staffMeta) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  if (!staffMeta.isActive) {
    return NextResponse.json({ error: "Staff member is inactive" }, { status: 403 });
  }

  const staffCityId = staffMeta.assignedCityId || staffMeta.assignedPark?.cityId;
  if (staffCityId !== team.event.cityId) {
    return NextResponse.json(
      { error: "Assignee staff member belongs to a different city than the event" },
      { status: 403 }
    );
  }

  const existingMembership = await db.eventTeamMembership.findFirst({
    where: { teamId, staffMetaId: parsed.data.staffMetaId, isActive: true },
  });

  if (existingMembership) {
    return NextResponse.json(
      { error: "Active membership already exists for this staff member" },
      { status: 409 }
    );
  }

  const membership = await db.eventTeamMembership.create({
    data: {
      teamId,
      staffMetaId: parsed.data.staffMetaId,
      title: parsed.data.title || null,
      assignedUntil: parsed.data.assignedUntil ? new Date(parsed.data.assignedUntil) : null,
      isActive: true,
    },
  });

  await logAudit({
    userId: user.id,
    action: "event.team_member.add",
    entityType: "EventTeamMembership",
    entityId: membership.id,
    newValues: { teamId, staffMetaId: parsed.data.staffMetaId },
  });

  return NextResponse.json(membership, { status: 201 });
}
