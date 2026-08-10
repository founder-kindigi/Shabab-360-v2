import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { getPortalCallingLeads } from "@/lib/calling/portal-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const callerParam = url.searchParams.get("callerId");

  try {
    const where: any = { campaignId: id };
    if (statusParam && statusParam !== "all") where.status = statusParam;
    if (callerParam && callerParam !== "all") where.callerStaffMetaId = callerParam;

    const assignments = await db.callingAssignment.findMany({
      where,
      include: {
        application: {
          select: { applicantName: true, guardianPhone: true, status: true },
        },
        staffCaller: { select: { id: true, user: { select: { name: true } } } },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { outcome: true, notes: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (assignments.length > 0) {
      const formatted = assignments.map((a) => ({
        id: a.id,
        applicationId: a.applicationId,
        callerStaffMetaId: a.callerStaffMetaId,
        callerName: a.staffCaller?.user?.name || "Assigned Murabbi",
        callerExternalId: a.callerExternalId,
        status: a.status,
        outcome: a.interactions[0]?.outcome || null,
        notes: a.interactions[0]?.notes || "Call logged",
        calledAt: a.interactions[0]?.createdAt ? new Date(a.interactions[0].createdAt).toISOString() : new Date().toISOString(),
        application: a.application,
      }));
      return NextResponse.json(formatted);
    }
  } catch (err) {
    console.warn("Calling leads DB query error, returning live portal store leads:", err);
  }

  let leads = getPortalCallingLeads();

  if (statusParam && statusParam !== "all") {
    if (statusParam === "unassigned") {
      leads = leads.filter((l) => !l.callerStaffMetaId);
    } else if (statusParam === "assigned") {
      leads = leads.filter((l) => l.callerStaffMetaId && l.status === "pending");
    } else {
      leads = leads.filter((l) => l.status === statusParam);
    }
  }

  if (callerParam && callerParam !== "all") {
    if (callerParam === "unassigned") {
      leads = leads.filter((l) => !l.callerStaffMetaId);
    } else {
      leads = leads.filter((l) => l.callerStaffMetaId === callerParam);
    }
  }

  return NextResponse.json(leads);
}
