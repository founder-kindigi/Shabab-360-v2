/**
 * GET /api/admin/collaboration-teams
 *
 * Paginated list of collaboration teams.
 * Authorization: dynamic capability (organisation.manage) + city scope.
 *
 * Scope rules:
 *   - HQ (super_admin / program_admin): may supply any cityId or omit it
 *     to list all cities.
 *   - city_head / park staff: the request cityId must match their assigned
 *     city. If they omit cityId the query is automatically narrowed to their
 *     assigned city. A foreign cityId returns 403 before any DB access.
 *
 * Collaboration teams are operational memberships only — they must never
 * alter the canonical staff role or grant city/park/group scope.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  requireCapability,
  requireCityScope,
  isHqRole,
} from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { queryParamsToObject, queryValidationError } from "@/lib/api/query-params";
import { teamListQuerySchema } from "@/lib/collaboration-teams/schemas";

export async function GET(request: NextRequest) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof NextResponse) return auth;

  const parsed = teamListQuerySchema.safeParse(
    queryParamsToObject(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(queryValidationError(parsed.error), { status: 400 });
  }

  const { page, pageSize, cityId: requestedCityId, status } = parsed.data;

  // ── City scope ────────────────────────────────────────────────────────────
  // HQ: no restriction unless they explicitly supply a cityId.
  // Scoped user: derive effective city from their session assignment;
  //   a foreign cityId in the request is rejected before any DB query.
  let effectiveCityId: string | undefined;

  if (isHqRole(auth.user.role)) {
    effectiveCityId = requestedCityId ?? undefined;
  } else {
    // Non-HQ: derive city from session.
    const sessionCityId = auth.user.assignedCityId ?? null;
    if (!sessionCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (requestedCityId && requestedCityId !== sessionCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    effectiveCityId = sessionCityId;
  }

  const isActiveFilter =
    status === "all" ? undefined : status === "active";

  const where = {
    ...(effectiveCityId && { cityId: effectiveCityId }),
    ...(isActiveFilter !== undefined && { isActive: isActiveFilter }),
  };

  const [teams, total] = await Promise.all([
    db.collaborationTeam.findMany({
      where,
      orderBy: [{ city: { name: "asc" } }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        cityId: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        city: { select: { id: true, name: true } },
        _count: { select: { memberships: { where: { isActive: true } } } },
      },
    }),
    db.collaborationTeam.count({ where }),
  ]);

  return NextResponse.json({ data: teams, total, page, pageSize });
}
