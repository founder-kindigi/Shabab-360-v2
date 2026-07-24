import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
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

  // Build fee event where clause
  const feeEventWhere: Record<string, unknown> = {};
  if (parkId) {
    feeEventWhere.batch = { parkId };
  } else if (cityId) {
    feeEventWhere.batch = { park: { cityId } };
  } else if (user.role === "city_head" && user.assignedCityId) {
    feeEventWhere.batch = { park: { cityId: user.assignedCityId } };
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
