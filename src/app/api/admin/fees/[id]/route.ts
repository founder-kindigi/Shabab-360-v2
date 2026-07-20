import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { moneyToNumber } from "@/lib/money";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  feeType: z.enum(["tuition", "admission", "other"]).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

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
          park: {
            select: {
              id: true,
              name: true,
              city: { select: { id: true, name: true } },
            },
          },
          groups: {
            where: { isActive: true },
            select: {
              id: true,
              _count: { select: { participants: { where: { state: "active" } } } },
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: {
          participant: {
            select: { id: true, name: true, phone: true, group: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!feeEvent) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  const totalParticipants = feeEvent.batch.groups.reduce(
    (sum, g) => sum + g._count.participants,
    0
  );
  const totalPaid = feeEvent.payments.reduce(
    (sum, payment) => sum + moneyToNumber(payment.amount),
    0
  );
  const totalExpected = moneyToNumber(feeEvent.amount) * totalParticipants;
  const rate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  const now = new Date();
  let dueDateStatus: "overdue" | "upcoming" | "paid" | "none" = "none";
  if (feeEvent.dueDate) {
    if (rate >= 100) {
      dueDateStatus = "paid";
    } else if (feeEvent.dueDate < now) {
      dueDateStatus = "overdue";
    } else {
      const daysUntil = Math.ceil(
        (feeEvent.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 7) {
        dueDateStatus = "upcoming";
      } else {
        dueDateStatus = "none";
      }
    }
  }

  // Get all active participants in this batch
  const groupIds = feeEvent.batch.groups.map((g) => g.id);
  const allParticipants = groupIds.length > 0
    ? await db.participant.findMany({
        where: { groupId: { in: groupIds }, state: "active" },
        select: { id: true, name: true, phone: true, group: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      })
    : [];

  const paidParticipantIds = new Set(feeEvent.payments.map((p) => p.participantId));
  const unpaidParticipants = allParticipants.filter((p) => !paidParticipantIds.has(p.id));

  return NextResponse.json({
    ...feeEvent,
    amount: moneyToNumber(feeEvent.amount),
    discountAmount: moneyToNumber(feeEvent.discountAmount),
    payments: feeEvent.payments.map((payment) => ({
      ...payment,
      amount: moneyToNumber(payment.amount),
      waivedAmount: moneyToNumber(payment.waivedAmount),
    })),
    totalPaid,
    totalExpected,
    totalParticipants,
    paidCount: feeEvent.payments.length,
    rate: Math.round(rate * 100) / 100,
    dueDateStatus,
    unpaidParticipants,
  });
}

export async function PATCH(
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

  const existing = await db.feeEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate !== undefined) {
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }

  const old = {
    title: existing.title,
    feeType: existing.feeType,
    amount: moneyToNumber(existing.amount),
    dueDate: existing.dueDate,
    isActive: existing.isActive,
  };

  const updated = await db.feeEvent.update({ where: { id }, data });

  await logAudit({
    userId: user.id,
    action: "update",
    entityType: "fee_event",
    entityId: id,
    oldValues: old,
    newValues: parsed.data,
  });

  return NextResponse.json({
    ...updated,
    amount: moneyToNumber(updated.amount),
    discountAmount: moneyToNumber(updated.discountAmount),
  });
}

export async function DELETE(
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

  const existing = await db.feeEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  await db.feeEvent.update({ where: { id }, data: { isActive: false } });

  await logAudit({
    userId: user.id,
    action: "delete",
    entityType: "fee_event",
    entityId: id,
    oldValues: {
      title: existing.title,
      batchId: existing.batchId,
    },
  });

  return NextResponse.json({ success: true });
}
