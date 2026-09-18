import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveRequestedCityScope } from "@/lib/auth/authorize";
import { groupHierarchyInclude, groupResourceScope, hierarchyGroupWhere } from "@/lib/auth/hierarchy";
import { db } from "@/lib/db";
import { parseISO } from "date-fns";
import {
  optionalDateOnly,
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const attendanceQuerySchema = z
  .object({
    cityId: optionalIdentifier(),
    parkId: optionalIdentifier(),
    groupId: optionalIdentifier(),
    from: optionalDateOnly(),
    to: optionalDateOnly(),
  })
  .refine(
    ({ from, to }) => !from || !to || from <= to,
    { message: "from must be on or before to", path: ["to"] }
  )
  .refine(
    ({ from, to }) => !from || !to || Date.parse(to) - Date.parse(from) <= 366 * 24 * 60 * 60 * 1000,
    { message: "Date range must not exceed 366 days", path: ["to"] }
  );

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capabilityAuth = await requireCapability("reports.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const query = attendanceQuerySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { cityId, parkId, groupId, from, to } = query.data;

  // HQ may select any city (unscoped means all cities); a City Head is pinned
  // to their assigned city and every other role is denied.
  const scope = resolveRequestedCityScope(user, cityId);
  if (scope instanceof NextResponse) return scope;

  // Build event where clause. Requested ids may only narrow the resolved city
  // scope: a park or group outside it is denied rather than filtered silently.
  const eventWhere: Record<string, unknown> = {};
  if (from) eventWhere.eventDate = { ...(eventWhere.eventDate as object || {}), gte: parseISO(from) };
  if (to) eventWhere.eventDate = { ...(eventWhere.eventDate as object || {}), lte: parseISO(to) };

  if (groupId) {
    const group = await db.group.findUnique({ where: { id: groupId }, include: groupHierarchyInclude });
    const groupScope = groupResourceScope(group);
    if (!groupScope) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (scope.cityId && groupScope.cityId !== scope.cityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    eventWhere.groupId = groupId;
  } else if (parkId) {
    const park = await db.park.findUnique({ where: { id: parkId }, select: { id: true, cityId: true } });
    if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });
    if (scope.cityId && park.cityId !== scope.cityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // A group's own park is authoritative; the batch park is only a fallback
    // for a legacy null group park, so a group parked outside the requested
    // park is never included through its batch park.
    eventWhere.group = hierarchyGroupWhere({ kind: "park", cityId: null, parkId: park.id, groupId: null });
  } else if (scope.cityId) {
    // Same authoritative rule at city level: the group's own park city wins,
    // and the batch park city only applies when the group park is unset.
    eventWhere.group = hierarchyGroupWhere({ kind: "city", cityId: scope.cityId, parkId: null, groupId: null });
  }

  const [totalEvents, totalRecords, statusCounts, groupCount] = await Promise.all([
    db.attendanceEvent.count({ where: eventWhere }),
    db.attendanceRecord.count({
      where: { event: eventWhere },
    }),
    db.attendanceRecord.groupBy({
      by: ["status"],
      where: { event: eventWhere },
      _count: { _all: true },
    }),
    db.attendanceEvent.groupBy({
      by: ["groupId"],
      where: eventWhere,
      _count: { _all: true },
    }),
  ]);

  const overallRate =
    totalRecords > 0
      ? Math.round(
          ((statusCounts.find((s) => s.status === "present")?._count._all ?? 0) / totalRecords) * 100
        )
      : 0;

  return NextResponse.json({
    summary: {
      totalEvents,
      totalRecords,
      overallRate,
      presentCount: statusCounts.find((s) => s.status === "present")?._count._all ?? 0,
      absentCount: statusCounts.find((s) => s.status === "absent")?._count._all ?? 0,
      lateCount: statusCounts.find((s) => s.status === "late")?._count._all ?? 0,
      excusedCount: statusCounts.find((s) => s.status === "excused")?._count._all ?? 0,
      uniqueGroups: groupCount.length,
    },
    statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
  });
}
