import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { fromCents, moneyToNumber, roundToCents, toCents } from "@/lib/money";

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

  // 1. Fee Payments Total
  const paymentsWhere: any = {};
  if (cityIdFilter) paymentsWhere.feeEvent = { batch: { park: { cityId: cityIdFilter } } };
  if (parkIdFilter) paymentsWhere.feeEvent = { batch: { parkId: parkIdFilter } };

  const payments = await db.payment.findMany({
    where: paymentsWhere,
    select: { amount: true, waivedAmount: true },
  });

  let totalPaymentsCents = 0;
  let totalWaiversCents = 0;
  for (const p of payments) {
    totalPaymentsCents += toCents(moneyToNumber(p.amount)) || 0;
    totalWaiversCents += toCents(moneyToNumber(p.waivedAmount)) || 0;
  }

  // 2. Donations Total
  const donationsWhere: any = {};
  if (cityIdFilter) donationsWhere.cityId = cityIdFilter;
  if (parkIdFilter) donationsWhere.parkId = parkIdFilter;

  const donations = await db.feeDonation.findMany({
    where: donationsWhere,
    select: { amount: true },
  });

  let totalDonationsCents = 0;
  for (const d of donations) {
    totalDonationsCents += toCents(moneyToNumber(d.amount)) || 0;
  }

  // 3. Financial Adjustments Total (Credits & Debits)
  const adjustmentsWhere: any = {};
  if (cityIdFilter) adjustmentsWhere.cityId = cityIdFilter;
  if (parkIdFilter) adjustmentsWhere.parkId = parkIdFilter;

  const adjustments = await db.financialAdjustment.findMany({
    where: adjustmentsWhere,
    select: { type: true, amount: true },
  });

  let totalCreditsCents = 0;
  let totalDebitsCents = 0;
  for (const a of adjustments) {
    const cents = toCents(moneyToNumber(a.amount)) || 0;
    if (a.type === "credit") totalCreditsCents += cents;
    else totalDebitsCents += cents;
  }

  // 4. Procurement Purchase Orders Total
  const ordersWhere: any = {};
  if (cityIdFilter) ordersWhere.cityId = cityIdFilter;
  if (parkIdFilter) ordersWhere.parkId = parkIdFilter;

  const orders = await db.purchaseOrder.findMany({
    where: ordersWhere,
    select: { totalCost: true, status: true },
  });

  let totalProcurementCents = 0;
  for (const o of orders) {
    if (o.status !== "cancelled") {
      totalProcurementCents += toCents(moneyToNumber(o.totalCost)) || 0;
    }
  }

  // 5. Net Reconciled Balance Calculations (Exact Decimal Math)
  const grossRevenueCents = totalPaymentsCents + totalDonationsCents + totalCreditsCents;
  const grossExpensesCents = totalDebitsCents + totalProcurementCents;
  const netBalanceCents = grossRevenueCents - grossExpensesCents;

  return NextResponse.json({
    currency: "PKR",
    summary: {
      feesCollected: fromCents(totalPaymentsCents),
      feeWaivers: fromCents(totalWaiversCents),
      donationsCollected: fromCents(totalDonationsCents),
      creditsAdjusted: fromCents(totalCreditsCents),
      debitsAdjusted: fromCents(totalDebitsCents),
      procurementExpenses: fromCents(totalProcurementCents),
      grossRevenue: fromCents(grossRevenueCents),
      grossExpenses: fromCents(grossExpensesCents),
      netBalance: fromCents(netBalanceCents),
    },
    filter: {
      cityId: cityIdFilter || null,
      parkId: parkIdFilter || null,
    },
  });
}
