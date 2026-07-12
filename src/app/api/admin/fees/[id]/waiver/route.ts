import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const waiverSchema = z.object({
  discountAmount: z.number().min(0, "Discount must be 0 or more"),
  waiverReason: z.string().min(5, "Reason must be at least 5 characters"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Parse & validate body
  const body = await request.json().catch(() => null);
  const parsed = waiverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { discountAmount, waiverReason } = parsed.data;

  // Find the fee event
  const feeEvent = await db.feeEvent.findUnique({
    where: { id },
    include: { batch: { include: { park: true } } },
  });

  if (!feeEvent) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  if (discountAmount > feeEvent.amount) {
    return NextResponse.json(
      { error: "Discount cannot exceed the fee amount" },
      { status: 400 }
    );
  }

  // Update fee event with waiver
  const updated = await db.feeEvent.update({
    where: { id },
    data: {
      discountAmount,
      waiverReason,
      waivedBy: user.id,
      waivedAt: new Date(),
    },
  });

  // Log audit
  await logAudit({
    userId: user.id!,
    action: "fee_waiver",
    entityType: "FeeEvent",
    entityId: id,
    details: {
      feeTitle: feeEvent.title,
      originalAmount: feeEvent.amount,
      discountAmount,
      waiverReason,
      parkId: feeEvent.batch?.parkId,
      batchId: feeEvent.batchId,
    },
  });

  return NextResponse.json({
    success: true,
    data: updated,
    message: `Waiver of Rs. ${discountAmount.toLocaleString()} applied`,
  });
}

// Remove waiver (set discount to 0)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const feeEvent = await db.feeEvent.findUnique({ where: { id } });
  if (!feeEvent) {
    return NextResponse.json({ error: "Fee event not found" }, { status: 404 });
  }

  await db.feeEvent.update({
    where: { id },
    data: {
      discountAmount: 0,
      waiverReason: null,
      waivedBy: null,
      waivedAt: null,
    },
  });

  await logAudit({
    userId: user.id!,
    action: "fee_waiver_removed",
    entityType: "FeeEvent",
    entityId: id,
    details: { previousDiscount: feeEvent.discountAmount, feeTitle: feeEvent.title },
  });

  return NextResponse.json({ success: true, message: "Waiver removed" });
}