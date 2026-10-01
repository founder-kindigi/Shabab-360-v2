import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveRequestedCityScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const feesQuerySchema = z.object({
  cityId: optionalIdentifier(),
  parkId: optionalIdentifier(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capabilityAuth = await requireCapability("reports.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const query = feesQuerySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { cityId, parkId } = query.data;

  // HQ may select any city (unscoped means all cities); a City Head is pinned
  // to their assigned city and every other role is denied.
  const scope = resolveRequestedCityScope(user, cityId);
  if (scope instanceof NextResponse) return scope;

  // Build fee event where clause. A requested park must belong to the resolved
  // city scope; it can only narrow the result, never widen it.
  const feeEventWhere: Record<string, unknown> = {};
  if (parkId) {
    const park = await db.park.findUnique({
      where: { id: parkId },
      select: { id: true, cityId: true },
    });
    if (!park) return NextResponse.json({ error: "Park not found" }, { status: 404 });
    if (scope.cityId && park.cityId !== scope.cityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    feeEventWhere.batch = { parkId: park.id };
  } else if (scope.cityId) {
    feeEventWhere.batch = { park: { cityId: scope.cityId } };
  }

  const [totalFeeEvents, paymentSummary, methodBreakdown, totalPayments] = await Promise.all([
    db.feeEvent.count({ where: feeEventWhere }),
    db.payment.aggregate({
      where: { feeEvent: { is: feeEventWhere } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.payment.groupBy({
      by: ["method"],
      where: { feeEvent: { is: feeEventWhere } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.payment.count({
      where: { feeEvent: { is: feeEventWhere } },
    }),
  ]);

  return NextResponse.json({
    summary: {
      totalFeeEvents,
      totalPayments,
      totalCollected: paymentSummary._sum.amount ?? 0,
      paymentCount: paymentSummary._count._all,
    },
    methodBreakdown: methodBreakdown.map((m) => ({
      method: m.method,
      total: m._sum.amount ?? 0,
      count: m._count._all,
    })),
  });
}
