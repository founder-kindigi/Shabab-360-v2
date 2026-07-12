import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const batchCreateSchema = z.object({
  batchIds: z
    .array(z.string().min(1))
    .min(1, "At least one batch is required")
    .max(50, "Maximum 50 batches at a time"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  feeType: z.enum(["monthly", "registration", "exam", "special", "other"]),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = batchCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { batchIds, title, feeType, amount, dueDate } = parsed.data;

  // Verify all batches exist and are active
  const existingBatches = await db.batch.findMany({
    where: {
      id: { in: batchIds },
      isActive: true,
    },
    select: { id: true, name: true },
  });

  const foundIds = new Set(existingBatches.map((b) => b.id));
  const missingIds = batchIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    return NextResponse.json(
      {
        error: {
          batchIds: `${missingIds.length} batch(es) not found or inactive`,
        },
      },
      { status: 404 }
    );
  }

  // Create FeeEvents for all batches
  const created: { id: string; batchId: string; batchName: string }[] = [];
  const failed: { batchId: string; error: string }[] = [];

  for (const batchId of batchIds) {
    try {
      const feeEvent = await db.feeEvent.create({
        data: {
          batchId,
          title,
          feeType,
          amount,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      created.push({
        id: feeEvent.id,
        batchId,
        batchName:
          existingBatches.find((b) => b.id === batchId)?.name || batchId,
      });
    } catch {
      failed.push({ batchId, error: "Failed to create fee event" });
    }
  }

  // Audit log for batch operation
  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "fee_event",
    entityId: created[0]?.id,
    newValues: {
      batchOperation: true,
      batchCount: created.length,
      title,
      feeType,
      amount,
      dueDate: dueDate || null,
      batchIds: created.map((c) => ({ id: c.batchId, name: c.batchName })),
    },
    reason: `Batch fee generation: ${created.length} fee events created`,
  });

  return NextResponse.json(
    {
      created: created.length,
      failed: failed.length,
      data: created,
      errors: failed,
    },
    { status: 201 }
  );
}