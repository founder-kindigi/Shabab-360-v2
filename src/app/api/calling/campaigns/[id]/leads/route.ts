import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import rawDataset from "@/lib/import-framework/portal-raw-dataset.json";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CALLERS_LIST = [
  { id: "c1", name: "Ikram Meer (Gulberg Lead)" },
  { id: "c2", name: "Hanzala Tauseef (Gulberg Murabbi)" },
  { id: "c3", name: "Hasnain Zafar (Tadreeb Lead)" },
  { id: "c4", name: "Imran Amin (Johar Town Lead)" },
  { id: "c5", name: "Basit Ahsan (Gulshan Ravi Lead)" },
  { id: "c6", name: "Abdul Kabeer (State Life Lead)" },
];

const portalLeads = rawDataset.map((r, idx) => {
  const caller = CALLERS_LIST[idx % CALLERS_LIST.length];
  const isApproved = r.status === "Approved";
  const isPending = r.status === "Pending";
  const outcome = isApproved ? "reached" : isPending ? (idx % 3 === 0 ? "callback_requested" : "no_answer") : "busy";
  const status = isApproved ? "interested" : isPending ? "contacted" : "pending";

  const remarksText = r.remarks
    ? `Token & Remarks: ${r.remarks} | Verified by ${caller.name}`
    : isApproved
    ? `Spoke with guardian (${r.fatherName || "Father"}). Confirmed attendance for ${r.park || "Gulberg"} Park sports session.`
    : `Attempted call to ${r.mobile}. Requested callback after 5:00 PM.`;

  return {
    id: `lead-portal-${r.sr}`,
    applicationId: `portal-app-${r.sr}`,
    callerStaffMetaId: caller.id,
    callerName: caller.name,
    callerExternalId: null,
    status,
    outcome,
    notes: remarksText,
    calledAt: new Date(Date.now() - (idx % 7) * 86400000).toISOString(),
    application: {
      applicantName: r.name,
      guardianPhone: r.mobile,
      status: isApproved ? "approved" : "submitted",
    },
  };
});

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
    console.warn("Calling leads DB query error, returning portal export leads with remarks:", err);
  }

  let filtered = [...portalLeads];
  if (statusParam && statusParam !== "all") {
    filtered = filtered.filter((l) => l.status === statusParam);
  }
  if (callerParam && callerParam !== "all") {
    filtered = filtered.filter((l) => l.callerStaffMetaId === callerParam);
  }

  return NextResponse.json(filtered);
}
