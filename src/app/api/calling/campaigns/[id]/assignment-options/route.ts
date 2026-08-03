import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Returns the minimum data needed to assign calling leads. Applicant PII stays
 * hidden until an assigned caller opens their own lead list.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  if (!auth.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await params;
  const verified = await verifyCallingManagerOrPoc({ ...auth.user, id: auth.user.id }, campaignId);
  if (verified.error || !verified.campaign) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const cityId = verified.campaign.cityId;
  const callerCityFilter = {
    OR: [
      { assignedCityId: cityId },
      { assignedPark: { cityId } },
      { assignedGroup: { batch: { cityId } } },
      { assignedGroup: { park: { cityId } } },
    ],
  };

  const [callers, applications] = await Promise.all([
    db.staffMeta.findMany({
      where: { isActive: true, ...callerCityFilter },
      select: {
        id: true,
        role: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
      take: 100,
    }),
    db.admissionApplication.findMany({
      where: {
        cityId,
        callingAssignments: { none: { campaignId, isActive: true } },
      },
      select: { id: true, trackingCode: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    callers: callers.map((caller) => ({
      id: caller.id,
      label: caller.user.name || "Unnamed staff member",
      role: caller.role,
    })),
    applications,
  });
}
