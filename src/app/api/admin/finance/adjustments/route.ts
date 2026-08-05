import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { z } from "zod";

const createAdjustmentSchema = z.object({
  cityId: z.string().min(1, "City ID is required"),
  parkId: z.string().optional(),
  type: z.enum(["credit", "debit"]),
  amount: z.number().finite().positive("Amount must be positive").refine(
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

  const actorCity = await resolveActorCity();
  if (actorCity && actorCity !== parsed.data.cityId) {
    return NextResponse.json({ error: "Forbidden: Cannot record adjustment for outside city scope" }, { status: 403 });
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

  const adjustment = await db.financialAdjustment.create({
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

  logAudit({
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
  });

  return NextResponse.json(adjustment, { status: 201 });
}
