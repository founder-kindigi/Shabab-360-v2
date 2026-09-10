import { NextRequest, NextResponse } from "next/server";
import { isHqRole, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createRequestSchema = z.object({
  parkId: z.string().min(1, "Park ID is required"),
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().int().positive("Quantity must be positive").max(1000000),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("organisation.view");
  if (capAuth instanceof NextResponse) return capAuth;

  const url = new URL(request.url);
  const parkIdFilter = url.searchParams.get("parkId");
  const statusFilter = url.searchParams.get("status");

  const where: Prisma.StockRequestWhereInput = {};
  if (statusFilter) where.status = statusFilter;

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

  const requests = await db.stockRequest.findMany({
    where,
    include: {
      park: { select: { id: true, name: true, cityId: true } },
      item: { select: { id: true, sku: true, name: true, category: true, unit: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(requests);
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

  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const park = await db.park.findUnique({ where: { id: parsed.data.parkId } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(user, { cityId: park.cityId, parkId: park.id });
  if (scopeError) return scopeError;

  const item = await db.procurementItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) {
    return NextResponse.json({ error: "Procurement item not found" }, { status: 404 });
  }

  try {
  const stockRequest = await db.$transaction(async tx => {
    const stockRequest = await tx.stockRequest.create({
    data: {
      parkId: parsed.data.parkId,
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
      requestedBy: user.id!,
      status: "pending",
    },
    include: {
      park: { select: { id: true, name: true, cityId: true } },
      item: { select: { id: true, sku: true, name: true } },
    },
  });



    await tx.auditLog.create({ data: createAuditLogData({
    userId: user.id!,
    action: "procurement.request.create",
    entityType: "stock_request",
    entityId: stockRequest.id,
    newValues: {
      parkId: stockRequest.parkId,
      itemId: stockRequest.itemId,
      quantity: stockRequest.quantity,
      reason: stockRequest.reason,
    },
    }) });
    return stockRequest;
  });

  return NextResponse.json(stockRequest, { status: 201 });
  } catch { return NextResponse.json({ error: "Operation could not be saved" }, { status: 503 }); }
}
