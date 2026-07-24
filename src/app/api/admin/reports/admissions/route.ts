import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const admissionsQuerySchema = z.object({
  cityId: optionalIdentifier(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capabilityAuth = await requireCapability("reports.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const query = admissionsQuerySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { cityId } = query.data;

  // Scope filter
  const where: Record<string, unknown> = {};
  if (cityId) {
    where.cityId = cityId;
  } else if (user.role === "city_head" && user.assignedCityId) {
    where.cityId = user.assignedCityId;
  }

  const [totalApplications, statusCounts, cityCounts] = await Promise.all([
    db.admissionApplication.count({ where }),
    db.admissionApplication.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    db.admissionApplication.groupBy({
      by: ["cityId"],
      where,
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    summary: {
      totalApplications,
      statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
      cityBreakdown: cityCounts.map((c) => ({ cityId: c.cityId, count: c._count._all })),
    },
  });
}
