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

  const paidParticipantIds = new Set(feeEvent.payments.map((p) => p.participantId));
  const unpaidParticipants = allParticipants.filter(
    (p) => !paidParticipantIds.has(p.id)
  );

  return NextResponse.json({
    payments: feeEvent.payments,
    unpaidParticipants,
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

  // Check for duplicate payment
  const existingPayment = await db.payment.findFirst({
    where: {
      feeEventId,
      participantId: parsed.data.participantId,
    },
  });
  if (existingPayment) {
    return NextResponse.json(
      { error: { participantId: ["This participant already has a payment recorded for this fee event"] } },
      { status: 400 }
    );
  }

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