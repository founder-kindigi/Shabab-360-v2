import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createPOSchema = z.object({
  cityId: z.string().min(1, "City ID is required"),
  parkId: z.string().optional(),
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitCost: z.number().finite().positive("Unit cost must be positive").refine(
    (val) => toCents(val) !== null,
    "Unit cost can have at most two decimal places"
  ),
  supplierName: z.string().trim().min(2, "Supplier name must be at least 2 characters").max(100),
});

async function generatePONumber(
  tx: Prisma.TransactionClient,
  prefix: string = "PO"
): Promise<string> {
  const pktYear = new Date().getFullYear();
  const seq = await tx.receiptSequence.upsert({
    where: { prefix_year: { prefix, year: pktYear } },
    create: { prefix, year: pktYear, counter: 1 },
    update: { counter: { increment: 1 } },
  });
  return `${prefix}-${pktYear}-${String(seq.counter).padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("organisation.view");
  if (capAuth instanceof NextResponse) return capAuth;

  const actorCity = await resolveActorCity();
  const url = new URL(request.url);
  const cityIdFilter = url.searchParams.get("cityId") || actorCity;
  const parkIdFilter = url.searchParams.get("parkId");

  if (!cityIdFilter && !["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "City context is required" }, { status: 400 });
  }

  const where: any = {};
  if (cityIdFilter) where.cityId = cityIdFilter;
  if (parkIdFilter) where.parkId = parkIdFilter;

  const orders = await db.purchaseOrder.findMany({
    where,
    include: {
      city: { select: { id: true, name: true, code: true } },
      park: { select: { id: true, name: true } },
      item: { select: { id: true, sku: true, name: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(orders);
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

  const parsed = createPOSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && actorCity !== parsed.data.cityId) {
    return NextResponse.json({ error: "Forbidden: Cannot issue purchase order for outside city scope" }, { status: 403 });
  }

  const cityExists = await db.city.findUnique({ where: { id: parsed.data.cityId } });
  if (!cityExists) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  if (parsed.data.parkId) {
    const parkExists = await db.park.findUnique({ where: { id: parsed.data.parkId } });
    if (!parkExists || parkExists.cityId !== parsed.data.cityId) {
      return NextResponse.json({ error: "Park not found or does not belong to specified city" }, { status: 400 });
    }
  }

  const item = await db.procurementItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) {
    return NextResponse.json({ error: "Procurement item not found" }, { status: 404 });
  }

  const totalCost = Number((parsed.data.quantity * parsed.data.unitCost).toFixed(2));

  const po = await db.$transaction(async (tx) => {
    const poNumber = await generatePONumber(tx);
    const order = await tx.purchaseOrder.create({
      data: {
        poNumber,
        cityId: parsed.data.cityId,
        parkId: parsed.data.parkId || null,
        itemId: parsed.data.itemId,
        quantity: parsed.data.quantity,
        unitCost: parsed.data.unitCost,
        totalCost,
        supplierName: parsed.data.supplierName,
        status: "issued",
        issuedBy: user.id!,
      },
      include: {
        city: { select: { id: true, name: true, code: true } },
        park: { select: { id: true, name: true } },
        item: { select: { id: true, sku: true, name: true } },
      },
    });

    // If assigned directly to a park, auto-increment park stock balance!
    if (parsed.data.parkId) {
      await tx.parkStock.upsert({
        where: { parkId_itemId: { parkId: parsed.data.parkId, itemId: parsed.data.itemId } },
        create: {
          parkId: parsed.data.parkId,
          itemId: parsed.data.itemId,
          quantity: parsed.data.quantity,
          minThreshold: 5,
        },
        update: {
          quantity: { increment: parsed.data.quantity },
        },
      });
    }

    return order;
  });

  logAudit({
    userId: user.id!,
    action: "procurement.order.issue",
    entityType: "purchase_order",
    entityId: po.id,
    newValues: {
      poNumber: po.poNumber,
      cityId: po.cityId,
      parkId: po.parkId,
      itemId: po.itemId,
      quantity: po.quantity,
      totalCost: po.totalCost,
      supplierName: po.supplierName,
    },
  });

  return NextResponse.json(po, { status: 201 });
}
