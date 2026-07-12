import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendFeeReminder } from "@/lib/email-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (!["super_admin", "program_admin", "park_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Parse body for optional target participant IDs (empty = remind all unpaid)
  const body = await request.json().catch(() => ({}));
  const { participantIds }: { participantIds?: string[] } = body;

  // Find fee event with batch info
  const feeEvent = await db.feeEvent.findUnique({
    where: { id },
    include: {
      batch: {
        include: {
          park: true,
          groups: {
            include: {
              participants: {
                include: {
                  guardian: {
                    include: { user: { select: { email: true } } },
                  },
                },
              },
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!feeEvent) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  // Collect all participants from the batch's groups
  const allParticipants = feeEvent.batch.groups.flatMap((g) => g.participants);
  const uniqueParticipants = Array.from(
    new Map(allParticipants.map((p) => [p.id, p])).values()
  );

  // Calculate paid amounts per participant
  const paidByParticipant = new Map<string, number>();
  for (const payment of feeEvent.payments) {
    paidByParticipant.set(
      payment.participantId,
      (paidByParticipant.get(payment.participantId) || 0) + payment.amount
    );
  }

  // Filter to unpaid or partially paid
  const effectiveAmount = feeEvent.amount - feeEvent.discountAmount;
  let targets = uniqueParticipants.filter((p) => {
    const paid = paidByParticipant.get(p.id) || 0;
    return paid < effectiveAmount;
  });

  // If specific participants requested, filter further
  if (participantIds && participantIds.length > 0) {
    targets = targets.filter((p) => participantIds.includes(p.id));
  }

  if (targets.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No unpaid participants to remind",
      sentCount: 0,
    });
  }

  // Send reminders
  let sentCount = 0;
  const errors: string[] = [];

  for (const participant of targets) {
    const paid = paidByParticipant.get(participant.id) || 0;
    const amountDue = Math.max(0, effectiveAmount - paid);

    try {
      await sendFeeReminder(
        participant.guardian || null,
        feeEvent.title,
        amountDue
      );
      sentCount++;
    } catch (err) {
      errors.push(`${participant.name}: ${err instanceof Error ? err.message : "Failed"}`);
    }
  }

  // Update reminder tracking on fee event
  await db.feeEvent.update({
    where: { id },
    data: {
      reminderSentAt: new Date(),
      reminderCount: { increment: 1 },
    },
  });

  // Audit log
  await logAudit({
    userId: user.id!,
    action: "fee_reminder_sent",
    entityType: "FeeEvent",
    entityId: id,
    details: {
      feeTitle: feeEvent.title,
      sentCount,
      totalTargets: targets.length,
      errors: errors.length > 0 ? errors : undefined,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Fee reminders sent to ${sentCount} guardian(s)`,
    sentCount,
    totalTargets: targets.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}