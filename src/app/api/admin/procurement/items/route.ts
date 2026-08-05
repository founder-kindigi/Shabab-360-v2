import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { z } from "zod";

const createItemSchema = z.object({
  sku: z.string().trim().min(3, "SKU must be at least 3 characters").max(50),
  name: z.string().trim().min(2, "Item name must be at least 2 characters").max(100),
  category: z.enum(["sports_equipment", "stationery", "apparel", "event_materials", "general"]),
  unit: z.enum(["piece", "box", "set", "pack"]),
  unitCost: z.number().finite().min(0, "Unit cost cannot be negative").refine(
    (val) => toCents(val) !== null,
    "Unit cost can have at most two decimal places"
  ),
  description: z.string().trim().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capAuth = await requireCapability("settings.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  const url = new URL(request.url);
  const categoryFilter = url.searchParams.get("category");

  const where: any = { isActive: true };
  if (categoryFilter) where.category = categoryFilter;

  const items = await db.procurementItem.findMany({
    where,
    orderBy: { sku: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("settings.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existingSku = await db.procurementItem.findUnique({
    where: { sku: parsed.data.sku },
  });
  if (existingSku) {
    return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  }

  const item = await db.procurementItem.create({
    data: {
      sku: parsed.data.sku,
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      unitCost: parsed.data.unitCost,
      description: parsed.data.description || null,
    },
  });

  logAudit({
    userId: user.id!,
    action: "procurement.item.create",
    entityType: "procurement_item",
    entityId: item.id,
    newValues: {
      sku: item.sku,
      name: item.name,
      category: item.category,
      unitCost: item.unitCost,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
