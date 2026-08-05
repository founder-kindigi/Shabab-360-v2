import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json(
      { error: "Query parameter campaignId is required" },
      { status: 400 }
    );
  }

  const verified = await verifyCallingManagerOrPoc(user as { id: string; role?: string | null }, campaignId);
  if (verified.error || !verified.campaign) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const assignments = await db.callingAssignment.findMany({
    where: { campaignId, isActive: true },
    include: {
      staffCaller: {
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
      },
      externalCaller: {
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
      },
      interactions: {
        select: { outcome: true },
      },
    },
  });

  const callerMap = new Map<
    string,
    {
      callerId: string;
      callerName: string;
      callerType: "staff" | "external";
      totalAssigned: number;
      pending: number;
      contacted: number;
      interested: number;
      callbackRequested: number;
    }
  >();

  for (const a of assignments) {
    const key = a.callerStaffMetaId || a.callerExternalId || "unassigned";
    const name = a.staffCaller
      ? a.staffCaller.user.name || a.staffCaller.user.email
      : a.externalCaller
      ? a.externalCaller.user.name || a.externalCaller.user.email
      : "Unassigned";
    const type = a.staffCaller ? "staff" : "external";

    const existing = callerMap.get(key) || {
      callerId: key,
      callerName: name,
      callerType: type,
      totalAssigned: 0,
      pending: 0,
      contacted: 0,
      interested: 0,
      callbackRequested: 0,
    };

    existing.totalAssigned++;
    if (a.status === "pending") existing.pending++;
    else if (a.status === "contacted") existing.contacted++;
    else if (a.status === "interested") existing.interested++;
    else if (a.status === "callback_requested") existing.callbackRequested++;

    callerMap.set(key, existing);
  }

  return NextResponse.json({
    campaign: {
      id: verified.campaign.id,
      name: verified.campaign.name,
      cityId: verified.campaign.cityId,
    },
    workloads: Array.from(callerMap.values()),
  });
}
