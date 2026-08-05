import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createStockAuditSchema = z.object({
  parkId: z.string().min(1, "Park ID is required"),
  itemId: z.string().min(1, "Item ID is required"),
  actualCount: z.number().int().min(0, "Actual count cannot be negative"),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("organisation.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createStockAuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const park = await db.park.findUnique({ where: { id: parsed.data.parkId } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && park.cityId !== actorCity) {
    return NextResponse.json({ error: "Forbidden: Cannot record physical audit outside city scope" }, { status: 403 });
  }

  const item = await db.procurementItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) {
    return NextResponse.json({ error: "Procurement item not found" }, { status: 404 });
  }

  const currentStock = await db.parkStock.findUnique({
    where: { parkId_itemId: { parkId: parsed.data.parkId, itemId: parsed.data.itemId } },
  });

  const systemCount = currentStock?.quantity || 0;
  const discrepancy = parsed.data.actualCount - systemCount;

  const auditEntry = await db.$transaction(async (tx) => {
    // Reconcile system count to actual count
    await tx.parkStock.upsert({
      where: { parkId_itemId: { parkId: parsed.data.parkId, itemId: parsed.data.itemId } },
      create: {
        parkId: parsed.data.parkId,
        itemId: parsed.data.itemId,
        quantity: parsed.data.actualCount,
        minThreshold: 5,
      },
      update: {
        quantity: parsed.data.actualCount,
      },
    });

    return tx.stockAuditLog.create({
      data: {
        parkId: parsed.data.parkId,
        itemId: parsed.data.itemId,
        systemCount,
        actualCount: parsed.data.actualCount,
        discrepancy,
        reason: parsed.data.reason,
        auditedBy: user.id!,
      },
      include: {
        park: { select: { id: true, name: true } },
        item: { select: { id: true, sku: true, name: true } },
      },
    });
  });

  logAudit({
    userId: user.id!,
    action: "procurement.stock.physical_audit",
    entityType: "stock_audit_log",
    entityId: auditEntry.id,
    newValues: {
      parkId: auditEntry.parkId,
      itemId: auditEntry.itemId,
      systemCount,
      actualCount: auditEntry.actualCount,
      discrepancy,
      reason: auditEntry.reason,
    },
  });

  return NextResponse.json(auditEntry, { status: 201 });
}
