import { resolveCityParkScope } from "@/lib/auth/hierarchy";
import { NextRequest, NextResponse } from "next/server";
import { isHqRole, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { z } from "zod";

const setStockSchema = z.object({
  parkId: z.string().min(1, "Park ID is required").max(128),
  itemId: z.string().min(1, "Item ID is required").max(128),
  quantity: z.number().int().min(0, "Quantity cannot be negative").max(1000000),
  minThreshold: z.number().int().min(0, "Minimum threshold cannot be negative").max(1000000).optional().default(5),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("organisation.view");
  if (capAuth instanceof NextResponse) return capAuth;

  const url = new URL(request.url);
  const parkIdFilter = url.searchParams.get("parkId");

  const where: any = {};
  if (parkIdFilter) {
    const park = await db.park.findUnique({ where: { id: parkIdFilter } });
    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }
    const scopeError = requireResourceScope(user, { cityId: park.cityId, parkId: park.id });
    if (scopeError) return scopeError;
    where.parkId = parkIdFilter;
  } else if (!isHqRole(user.role)) {
    if (user.role === "city_head" && user.assignedCityId) {
      where.park = { cityId: user.assignedCityId };
    } else if (["park_admin", "park_lead"].includes(user.role || "") && user.assignedParkId) {
      where.parkId = user.assignedParkId;
    } else {
      return NextResponse.json({ error: "A resolved park or city scope is required" }, { status: 403 });
    }
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

  const match = request.headers.get("If-Match");
  if (!match) return NextResponse.json({ error: "Reload stock before setting a balance" }, { status: 428 });
  if (match !== "new" && !z.string().datetime().safeParse(match).success) return NextResponse.json({ error: "Invalid stock version" }, { status: 400 });
  try {
    return await db.$transaction(async tx => {
      const scope = await resolveCityParkScope(user, { parkId: parsed.data.parkId }, tx);
      if (scope instanceof NextResponse) return scope;
      // Use the same park lock as transfers so a set cannot erase a concurrent movement.
      const locked = await tx.park.updateMany({ where: { id: parsed.data.parkId, isActive: true }, data: { isActive: true } });
      if (locked.count !== 1) return NextResponse.json({ error: "Park unavailable" }, { status: 409 });
      const item = await tx.procurementItem.findUnique({ where: { id: parsed.data.itemId } });
      if (!item?.isActive) return NextResponse.json({ error: "Item unavailable" }, { status: 404 });
      const where = { parkId_itemId: { parkId: parsed.data.parkId, itemId: parsed.data.itemId } };
      const existing = await tx.parkStock.findUnique({ where });
      if ((existing?.updatedAt.toISOString() ?? "new") !== match) return NextResponse.json({ error: "Stock changed. Reload the balance before setting it." }, { status: 409 });
      const updatedAt = new Date(Math.max(Date.now(), (existing?.updatedAt.getTime() ?? 0) + 1));
      const include = { park: { select: { id: true, name: true, cityId: true } }, item: { select: { id: true, sku: true, name: true, category: true } } } as const;
      const stock = existing ? await tx.parkStock.update({ where: { id: existing.id, updatedAt: existing.updatedAt }, data: { quantity: parsed.data.quantity, minThreshold: parsed.data.minThreshold, updatedAt }, include }) : await tx.parkStock.create({ data: { ...parsed.data, updatedAt }, include });
      await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "procurement.stock.update", entityType: "park_stock", entityId: stock.id, oldValues: existing ? { quantity: existing.quantity } : undefined, newValues: { quantity: stock.quantity, minThreshold: stock.minThreshold, parkId: stock.parkId, itemId: stock.itemId } }) });
      return NextResponse.json(stock);
    });
  } catch (error) {
    const conflict = ["P2002", "P2025"].includes((error as { code?: string }).code ?? "");
    return NextResponse.json({ error: conflict ? "Stock changed. Reload before setting it." : "Stock update was not acknowledged. Reload before retrying." }, { status: conflict ? 409 : 503 });
  }
}
