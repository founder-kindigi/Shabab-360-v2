import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createDonationSchema = z.object({
  cityId: z.string().min(1, "City ID is required"),
  parkId: z.string().optional(),
  donorName: z.string().trim().min(2, "Donor name must be at least 2 characters"),
  donorPhone: z.string().trim().optional(),
  amount: z.number().finite().positive("Amount must be positive").refine(
    (val) => toCents(val) !== null,
    "Amount can have at most two decimal places"
  ),
  method: z.enum(["cash", "bank", "online", "other"]),
  purpose: z.string().trim().max(500).optional(),
});

async function generateDonationReceiptNo(
  tx: Prisma.TransactionClient,
  prefix: string = "DON"
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

  const donations = await db.feeDonation.findMany({
    where,
    include: {
      city: { select: { id: true, name: true, code: true } },
      park: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(donations);
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

  const parsed = createDonationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && actorCity !== parsed.data.cityId) {
    return NextResponse.json({ error: "Forbidden: Cannot record donation for outside city scope" }, { status: 403 });
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

  const donation = await db.$transaction(async (tx) => {
    const receiptNo = await generateDonationReceiptNo(tx);
    return tx.feeDonation.create({
      data: {
        cityId: parsed.data.cityId,
        parkId: parsed.data.parkId || null,
        donorName: parsed.data.donorName,
        donorPhone: parsed.data.donorPhone || null,
        amount: parsed.data.amount,
        method: parsed.data.method,
        receiptNo,
        purpose: parsed.data.purpose || null,
        recordedBy: user.id!,
      },
      include: {
        city: { select: { id: true, name: true, code: true } },
        park: { select: { id: true, name: true } },
      },
    });
  });

  logAudit({
    userId: user.id!,
    action: "financial.donation.create",
    entityType: "fee_donation",
    entityId: donation.id,
    newValues: {
      cityId: donation.cityId,
      parkId: donation.parkId,
      amount: donation.amount,
      receiptNo: donation.receiptNo,
      donorName: donation.donorName,
    },
  });

  return NextResponse.json(donation, { status: 201 });
}
