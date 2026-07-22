import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createMembershipSchema = z.object({
  staffMetaId: z.string().min(1, "Staff member is required"),
  title: z.string().trim().min(2).max(120).optional(),
});

function staffCityId(staff: {
  assignedCityId: string | null;
  assignedPark: { cityId: string } | null;
  assignedGroup: { park: { cityId: string } | null; batch: { cityId: string | null; park: { cityId: string } } } | null;
}) {
  return staff.assignedCityId
    ?? staff.assignedPark?.cityId
    ?? staff.assignedGroup?.park?.cityId
    ?? staff.assignedGroup?.batch.cityId
    ?? staff.assignedGroup?.batch.park.cityId
    ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const roleError = await requireRole(["super_admin"]);
  if (roleError) return roleError;

  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { teamId } = await params;
  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: { id: true, cityId: true },
  });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const memberships = await db.staffTeamMembership.findMany({
    where: { teamId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      startedAt: true,
      staffMeta: {
        select: {
          id: true,
          role: true,
          user: { select: { id: true, name: true, email: true, isActive: true } },
        },
      },
    },
  });

  return NextResponse.json(memberships);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const roleError = await requireRole(["super_admin"]);
  if (roleError) return roleError;

  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = createMembershipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { teamId } = await params;
  const [team, staff] = await Promise.all([
    db.collaborationTeam.findUnique({ where: { id: teamId }, select: { id: true, cityId: true } }),
    db.staffMeta.findUnique({
      where: { id: parsed.data.staffMetaId },
      select: {
        id: true,
        isActive: true,
        assignedCityId: true,
        assignedPark: { select: { cityId: true } },
        assignedGroup: {
          select: {
            park: { select: { cityId: true } },
            batch: { select: { cityId: true, park: { select: { cityId: true } } } },
          },
        },
      },
    }),
  ]);

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (!staff || !staff.isActive) {
    return NextResponse.json({ error: "Active staff member not found" }, { status: 404 });
  }
  if (staffCityId(staff) !== team.cityId) {
    return NextResponse.json({ error: "Staff member must belong to the team city" }, { status: 400 });
  }

  const existing = await db.staffTeamMembership.findFirst({
    where: { teamId, staffMetaId: staff.id, isActive: true },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "Staff member is already active in this team" }, { status: 409 });

  const membership = await db.staffTeamMembership.create({
    data: { teamId, staffMetaId: staff.id, title: parsed.data.title },
    select: { id: true, teamId: true, staffMetaId: true, title: true, startedAt: true },
  });

  await logAudit({
    userId: capabilityAuth.user.id!,
    action: "create",
    entityType: "staff_team_membership",
    entityId: membership.id,
    newValues: { teamId, staffMetaId: staff.id, title: membership.title },
  });

  return NextResponse.json(membership, { status: 201 });
}
