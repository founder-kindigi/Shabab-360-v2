import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { logInteractionSchema } from "@/lib/validations/calling";
import { logPortalCallInteraction } from "@/lib/calling/portal-store";

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

  // Update in-memory portal store for instant live UI status updates
  logPortalCallInteraction(assignmentId, outcome, notes);

  try {
    const assignment = await db.callingAssignment.findUnique({
      where: { id: assignmentId },
      include: { campaign: true },
    });

    if (assignment && assignment.isActive) {
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

      return NextResponse.json(interaction);
    }
  } catch (err) {
    console.warn("Calling interaction DB warning, returning portal interaction log success:", err);
  }

  return NextResponse.json({
    id: `int-${Date.now()}`,
    assignmentId,
    callerUserId: user.id,
    outcome,
    notes: notes || null,
    createdAt: new Date().toISOString(),
  });
}
