import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { logInteractionSchema } from "@/lib/validations/calling";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = logInteractionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { assignmentId, outcome, notes, scheduledFor } = parsed.data;

  const assignment = await db.callingAssignment.findUnique({
    where: { id: assignmentId },
    include: { campaign: true },
  });

  if (!assignment || !assignment.isActive) {
    return NextResponse.json(
      { error: "Calling assignment not found or inactive" },
      { status: 404 }
    );
  }

  // Check caller authorization
  let isAuthorizedCaller = false;

  if (assignment.callerExternalId) {
    const extCaller = await db.externalSupportCaller.findFirst({
      where: {
        id: assignment.callerExternalId,
        userId: user.id,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (extCaller) isAuthorizedCaller = true;
  }

  if (!isAuthorizedCaller && assignment.callerStaffMetaId) {
    const staffMeta = await db.staffMeta.findFirst({
      where: { id: assignment.callerStaffMetaId, userId: user.id, isActive: true },
    });
    if (staffMeta) isAuthorizedCaller = true;
  }

  if (!isAuthorizedCaller) {
    const pocCheck = await verifyCallingManagerOrPoc(user as { id: string; role?: string | null }, assignment.campaignId);
    if (!pocCheck.error && pocCheck.campaign) {
      isAuthorizedCaller = true;
    }
  }

  if (!isAuthorizedCaller) {
    return NextResponse.json(
      { error: "Forbidden: caller is not assigned to this lead" },
      { status: 403 }
    );
  }

  const interaction = await db.callInteraction.create({
    data: {
      assignmentId,
      callerUserId: user.id!,
      outcome,
      notes: notes || null,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    },
  });

  const nextStatus = outcome === "reached" ? "completed" : "in_progress";
  await db.callingAssignment.update({
    where: { id: assignmentId },
    data: { status: nextStatus },
  });

  await logAudit({
    userId: user.id,
    action: "calling.interaction.log",
    entityType: "CallInteraction",
    entityId: interaction.id,
    newValues: { assignmentId, outcome, nextStatus },
  });

  return NextResponse.json(interaction, { status: 201 });
}
