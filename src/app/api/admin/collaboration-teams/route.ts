import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const listQuerySchema = z.object({
  cityId: optionalIdentifier(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

/**
 * Collaboration teams are operational memberships only. They must never
 * alter the canonical staff role or grant city, park, or group scope.
 */
export async function GET(request: NextRequest) {
  const roleError = await requireRole(["super_admin"]);
  if (roleError) return roleError;

  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const parsed = listQuerySchema.safeParse(
    queryParamsToObject(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(queryValidationError(parsed.error), { status: 400 });
  }

  const where: { cityId?: string; isActive?: boolean } = {};
  if (parsed.data.cityId) where.cityId = parsed.data.cityId;
  if (parsed.data.status !== "all") where.isActive = parsed.data.status === "active";

  const teams = await db.collaborationTeam.findMany({
    where,
    orderBy: [{ city: { name: "asc" } }, { name: "asc" }],
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
  });

  return NextResponse.json(teams);
}
