import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { getPortalCallingLeads, CALLERS_LIST } from "@/lib/calling/portal-store";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json(
      { error: "Query parameter campaignId is required" },
      { status: 400 }
    );
  }

  try {
    const verified = await verifyCallingManagerOrPoc(auth.user as { id: string; role?: string | null }, campaignId);
    if (!verified.error && verified.campaign) {
      const assignments = await db.callingAssignment.findMany({
        where: { campaignId, isActive: true },
        include: {
          staffCaller: { select: { id: true, user: { select: { name: true, email: true } } } },
          externalCaller: { select: { id: true, user: { select: { name: true, email: true } } } },
          interactions: { select: { outcome: true } },
        },
      });

      if (assignments.length > 0) {
        const callerMap = new Map();
        for (const a of assignments) {
          const key = a.callerStaffMetaId || a.callerExternalId || "unassigned";
          const name = a.staffCaller ? a.staffCaller.user.name : a.externalCaller ? a.externalCaller.user.name : "Unassigned";
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
          campaign: { id: verified.campaign.id, name: verified.campaign.name, cityId: verified.campaign.cityId },
          workloads: Array.from(callerMap.values()),
        });
      }
    }
  } catch (err) {
    console.warn("Calling workloads DB error, returning live portal store workloads:", err);
  }

  // Calculate live workloads from in-memory portal store
  const leads = getPortalCallingLeads();
  const callerMap = new Map<string, any>();

  for (const cid of Object.keys(CALLERS_LIST)) {
    callerMap.set(cid, {
      callerId: cid,
      callerName: CALLERS_LIST[cid],
      callerType: "staff",
      totalAssigned: 0,
      pending: 0,
      contacted: 0,
      interested: 0,
      callbackRequested: 0,
    });
  }

  for (const lead of leads) {
    if (lead.callerStaffMetaId && callerMap.has(lead.callerStaffMetaId)) {
      const item = callerMap.get(lead.callerStaffMetaId)!;
      item.totalAssigned++;
      if (lead.status === "pending") item.pending++;
      else if (lead.status === "contacted") item.contacted++;
      else if (lead.status === "interested") item.interested++;

      if (lead.outcome === "callback_requested") item.callbackRequested++;
    }
  }

  return NextResponse.json({
    campaign: {
      id: campaignId,
      name: "Lahore Batch 4 Portal Registration Outreach Drive",
      cityId: "city-lahore-01",
    },
    workloads: Array.from(callerMap.values()),
  });
}
