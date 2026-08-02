import { NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { getStudentSummary } from "@/lib/attendance/summaries";
import {
  MAX_LIST_OFFSET,
  optionalDateOnly,
  optionalIdentifier,
  optionalInteger,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const querySchema = z.object({
  participantId: optionalIdentifier(),
  groupId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  cityId: optionalIdentifier(),
  from: optionalDateOnly(),
  to: optionalDateOnly(),
  limit: optionalInteger(1, 100).default(50),
  offset: optionalInteger(0, MAX_LIST_OFFSET).default(0),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("reports.view");
  if (capAuth instanceof NextResponse) return capAuth;

  const { searchParams } = new URL(request.url);
  const parseResult = querySchema.safeParse(queryParamsToObject(searchParams));
  if (!parseResult.success) {
    return NextResponse.json(queryValidationError(parseResult.error), { status: 400 });
  }

  const { participantId, groupId, parkId, cityId, from, to, limit, offset } = parseResult.data;

  const isHq = user.role === "super_admin" || user.role === "program_admin";
  if (isHq && !cityId) {
    return NextResponse.json({ error: "cityId is required for HQ reports" }, { status: 400 });
  }
  const effectiveScope = {
    cityId: cityId ?? user.assignedCityId ?? null,
    parkId: parkId ?? user.assignedParkId ?? null,
    groupId: groupId ?? user.assignedGroupId ?? null,
  };

  // Hierarchy scope check
  const scopeError = requireResourceScope(user, effectiveScope);
  if (scopeError) return scopeError;

  try {
    const summary = await getStudentSummary({
      participantId,
      groupId: effectiveScope.groupId ?? undefined,
      parkId: effectiveScope.parkId ?? undefined,
      cityId: effectiveScope.cityId ?? undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit,
      offset,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Student summary API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
