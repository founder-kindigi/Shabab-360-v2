/**
 * GET  /api/admin/teams/[id]/members  – paginated member list
 * POST /api/admin/teams/[id]/members  – add member
 *
 * Canonical membership endpoints.
 * Authorization: teams.memberships.manage + city scope.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireCityScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  memberListQuerySchema,
  createMembershipSchema,
  ACTIVE_MEMBERSHIP_FILTER,
} from "@/lib/collaboration-teams/schemas";
import {
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive the city a StaffMeta record belongs to via the most-specific
 * assignment available. Returns null when no city can be resolved.
 */
function resolveStaffCityId(staff: {
  assignedCityId: string | null;
  assignedPark: { cityId: string } | null;
  assignedGroup: {
    park: { cityId: string } | null;
    batch: { cityId: string | null; park: { cityId: string } };
  } | null;
}): string | null {
  return (
    staff.assignedCityId ??
    staff.assignedPark?.cityId ??
    staff.assignedGroup?.park?.cityId ??
    staff.assignedGroup?.batch.cityId ??
    staff.assignedGroup?.batch.park.cityId ??
    null
  );
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const team = await db.collaborationTeam.findUnique({
    where: { id },
    select: { id: true, cityId: true },
  });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  if (!requireCityScope(auth.user, team.cityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = memberListQuerySchema.safeParse(
    queryParamsToObject(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(queryValidationError(parsed.error), { status: 400 });
  }

  const { page, pageSize, status } = parsed.data;

  // Active membership requires both isActive=true and endedAt=null.
  const memberWhere = status === "all" ? {} : status === "active" ? { ...ACTIVE_MEMBERSHIP_FILTER } : { isActive: false };

  const [memberships, total] = await Promise.all([
    db.staffTeamMembership.findMany({
      where: { teamId: id, ...memberWhere },
      orderBy: { startedAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        startedAt: true,
        endedAt: true,
        isActive: true,
        staffMeta: {
          select: {
            id: true,
            role: true,
            user: {
              select: { id: true, name: true, email: true, isActive: true },
            },
          },
        },
      },
    }),
    db.staffTeamMembership.count({
      where: { teamId: id, ...memberWhere },
    }),
  ]);

  return NextResponse.json({ data: memberships, total, page, pageSize });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof NextResponse) return auth;

  const { id: teamId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const parsed = createMembershipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [team, staff] = await Promise.all([
    db.collaborationTeam.findUnique({
      where: { id: teamId },
      select: { id: true, cityId: true },
    }),
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

  if (!requireCityScope(auth.user, team.cityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!staff || !staff.isActive) {
    return NextResponse.json(
      { error: "Active staff member not found" },
      { status: 404 }
    );
  }

  // Staff must belong to the same city as the team — derived server-side.
  if (resolveStaffCityId(staff) !== team.cityId) {
    return NextResponse.json(
      { error: "Staff member must belong to the team city" },
      { status: 400 }
    );
  }

  // Duplicate check: enforce isActive && endedAt === null.
  const existing = await db.staffTeamMembership.findFirst({
    where: { teamId, staffMetaId: staff.id, ...ACTIVE_MEMBERSHIP_FILTER },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Staff member is already active in this team" },
      { status: 409 }
    );
  }

  const membership = await db.staffTeamMembership.create({
    data: { teamId, staffMetaId: staff.id, title: parsed.data.title },
    select: {
      id: true,
      teamId: true,
      staffMetaId: true,
      title: true,
      startedAt: true,
      isActive: true,
    },
  });

  await logAudit({
    userId: auth.user.id!,
    action: "create",
    entityType: "staff_team_membership",
    entityId: membership.id,
    newValues: {
      teamId,
      staffMetaId: staff.id,
      title: membership.title,
    },
  });

  return NextResponse.json(membership, { status: 201 });
}
