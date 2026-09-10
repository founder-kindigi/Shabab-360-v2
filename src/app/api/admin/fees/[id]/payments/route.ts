import { resolveRequestedHierarchy, hierarchyGroupWhere, requireResolvedGroupScope, groupHierarchyInclude } from "@/lib/auth/hierarchy";
import { receiptIdentity, readOperationReceipt, writeOperationReceipt } from "@/lib/api/operation-receipt";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { fromCents, moneyToNumber, roundToCents, toCents } from "@/lib/money";
import { z } from "zod";

const createPaymentSchema = z.object({
  participantId: z.string().min(1, "Participant is required").max(128),
  amount: z.number().finite().positive("Amount must be positive").max(100000000).refine(
    (amount) => toCents(amount) !== null,
    "Amount can have at most two decimal places"
  ),
  method: z.enum(["cash", "bank", "online", "other"]),
  notes: z.string().trim().max(1000).optional(),
  waivedAmount: z.number().finite().min(0).optional().default(0),
});

class PaymentError extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404 | 409) {
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


  const scope = await resolveRequestedHierarchy(user);
  if (scope instanceof NextResponse) return scope;
  const groupWhere = hierarchyGroupWhere(scope);
  const feeEvent = await db.feeEvent.findUnique({
    where: { id },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          groups: {
            where: { isActive: true, ...groupWhere },
            select: { id: true },
          },
        },
      },
      payments: {
        where: { participant: { group: groupWhere } },
        orderBy: { createdAt: "desc" },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              phone: true,
              group: { select: { name: true, parkId: true, park: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!feeEvent) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  if (scope.kind !== "hq" && feeEvent.batch.groups.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  const key = request.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) return NextResponse.json({ error: "A stable Idempotency-Key is required" }, { status: 400 });
  const identity = receiptIdentity("fee.payment", user.id!, key, [feeEventId, parsed.data.participantId, amountCents, parsed.data.method, parsed.data.notes ?? null]);
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.feeEvent.updateMany({ where: { id: feeEventId, isActive: true }, data: { isActive: true } });
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
        include: { group: { include: groupHierarchyInclude } },
      });
      if (!participant) {
        throw new PaymentError("Participant is not active in this fee event's batch", 409);
      }

      if (requireResolvedGroupScope(user, participant.group)) throw new PaymentError("Forbidden", 403);
      const replay = await readOperationReceipt(tx, identity);
      if (replay) {
        const payment = await tx.payment.findUnique({ where: { id: replay.paymentId }, include: { participant: { select: { id: true, name: true, phone: true, group: { select: { name: true, parkId: true, park: { select: { name: true } } } } } } } });
        if (!payment) throw new PaymentError("Payment receipt unavailable", 409);
        return { feeEvent, payment, receiptNo: payment.receiptNo, isPartial: payment.isPartial, remainingCents: 0 };
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
              group: { select: { name: true, parkId: true, park: { select: { name: true } } } },
            },
          },
        },
      });

      await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "create", entityType: "payment", entityId: payment.id, newValues: { feeEventId, participantId: participant.id, amount: fromCents(amountCents), method: parsed.data.method, receiptNo } }) });
      await writeOperationReceipt(tx, identity, { paymentId: payment.id });
      return { feeEvent, payment, receiptNo, isPartial, remainingCents };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    });


    const receiptData = {
      receiptNo: result.receiptNo,
      date: new Date(result.payment.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Karachi",
      }),
      studentName: result.payment.participant.name,
      groupName: result.payment.participant.group?.name ?? "—",
      batchName: result.feeEvent.batch.name,
      parkName: participantParkName(result.payment.participant.group) ?? result.feeEvent.batch.park.name,
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
    if (error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT") return NextResponse.json({ error: "Retry key already used for different payment details" }, { status: 409 });
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

function participantParkName(group: { parkId?: string | null; park?: { name: string } | null } | null) { return group?.parkId ? group.park?.name : null; }
