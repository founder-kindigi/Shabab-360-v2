import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { activeCallingPrincipal, ownsCallingAssignment } from "@/lib/calling/assignment-access";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { logInteractionSchema } from "@/lib/validations/calling";
export async function POST(request: NextRequest) {
 const auth = await requireAuth();
 if (auth instanceof NextResponse) return auth;
 const capability = await requireCapability("calling.view");
 if (capability instanceof NextResponse) return capability;
 const parsed = logInteractionSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: "Invalid interaction input" }, { status: 400 });
 const { assignmentId, outcome, notes, scheduledFor } = parsed.data;
 try {
  return await db.$transaction(async (tx) => {
   const assignment = await tx.callingAssignment.findUnique({ where: { id: assignmentId }, include: { campaign: true, application: { select: { cityId: true } } } });
   if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
   const principal = await activeCallingPrincipal(auth.user, assignment.campaignId, tx);
   if (!principal || !ownsCallingAssignment(principal, assignment)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   const now = new Date();
   if (!assignment.isActive || assignment.application.cityId !== assignment.campaign.cityId || assignment.campaign.status !== "active" || assignment.campaign.startDate > now || assignment.campaign.endDate < now) return NextResponse.json({ error: "Assignment is not active" }, { status: 409 });
   const interaction = await tx.callInteraction.create({ data: { assignmentId, callerUserId: auth.user.id!, outcome, notes: notes ?? null, scheduledFor: scheduledFor ? new Date(scheduledFor) : null } });
   const changed = await tx.callingAssignment.updateMany({ where: { id: assignmentId, isActive: true }, data: { status: outcome === "reached" ? "completed" : "in_progress" } });
   if (changed.count !== 1) throw new Error("Assignment changed during interaction");
   await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "calling.interaction.log", entityType: "CallInteraction", entityId: interaction.id, newValues: { assignmentId, outcome } }) });
   return NextResponse.json(interaction);
  });
 } catch { return NextResponse.json({ error: "Calling interactions are temporarily unavailable" }, { status: 503 }); }
}
