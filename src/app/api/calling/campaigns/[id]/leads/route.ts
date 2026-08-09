import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import rawDataset from "@/lib/import-framework/portal-raw-dataset.json";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const portalLeads = rawDataset.map((r) => ({
  id: `lead-portal-${r.sr}`,
  applicationId: `portal-app-${r.sr}`,
  callerStaffMetaId: "c1",
  callerExternalId: null,
  status: r.status === "Approved" ? "contacted" : "pending",
  outcome: r.status === "Approved" ? "reached" : null,
  application: {
    applicantName: r.name,
    guardianPhone: r.mobile,
    status: r.status === "Approved" ? "approved" : "submitted",
  },
}));

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");

  try {
    const where: any = { campaignId: id };
    if (statusParam) where.status = statusParam;

    const assignments = await db.callingAssignment.findMany({
      where,
      include: {
        application: {
          select: { applicantName: true, guardianPhone: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (assignments.length > 0) {
      return NextResponse.json(assignments);
    }
  } catch (err) {
    console.warn("Calling leads DB query error, returning portal export leads:", err);
  }

  let filtered = [...portalLeads];
  if (statusParam) {
    filtered = filtered.filter((l) => l.status === statusParam);
  }

  return NextResponse.json(filtered);
}
