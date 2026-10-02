import { NextResponse } from "next/server";
import { createAuditLogData } from "@/lib/audit";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { attendanceDateStart } from "@/lib/attendance/schedule";
import { participantDropoutActionSchema } from "@/lib/attendance/schemas";
import { formatPKT } from "@/lib/timezone";
import { db } from "@/lib/db";

async function scopedParticipant(id: string, user: Parameters<typeof requireResourceScope>[0]) {
  const participant = await db.participant.findUnique({
    where: { id },
    include: { group: { include: { batch: { include: { park: true } } } } },
  });
  if (!participant) return { error: NextResponse.json({ error: "Participant not found" }, { status: 404 }) };
  if (!participant.group) {
    return {
      error: NextResponse.json(
        { error: "Participant must be assigned to a group before this action" },
        { status: 409 }
      ),
    };
  }
  const scopeError = requireResourceScope(user, {
    cityId: participant.group.batch.cityId ?? participant.group.batch.park.cityId,
    parkId: participant.group.batch.parkId,
    groupId: participant.groupId,
  });
  if (scopeError) return { error: scopeError };
  return { participant };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("students.profile.view");
  if (capability instanceof NextResponse) return capability;
  const result = await scopedParticipant((await params).id, auth.user);
  if ("error" in result) return result.error!;
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
  if ("error" in result) return result.error!;
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

  // Reactivation needs an authorized rejoin date: present, on or after the
  // recorded interruption start, and not in the future. Business days are
  // compared in PKT; the prior dropoutAt stays as the interruption start.
  let reactivatedAt: Date | null = null;
  if (action === "reactivate") {
    if (!effectiveDate) {
      return NextResponse.json({ error: { effectiveDate: ["A rejoin date is required to reactivate"] } }, { status: 400 });
    }
    if (!participant.dropoutAt) {
      return NextResponse.json({ error: "Participant has no recorded dropout date to reactivate from" }, { status: 409 });
    }
    const dropoutDay = formatPKT(participant.dropoutAt, "yyyy-MM-dd");
    const today = formatPKT(new Date(), "yyyy-MM-dd");
    if (effectiveDate < dropoutDay) {
      return NextResponse.json({ error: { effectiveDate: ["Rejoin date cannot be before the dropout date"] } }, { status: 400 });
    }
    if (effectiveDate > today) {
      return NextResponse.json({ error: { effectiveDate: ["Rejoin date cannot be in the future"] } }, { status: 400 });
    }
    reactivatedAt = attendanceDateStart(effectiveDate);
  }

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.participant.update({
      where: { id: participant.id },
      data: action === "dropout"
        ? { state: "dropout", dropoutAt, dropoutReason: reason, dropoutSource: "manual", reactivatedAt: null }
        : { state: "active", reactivatedAt },
    });
    await tx.auditLog.create({ data: createAuditLogData({
      userId: auth.user.id,
      action: action === "dropout" ? "student.dropout" : "student.reactivate",
      entityType: "participant",
      entityId: participant.id,
      oldValues: { state: participant.state, dropoutAt: participant.dropoutAt, dropoutSource: participant.dropoutSource, reactivatedAt: participant.reactivatedAt },
      newValues: { state: next.state, dropoutAt: next.dropoutAt, dropoutSource: next.dropoutSource, reactivatedAt: next.reactivatedAt },
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
