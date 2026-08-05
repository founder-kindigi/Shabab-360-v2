import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const url = new URL(request.url);
  const requestedCityId = url.searchParams.get("cityId") || undefined;
  const campaignId = url.searchParams.get("campaignId") || undefined;

  const resolved = await resolveActorCity(user, requestedCityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json(
      { error: resolved.error || "Access denied: City resolution failed" },
      { status: resolved.status || 403 }
    );
  }

  const cityId = resolved.cityId;

  const assignments = await db.callingAssignment.findMany({
    where: {
      campaign: { cityId, ...(campaignId ? { id: campaignId } : {}) },
      isActive: true,
    },
    include: {
      campaign: { select: { id: true, name: true } },
      application: {
        select: {
          id: true,
          applicantName: true,
          guardianPhone: true,
          guardianName: true,
          status: true,
        },
      },
      staffCaller: {
        select: { user: { select: { name: true, email: true } } },
      },
      externalCaller: {
        select: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const csvHeader = "Campaign Name,Applicant Name,Guardian Phone,Guardian Name,Status,Caller Name,Caller Email\n";
  const csvRows = assignments.map((a) => {
    const callerName = a.staffCaller
      ? a.staffCaller.user.name
      : a.externalCaller
      ? a.externalCaller.user.name || a.externalCaller.user.email
      : "Unassigned";
    const callerEmail = a.staffCaller
      ? a.staffCaller.user.email
      : a.externalCaller
      ? a.externalCaller.user.email
      : "";

    return [
      `"${a.campaign.name}"`,
      `"${a.application.applicantName}"`,
      `"${a.application.guardianPhone}"`,
      `"${a.application.guardianName || ""}"`,
      `"${a.status}"`,
      `"${callerName}"`,
      `"${callerEmail}"`,
    ].join(",");
  });

  const csvContent = csvHeader + csvRows.join("\n");

  await logAudit({
    userId: user.id!,
    action: "calling.export",
    entityType: "CallingExport",
    entityId: cityId,
    newValues: { cityId, campaignId, totalExportedRows: assignments.length },
  });

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calling-export-${cityId}-${Date.now()}.csv"`,
    },
  });
}
