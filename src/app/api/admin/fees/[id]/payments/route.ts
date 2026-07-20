import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fromCents, moneyToNumber, roundToCents, toCents } from "@/lib/money";
import { z } from "zod";

const createPaymentSchema = z.object({
  participantId: z.string().min(1, "Participant is required"),
  amount: z.number().finite().positive("Amount must be positive").refine(
    (amount) => toCents(amount) !== null,
    "Amount can have at most two decimal places"
  ),
  method: z.enum(["cash", "bank", "online", "other"]),
  notes: z.string().trim().max(1000).optional(),
  waivedAmount: z.number().finite().min(0).optional().default(0),
});

class PaymentError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) {
    super(message);
  }
}

async function generateReceiptNo(
  tx: Prisma.TransactionClient,
  prefix: string = "RCP"
): Promise<string> {
  const currentPKT = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  const pktYear = currentPKT.getFullYear();

  const seq = await tx.receiptSequence.upsert({
    where: { prefix_year: { prefix, year: pktYear } },
    create: { prefix, year: pktYear, counter: 1 },
    update: { counter: { increment: 1 } },
  });

  return `${prefix}-${pktYear}-${String(seq.counter).padStart(4, "0")}`;
}

function isTransactionConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("fees.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const { id } = await params;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const feeEvent = await db.feeEvent.findUnique({
    where: { id },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          groups: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              phone: true,
              group: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!feeEvent) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  // Get all active participants in the batch
  const groupIds = feeEvent.batch.groups.map((g) => g.id);
  const allParticipants =
    groupIds.length > 0
      ? await db.participant.findMany({
          where: { groupId: { in: groupIds }, state: "active" },
          select: {
            id: true,
            name: true,
            phone: true,
            group: { select: { id: true, name: true } },
          },
          orderBy: { name: "asc" },
        })
      : [];

  // Calculate paid amounts per participant
  const discountAmount = moneyToNumber(feeEvent.discountAmount);
  const effectiveAmount = moneyToNumber(feeEvent.amount) - discountAmount;
  const paidMap = new Map<string, number>();
  for (const p of feeEvent.payments) {
    paidMap.set(
      p.participantId,
      (paidMap.get(p.participantId) || 0) + moneyToNumber(p.amount)
    );
  }

  // Participants who are fully paid
  const fullyPaidIds = new Set<string>();
  for (const [pid, paid] of paidMap.entries()) {
    if (paid >= effectiveAmount - 0.01) fullyPaidIds.add(pid);
  }

  // Unpaid + partially paid participants
  const unpaidParticipants = allParticipants.filter(
    (p) => !fullyPaidIds.has(p.id)
  );

  // Attach remaining balance info to participants
  const participantsWithBalance = unpaidParticipants.map((p) => ({
    ...p,
    totalPaid: paidMap.get(p.id) || 0,
    remaining: Math.max(0, effectiveAmount - (paidMap.get(p.id) || 0)),
    isPartial: (paidMap.get(p.id) || 0) > 0,
  }));

  // Attach remaining balance to payments
  const paymentsWithInfo = feeEvent.payments.map((p) => ({
    ...p,
    amount: moneyToNumber(p.amount),
    waivedAmount: moneyToNumber(p.waivedAmount),
    remainingBalance: Math.max(0, effectiveAmount - (paidMap.get(p.participantId) || 0)),
    totalPaid: paidMap.get(p.participantId) || 0,
    effectiveAmount,
  }));

  return NextResponse.json({
    payments: paymentsWithInfo,
    unpaidParticipants: participantsWithBalance,
    effectiveAmount,
    discountAmount,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("fees.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const { id: feeEventId } = await params;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const amountCents = toCents(parsed.data.amount);
  const waivedAmountCents = toCents(parsed.data.waivedAmount);
  if (amountCents === null || waivedAmountCents === null) {
    return NextResponse.json({ error: { amount: ["Invalid amount precision"] } }, { status: 400 });
  }
  if (waivedAmountCents !== 0) {
    return NextResponse.json(
      { error: { waivedAmount: ["Use the fee-event waiver instead of a per-payment waiver"] } },
      { status: 400 }
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const feeEvent = await tx.feeEvent.findUnique({
        where: { id: feeEventId, isActive: true },
        include: {
          batch: {
            select: {
              name: true,
              park: { select: { name: true } },
            },
          },
        },
      });
      if (!feeEvent) throw new PaymentError("Fee event not found", 404);

      const participant = await tx.participant.findFirst({
        where: {
          id: parsed.data.participantId,
          state: "active",
          group: { batchId: feeEvent.batchId },
        },
      });
      if (!participant) {
        throw new PaymentError("Participant is not active in this fee event's batch", 409);
      }

      const effectiveAmountCents = roundToCents(
        moneyToNumber(feeEvent.amount) - moneyToNumber(feeEvent.discountAmount)
      );
      if (effectiveAmountCents < 0) {
        throw new PaymentError("Fee event has an invalid discounted amount", 400);
      }

      const previousPayments = await tx.payment.aggregate({
        where: { feeEventId, participantId: participant.id },
        _sum: { amount: true },
      });
      const totalPaidCents = roundToCents(moneyToNumber(previousPayments._sum.amount));
      const remainingCents = Math.max(0, effectiveAmountCents - totalPaidCents);
      if (amountCents > remainingCents) {
        throw new PaymentError(
          `Amount exceeds remaining balance of Rs. ${fromCents(remainingCents).toLocaleString()}`,
          400
        );
      }

      const isPartial = amountCents < remainingCents;
      const receiptNo = await generateReceiptNo(tx);
      const payment = await tx.payment.create({
        data: {
          feeEventId,
          participantId: participant.id,
          amount: fromCents(amountCents),
          method: parsed.data.method,
          receiptNo,
          recordedBy: user.id,
          notes: parsed.data.notes || null,
          isPartial,
          waivedAmount: 0,
        },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              phone: true,
              group: { select: { name: true } },
            },
          },
        },
      });

      return { feeEvent, payment, receiptNo, isPartial, remainingCents };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entityType: "payment",
      entityId: result.payment.id,
      newValues: {
        feeEventId,
        participantId: parsed.data.participantId,
        amount: moneyToNumber(result.payment.amount),
        isPartial: result.isPartial,
        remainingBalance: result.isPartial ? fromCents(result.remainingCents - amountCents) : 0,
        method: parsed.data.method,
        receiptNo: result.receiptNo,
      },
    });

    const receiptData = {
      receiptNo: result.receiptNo,
      date: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Karachi",
      }),
      studentName: result.payment.participant.name,
      groupName: result.payment.participant.group?.name ?? "—",
      batchName: result.feeEvent.batch.name,
      parkName: result.feeEvent.batch.park.name,
      feeTitle: result.feeEvent.title,
      amount: moneyToNumber(result.payment.amount),
      method: result.payment.method,
      recordedBy: user.name ?? "Admin",
      notes: result.payment.notes ?? undefined,
    };

    return NextResponse.json(
      {
        ...result.payment,
        amount: moneyToNumber(result.payment.amount),
        waivedAmount: moneyToNumber(result.payment.waivedAmount),
        receiptData,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: { amount: [error.message] } }, { status: error.status });
    }
    if (isTransactionConflict(error)) {
      return NextResponse.json(
        { error: { amount: ["A concurrent payment was recorded. Refresh the balance and try again."] } },
        { status: 409 }
      );
    }
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Unable to record payment" }, { status: 500 });
  }
}
