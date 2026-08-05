import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const dropoutActionSchema = z.object({
  action: z.enum(["dropout", "reactivate"]),
  reason: z.string().trim().max(500).optional(),
  effectiveDate: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("organisation.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: participantId } = await params;

  const participant = await db.participant.findUnique({
    where: { id: participantId },
    include: {
      group: {
        include: { batch: { include: { park: true } } },
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant student not found" }, { status: 404 });
  }

  const cityId = participant.group.batch.park.cityId;
  const resolved = await resolveActorCity(user, cityId);
  if (resolved.error || resolved.cityId !== cityId) {
    return NextResponse.json(
      { error: "Access denied: student is outside assigned scope" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = dropoutActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { action, reason } = parsed.data;

  const newState = action === "dropout" ? "dropout" : "active";

  const updated = await db.participant.update({
    where: { id: participantId },
    data: {
      state: newState,
    },
  });

  logAudit({
    userId: user.id,
    action: action === "dropout" ? "student.dropout" : "student.reactivate",
    entityType: "participant",
    entityId: participantId,
    newValues: {
      action,
      previousState: participant.state,
      newState: updated.state,
      reason: reason || null,
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    state: updated.state,
    actionTaken: action,
  });
}
