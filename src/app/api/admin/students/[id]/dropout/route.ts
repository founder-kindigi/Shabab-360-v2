import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { participantDropoutActionSchema } from "@/lib/attendance/schemas";
import { db } from "@/lib/db";

async function scopedParticipant(id: string, user: Parameters<typeof requireResourceScope>[0]) {
  const participant = await db.participant.findUnique({
    where: { id },
    include: { group: { include: { batch: { include: { park: true } } } } },
  });
  if (!participant) return { error: NextResponse.json({ error: "Participant not found" }, { status: 404 }) };
  const scopeError = requireResourceScope(user, {
    cityId: participant.group.batch.cityId ?? participant.group.batch.park.cityId,
    parkId: participant.group.batch.parkId,
    groupId: participant.groupId,
  });
  return scopeError ? { error: scopeError } : { participant };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("students.profile.view");
  if (capability instanceof NextResponse) return capability;
  const result = await scopedParticipant((await params).id, auth.user);
  if ("error" in result) return result.error;
  return NextResponse.json({
    participantId: result.participant.id,
    state: result.participant.state,
    dropoutAt: result.participant.dropoutAt?.toISOString() ?? null,
    dropoutReason: result.participant.dropoutReason,
    dropoutSource: result.participant.dropoutSource,
    reactivatedAt: result.participant.reactivatedAt?.toISOString() ?? null,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("students.manage");
  if (capability instanceof NextResponse) return capability;
  const result = await scopedParticipant((await params).id, auth.user);
  if ("error" in result) return result.error;
  const parsed = participantDropoutActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { participant } = result;
  const { action, reason, effectiveDate } = parsed.data;
  if (action === "dropout" && participant.state === "dropout") {
    return NextResponse.json({ error: "Participant is already marked as dropout" }, { status: 409 });
  }
  if (action === "reactivate" && participant.state !== "dropout") {
    return NextResponse.json({ error: "Only a dropout participant can be reactivated" }, { status: 409 });
  }

  const dropoutAt = action === "dropout"
    ? new Date(`${effectiveDate ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
    : null;
  const updated = await db.$transaction(async (tx) => {
    const next = await tx.participant.update({
      where: { id: participant.id },
      data: action === "dropout"
        ? { state: "dropout", dropoutAt, dropoutReason: reason, dropoutSource: "manual", reactivatedAt: null }
        : { state: "active", dropoutAt: null, dropoutReason: null, dropoutSource: null, reactivatedAt: new Date() },
    });
    await tx.auditLog.create({ data: createAuditLogData({
      userId: auth.user.id,
      action: action === "dropout" ? "student.dropout" : "student.reactivate",
      entityType: "participant",
      entityId: participant.id,
      oldValues: { state: participant.state, dropoutAt: participant.dropoutAt, dropoutSource: participant.dropoutSource },
      newValues: { state: next.state, dropoutAt: next.dropoutAt, dropoutSource: next.dropoutSource },
      reason,
    }) });
    return next;
  });

  return NextResponse.json({
    participantId: updated.id,
    state: updated.state,
    dropoutAt: updated.dropoutAt?.toISOString() ?? null,
    dropoutSource: updated.dropoutSource,
    reactivatedAt: updated.reactivatedAt?.toISOString() ?? null,
  });
}
