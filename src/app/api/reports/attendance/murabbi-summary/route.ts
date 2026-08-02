import { NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { getMurabbiSummary } from "@/lib/attendance/summaries";
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
  staffId: optionalIdentifier(),
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

  const { staffId, parkId, cityId, from, to, limit, offset } = parseResult.data;

  // Hierarchy scope check
  const scopeError = requireResourceScope(user, {
    cityId: cityId ?? null,
    parkId: parkId ?? null,
  });
  if (scopeError) return scopeError;

  try {
    const summary = await getMurabbiSummary({
      staffId,
      parkId,
      cityId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit,
      offset,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Murabbi summary API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
