import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createPaymentSchema = z.object({
  participantId: z.string().min(1, "Participant is required"),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["cash", "bank", "online", "other"]),
  notes: z.string().optional(),
  waivedAmount: z.number().min(0).optional(),
});

async function generateReceiptNo(prefix: string = "RCP"): Promise<string> {
  const year = new Date().getFullYear();
  const currentPKT = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  const pktYear = currentPKT.getFullYear();

  // Upsert the receipt sequence
  const seq = await db.receiptSequence.upsert({
    where: { prefix_year: { prefix, year: pktYear } },
    create: { prefix, year: pktYear, counter: 1 },
    update: { counter: { increment: 1 } },
  });

  return `${prefix}-${pktYear}-${String(seq.counter).padStart(4, "0")}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
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
  const effectiveAmount = feeEvent.amount - (feeEvent.discountAmount || 0);
  const paidMap = new Map<string, number>();
  for (const p of feeEvent.payments) {
    paidMap.set(p.participantId, (paidMap.get(p.participantId) || 0) + p.amount);
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
    remainingBalance: Math.max(0, effectiveAmount - (paidMap.get(p.participantId) || 0)),
    totalPaid: paidMap.get(p.participantId) || 0,
    effectiveAmount,
  }));

  return NextResponse.json({
    payments: paymentsWithInfo,
    unpaidParticipants: participantsWithBalance,
    effectiveAmount,
    discountAmount: feeEvent.discountAmount || 0,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id: feeEventId } = await params;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch fee event with batch → park → city for receipt context
  const feeEvent = await db.feeEvent.findUnique({
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
  if (!feeEvent) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check remaining balance (allow partial payments)
  const effectiveAmount = feeEvent.amount - (feeEvent.discountAmount || 0);
  const previousPayments = await db.payment.aggregate({
    where: { feeEventId, participantId: parsed.data.participantId },
    _sum: { amount: true },
  });
  const totalPaid = previousPayments._sum.amount || 0;
  const remaining = effectiveAmount - totalPaid;

  if (parsed.data.amount > remaining + 0.01) {
    return NextResponse.json(
      { error: { amount: [`Amount exceeds remaining balance of Rs. ${remaining.toLocaleString()}`] } },
      { status: 400 }
    );
  }

  const isPartial = parsed.data.amount < remaining - 0.01;

  // Generate receipt number
  const receiptNo = await generateReceiptNo();

  const payment = await db.payment.create({
    data: {
      feeEventId,
      participantId: parsed.data.participantId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      receiptNo,
      recordedBy: user.id,
      notes: parsed.data.notes,
      isPartial,
      waivedAmount: parsed.data.waivedAmount || 0,
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

  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "payment",
    entityId: payment.id,
    newValues: {
      feeEventId,
      participantId: parsed.data.participantId,
      amount: parsed.data.amount,
      isPartial,
      remainingBalance: isPartial ? Math.max(0, remaining - parsed.data.amount) : 0,
      method: parsed.data.method,
      receiptNo,
    },
  });

  // Build receipt data for immediate frontend printing
  const receiptData = {
    receiptNo,
    date: new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Karachi",
    }),
    studentName: payment.participant.name,
    groupName: payment.participant.group?.name ?? "—",
    batchName: feeEvent.batch.name,
    parkName: feeEvent.batch.park.name,
    feeTitle: feeEvent.title,
    amount: payment.amount,
    method: payment.method,
    recordedBy: user.name ?? "Admin",
    notes: payment.notes ?? undefined,
  };

  return NextResponse.json(
    { ...payment, receiptData },
    { status: 201 }
  );
}