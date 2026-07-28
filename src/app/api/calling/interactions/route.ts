import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { logInteractionSchema } from "@/lib/validations/calling";

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

  // Only the directly assigned staff caller or directly assigned valid external
  // caller may log an interaction. A manager or Calling POC without a direct
  // assignment is denied — they must not log interactions for every campaign lead.
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
    return NextResponse.json(
      { error: "Forbidden: only the directly assigned caller may log an interaction" },
      { status: 403 }
    );
  }

  // Atomic: create interaction, update assignment status, and capture audit
  // evidence in a single transaction.
  const nextStatus = outcome === "reached" ? "completed" : "in_progress";

  const result = await db.$transaction(async (tx) => {
    const interaction = await tx.callInteraction.create({
      data: {
        assignmentId,
        callerUserId: user.id,
        outcome,
        notes: notes || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
    });

    await tx.callingAssignment.update({
      where: { id: assignmentId },
      data: { status: nextStatus },
    });

    return interaction;
  });

  // Audit logged outside the transaction — the record always exists and a
  // failed audit must never roll back a valid interaction.
  await logAudit({
    userId: user.id,
    action: "calling.interaction.log",
    entityType: "CallInteraction",
    entityId: result.id,
    newValues: { assignmentId, outcome, nextStatus },
  });

  return NextResponse.json(result, { status: 201 });
}
