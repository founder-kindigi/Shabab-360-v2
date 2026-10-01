import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { resolveCityParkScope } from "@/lib/auth/hierarchy";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { receiptIdentity, readOperationReceipt, writeOperationReceipt } from "@/lib/api/operation-receipt";
import { z } from "zod";
const createTransferSchema = z.object({
  fromParkId: z.string().min(1).max(128), toParkId: z.string().min(1).max(128), itemId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(1000000), reason: z.string().trim().max(500).optional(),
}).strict();
export async function POST(request: NextRequest) {
  const auth = await requireAuth(); if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("organisation.manage"); if (capability instanceof NextResponse) return capability;
  const parsed = createTransferSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid transfer" }, { status: 400 });
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) return NextResponse.json({ error: "A stable Idempotency-Key is required for transfer retries" }, { status: 400 });
  const { fromParkId, toParkId, itemId, quantity, reason } = parsed.data;
  if (fromParkId === toParkId) return NextResponse.json({ error: "Source and target parks must differ" }, { status: 400 });
  const identity = receiptIdentity("stock.transfer", auth.user.id!, key, [fromParkId, toParkId, itemId, quantity, reason ?? null]);
  try {
    const result = await db.$transaction(async tx => {
      // Lock both park rows in stable order, including the case of an empty target stock row.
      for (const parkId of [fromParkId, toParkId].sort()) {
        const scope = await resolveCityParkScope(auth.user, { parkId }, tx);
        if (scope instanceof NextResponse) return scope;
        const locked = await tx.park.updateMany({ where: { id: parkId, isActive: true }, data: { isActive: true } });
        if (locked.count !== 1) return NextResponse.json({ error: "Park unavailable" }, { status: 409 });
      }
      const receipt = await readOperationReceipt(tx, identity); if (receipt) return receipt;
      const item = await tx.procurementItem.findUnique({ where: { id: itemId } });
      if (!item || !item.isActive) return NextResponse.json({ error: "Item unavailable" }, { status: 404 });
      const decremented = await tx.parkStock.updateMany({ where: { parkId: fromParkId, itemId, quantity: { gte: quantity } }, data: { quantity: { decrement: quantity } } });
      if (decremented.count !== 1) throw new Error("INSUFFICIENT_STOCK");
      await tx.parkStock.upsert({ where: { parkId_itemId: { parkId: toParkId, itemId } }, create: { parkId: toParkId, itemId, quantity, minThreshold: 5 }, update: { quantity: { increment: quantity } } });
      const transfer = await tx.stockTransfer.create({ data: { fromParkId, toParkId, itemId, quantity, reason: reason || null, transferredBy: auth.user.id! }, include: { fromPark: { select: { id: true, name: true } }, toPark: { select: { id: true, name: true } }, item: { select: { id: true, sku: true, name: true } } } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "procurement.stock.transfer", entityType: "stock_transfer", entityId: transfer.id, newValues: { fromParkId, toParkId, itemId, quantity } }) });
      await writeOperationReceipt(tx, identity, transfer); return transfer;
    });
    return result instanceof NextResponse ? result : NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "Insufficient stock in source park" }, { status: 409 });
    if (error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT") return NextResponse.json({ error: "Idempotency key already used for different transfer details" }, { status: 409 });
    return NextResponse.json({ error: "Transfer was not acknowledged. Retry with the same idempotency key." }, { status: 503 });
  }
}
