import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
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

  // Build event where clause
  const eventWhere: Record<string, unknown> = {};
  if (from) eventWhere.eventDate = { ...(eventWhere.eventDate as object || {}), gte: parseISO(from) };
  if (to) eventWhere.eventDate = { ...(eventWhere.eventDate as object || {}), lte: parseISO(to) };

  // Scope filtering
  if (groupId) {
    eventWhere.groupId = groupId;
  } else if (parkId) {
    eventWhere.group = { batch: { parkId } };
  } else if (cityId) {
    eventWhere.group = { batch: { park: { cityId } } };
  } else if (user.role === "city_head" && user.assignedCityId) {
    eventWhere.group = { batch: { park: { cityId: user.assignedCityId } } };
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
