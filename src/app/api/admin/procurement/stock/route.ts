import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const setStockSchema = z.object({
  parkId: z.string().min(1, "Park ID is required"),
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  minThreshold: z.number().int().min(0, "Minimum threshold cannot be negative").optional().default(5),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("organisation.view");
  if (capAuth instanceof NextResponse) return capAuth;

  const actorCity = await resolveActorCity();
  const url = new URL(request.url);
  const parkIdFilter = url.searchParams.get("parkId");

  const where: any = {};
  if (parkIdFilter) {
    const park = await db.park.findUnique({ where: { id: parkIdFilter } });
    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }
    if (actorCity && park.cityId !== actorCity) {
      return NextResponse.json({ error: "Forbidden: Cannot view stock outside city scope" }, { status: 403 });
    }
    where.parkId = parkIdFilter;
  } else if (actorCity) {
    where.park = { cityId: actorCity };
  } else if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Park or city context is required" }, { status: 400 });
  }

  const stocks = await db.parkStock.findMany({
    where,
    include: {
      park: { select: { id: true, name: true, cityId: true } },
      item: { select: { id: true, sku: true, name: true, category: true, unit: true, unitCost: true } },
    },
    orderBy: [{ parkId: "asc" }, { item: { name: "asc" } }],
  });

  return NextResponse.json(stocks);
}

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

  const parsed = setStockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const park = await db.park.findUnique({ where: { id: parsed.data.parkId } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && park.cityId !== actorCity) {
    return NextResponse.json({ error: "Forbidden: Cannot update stock for park outside city scope" }, { status: 403 });
  }

  const item = await db.procurementItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) {
    return NextResponse.json({ error: "Procurement item not found" }, { status: 404 });
  }

  const stock = await db.parkStock.upsert({
    where: { parkId_itemId: { parkId: parsed.data.parkId, itemId: parsed.data.itemId } },
    create: {
      parkId: parsed.data.parkId,
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      minThreshold: parsed.data.minThreshold,
    },
    update: {
      quantity: parsed.data.quantity,
      minThreshold: parsed.data.minThreshold,
    },
    include: {
      park: { select: { id: true, name: true, cityId: true } },
      item: { select: { id: true, sku: true, name: true, category: true } },
    },
  });

  logAudit({
    userId: user.id!,
    action: "procurement.stock.update",
    entityType: "park_stock",
    entityId: stock.id,
    newValues: {
      parkId: stock.parkId,
      itemId: stock.itemId,
      quantity: stock.quantity,
      minThreshold: stock.minThreshold,
    },
  });

  return NextResponse.json(stock, { status: 200 });
}
