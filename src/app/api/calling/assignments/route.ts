import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assignLeadsSchema } from "@/lib/validations/calling";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignLeadsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { campaignId, applicationIds, callerStaffMetaId, callerExternalId } = parsed.data;

  const verified = await verifyCallingManagerOrPoc(user, campaignId);
  if (verified.error || !verified.campaign) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  if (callerStaffMetaId) {
    const staff = await db.staffMeta.findUnique({
      where: { id: callerStaffMetaId },
      include: { assignedCity: true, assignedPark: { include: { city: true } } },
    });
    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: "Target staff caller not found or inactive" }, { status: 400 });
    }
    const staffCityId = staff.assignedCityId || staff.assignedPark?.cityId;
    if (staffCityId !== verified.campaign.cityId) {
      return NextResponse.json(
        { error: "Target staff caller city does not match campaign city" },
        { status: 400 }
      );
    }
  }

  if (callerExternalId) {
    const now = new Date();
    const ext = await db.externalSupportCaller.findUnique({
      where: { id: callerExternalId },
    });
    if (
      !ext ||
      !ext.isActive ||
      ext.revokedAt ||
      ext.expiresAt <= now ||
      ext.campaignId !== campaignId
    ) {
      return NextResponse.json(
        { error: "Target external support caller is inactive, expired, or bound to a different campaign" },
        { status: 400 }
      );
    }
  }

  const applications = await db.admissionApplication.findMany({
    where: { id: { in: applicationIds } },
  });

  if (applications.length !== applicationIds.length) {
    return NextResponse.json({ error: "One or more admission applications not found" }, { status: 400 });
  }

  const invalidCityApp = applications.find((app) => app.cityId !== verified.campaign!.cityId);
  if (invalidCityApp) {
    return NextResponse.json(
      { error: "One or more leads belong to a different city than the campaign" },
      { status: 400 }
    );
  }

  const newAssignments = await db.$transaction(async (tx) => {
    const created: any[] = [];
    const now = new Date();
    for (const appId of applicationIds) {
      await tx.callingAssignment.updateMany({
        where: { campaignId, applicationId: appId, isActive: true },
        data: { isActive: false, status: "reassigned", endedAt: now },
      });

      const newAssignment = await tx.callingAssignment.create({
        data: {
          campaignId,
          applicationId: appId,
          callerStaffMetaId: callerStaffMetaId || null,
          callerExternalId: callerExternalId || null,
          status: "pending",
          isActive: true,
          startedAt: now,
        },
      });
      created.push(newAssignment);
    }
    return created;
  });

  await logAudit({
    userId: user.id!,
    action: "calling.lead.assign",
    entityType: "CallingAssignment",
    entityId: campaignId,
    newValues: { campaignId, count: newAssignments.length, callerStaffMetaId, callerExternalId },
  });

  return NextResponse.json(newAssignments, { status: 201 });
}
