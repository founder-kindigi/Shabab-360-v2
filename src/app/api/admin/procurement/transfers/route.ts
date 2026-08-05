import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createTransferSchema = z.object({
  fromParkId: z.string().min(1, "Source park ID is required"),
  toParkId: z.string().min(1, "Target park ID is required"),
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().int().positive("Transfer quantity must be positive"),
  reason: z.string().trim().max(500).optional(),
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

  const parsed = createTransferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  if (parsed.data.fromParkId === parsed.data.toParkId) {
    return NextResponse.json({ error: "Source and target parks must be different" }, { status: 400 });
  }

  const fromPark = await db.park.findUnique({ where: { id: parsed.data.fromParkId } });
  const toPark = await db.park.findUnique({ where: { id: parsed.data.toParkId } });

  if (!fromPark || !toPark) {
    return NextResponse.json({ error: "One or both specified parks were not found" }, { status: 404 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && (fromPark.cityId !== actorCity || toPark.cityId !== actorCity)) {
    return NextResponse.json({ error: "Forbidden: Cannot transfer stock outside assigned city scope" }, { status: 403 });
  }

  const sourceStock = await db.parkStock.findUnique({
    where: { parkId_itemId: { parkId: parsed.data.fromParkId, itemId: parsed.data.itemId } },
  });

  if (!sourceStock || sourceStock.quantity < parsed.data.quantity) {
    return NextResponse.json({ error: `Insufficient stock in source park. Current available: ${sourceStock?.quantity || 0}` }, { status: 400 });
  }

  const transfer = await db.$transaction(async (tx) => {
    // Decrement source park stock
    await tx.parkStock.update({
      where: { parkId_itemId: { parkId: parsed.data.fromParkId, itemId: parsed.data.itemId } },
      data: { quantity: { decrement: parsed.data.quantity } },
    });

    // Increment target park stock
    await tx.parkStock.upsert({
      where: { parkId_itemId: { parkId: parsed.data.toParkId, itemId: parsed.data.itemId } },
      create: {
        parkId: parsed.data.toParkId,
        itemId: parsed.data.itemId,
        quantity: parsed.data.quantity,
        minThreshold: 5,
      },
      update: {
        quantity: { increment: parsed.data.quantity },
      },
    });

    // Create audit transfer log
    return tx.stockTransfer.create({
      data: {
        fromParkId: parsed.data.fromParkId,
        toParkId: parsed.data.toParkId,
        itemId: parsed.data.itemId,
        quantity: parsed.data.quantity,
        reason: parsed.data.reason || null,
        transferredBy: user.id!,
      },
      include: {
        fromPark: { select: { id: true, name: true } },
        toPark: { select: { id: true, name: true } },
        item: { select: { id: true, sku: true, name: true } },
      },
    });
  });

  logAudit({
    userId: user.id!,
    action: "procurement.stock.transfer",
    entityType: "stock_transfer",
    entityId: transfer.id,
    newValues: {
      fromParkId: transfer.fromParkId,
      toParkId: transfer.toParkId,
      itemId: transfer.itemId,
      quantity: transfer.quantity,
    },
  });

  return NextResponse.json(transfer, { status: 201 });
}
