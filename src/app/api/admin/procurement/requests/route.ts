import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createRequestSchema = z.object({
  parkId: z.string().min(1, "Park ID is required"),
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500),
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
  const statusFilter = url.searchParams.get("status");

  const where: any = {};
  if (statusFilter) where.status = statusFilter;

  if (parkIdFilter) {
    const park = await db.park.findUnique({ where: { id: parkIdFilter } });
    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }
    if (actorCity && park.cityId !== actorCity) {
      return NextResponse.json({ error: "Forbidden: Cannot view requests outside city scope" }, { status: 403 });
    }
    where.parkId = parkIdFilter;
  } else if (actorCity) {
    where.park = { cityId: actorCity };
  } else if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Park or city context is required" }, { status: 400 });
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

  const actorCity = await resolveActorCity();
  if (actorCity && park.cityId !== actorCity) {
    return NextResponse.json({ error: "Forbidden: Cannot submit request for park outside city scope" }, { status: 403 });
  }

  const item = await db.procurementItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) {
    return NextResponse.json({ error: "Procurement item not found" }, { status: 404 });
  }

  const stockRequest = await db.stockRequest.create({
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

  logAudit({
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
  });

  return NextResponse.json(stockRequest, { status: 201 });
}
