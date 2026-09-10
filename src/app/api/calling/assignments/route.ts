import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { assignLeadsSchema } from "@/lib/validations/calling";
export async function POST(request: NextRequest) {
 const auth = await requireAuth();
 if (auth instanceof NextResponse) return auth;
 const parsed = assignLeadsSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: "Invalid assignment input" }, { status: 400 });
 const { campaignId, applicationIds, callerStaffMetaId, callerExternalId } = parsed.data;
 try {
  return await db.$transaction(async (tx) => {
   const verified = await verifyCallingManagerOrPoc(auth.user as { id: string; role?: string }, campaignId, tx);
   if (verified.error || !verified.campaign) return NextResponse.json({ error: verified.error || "Forbidden" }, { status: verified.status || 403 });
   const now = new Date();
   if (verified.campaign.status !== "active" || verified.campaign.startDate > now || verified.campaign.endDate < now) return NextResponse.json({ error: "Campaign is not active" }, { status: 409 });
   if (callerStaffMetaId) {
    const caller = await tx.staffMeta.findUnique({ where: { id: callerStaffMetaId }, include: { user: { select: { isActive: true } } } });
    if (!caller?.isActive || !caller.user.isActive) return NextResponse.json({ error: "Caller is unavailable" }, { status: 403 });
    const city = await resolveActorCity({ id: caller.userId, role: caller.role }, verified.campaign.cityId, tx);
    if (city.error) return NextResponse.json({ error: "Caller is outside campaign city" }, { status: 403 });
   } else {
    const caller = await tx.externalSupportCaller.findFirst({ where: { id: callerExternalId!, campaignId, isActive: true, revokedAt: null, expiresAt: { gt: now }, user: { isActive: true } } });
    if (!caller) return NextResponse.json({ error: "Caller is unavailable" }, { status: 403 });
   }
   const applications = await tx.admissionApplication.findMany({ where: { id: { in: applicationIds }, cityId: verified.campaign.cityId }, select: { id: true } });
   if (applications.length !== applicationIds.length) return NextResponse.json({ error: "Applications are missing or outside campaign city" }, { status: 403 });
   // Serialize replacement assignments within a campaign, including callers whose
   // transaction began before a competing replacement committed.
   const locked = await tx.callingCampaign.updateMany({ where: { id: campaignId, status: "active", startDate: { lte: now }, endDate: { gte: now } }, data: { updatedAt: now } });
   if (locked.count !== 1) return NextResponse.json({ error: "Campaign is not active" }, { status: 409 });
   const assignments: Awaited<ReturnType<typeof tx.callingAssignment.create>>[] = [];
   for (const applicationId of applicationIds) {
    await tx.callingAssignment.updateMany({ where: { campaignId, applicationId, isActive: true }, data: { isActive: false, status: "reassigned", endedAt: now } });
    assignments.push(await tx.callingAssignment.create({ data: { campaignId, applicationId, callerStaffMetaId: callerStaffMetaId ?? null, callerExternalId: callerExternalId ?? null, status: "pending", isActive: true } }));
   }
   await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "calling.assignment.create", entityType: "CallingAssignment", entityId: campaignId, newValues: { count: assignments.length } }) });
   return NextResponse.json({ success: true, count: assignments.length, assignments });
  });
 } catch { return NextResponse.json({ error: "Calling assignments are temporarily unavailable" }, { status: 503 }); }
}
