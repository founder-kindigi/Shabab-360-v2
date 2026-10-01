import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveRequestedCityScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { resolveCityParkScope } from "@/lib/auth/hierarchy";
import { createAuditLogData } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { z } from "zod";

const createAdjustmentSchema = z.object({
  cityId: z.string().min(1, "City ID is required").max(128),
  parkId: z.string().max(128).optional(),
  type: z.enum(["credit", "debit"]),
  amount: z.number().finite().positive("Amount must be positive").max(100000000).refine(
    (val) => toCents(val) !== null,
    "Amount can have at most two decimal places"
  ),
  category: z.enum(["waiver", "write_off", "grant", "correction"]),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(1000),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("fees.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  const url = new URL(request.url);
  const cityScope = await resolveCityParkScope(user, { cityId: url.searchParams.get("cityId"), parkId: url.searchParams.get("parkId") });
  if (cityScope instanceof NextResponse) return cityScope;
  const cityIdFilter = cityScope.cityId;
  const parkIdFilter = cityScope.parkId;

  const where: any = {};
  if (cityIdFilter) where.cityId = cityIdFilter;
  if (parkIdFilter) where.parkId = parkIdFilter;

  const adjustments = await db.financialAdjustment.findMany({
    where,
    include: {
      city: { select: { id: true, name: true, code: true } },
      park: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(adjustments);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("fees.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const cityScope = await resolveCityParkScope(user, { cityId: parsed.data.cityId, parkId: parsed.data.parkId });
  if (cityScope instanceof NextResponse) return cityScope;
  if (cityScope.parkId && parsed.data.parkId !== cityScope.parkId) return NextResponse.json({ error: "An explicit authorized park is required" }, { status: 403 });

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

  try {
  const adjustment = await db.$transaction(async tx => {
    const adjustment = await tx.financialAdjustment.create({
    data: {
      cityId: parsed.data.cityId,
      parkId: parsed.data.parkId || null,
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      reason: parsed.data.reason,
      approvedBy: user.id!,
      recordedBy: user.id!,
    },
    include: {
      city: { select: { id: true, name: true, code: true } },
      park: { select: { id: true, name: true } },
    },
  });



    await tx.auditLog.create({ data: createAuditLogData({
    userId: user.id!,
    action: "financial.adjustment.create",
    entityType: "financial_adjustment",
    entityId: adjustment.id,
    newValues: {
      cityId: adjustment.cityId,
      parkId: adjustment.parkId,
      type: adjustment.type,
      amount: adjustment.amount,
      category: adjustment.category,
      reason: adjustment.reason,
    },
    }) });
    return adjustment;
  });

  return NextResponse.json(adjustment, { status: 201 });
  } catch { return NextResponse.json({ error: "Operation could not be saved" }, { status: 503 }); }
}
