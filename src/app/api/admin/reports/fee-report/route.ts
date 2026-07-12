import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { PKT, toZonedTime, formatPKT } from "@/lib/timezone";
import { startOfMonth, subMonths, parseISO, isAfter, isBefore, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("cityId") || undefined;
  const parkId = searchParams.get("parkId") || undefined;
  const fromStr = searchParams.get("from") || undefined;
  const toStr = searchParams.get("to") || undefined;
  const groupBy = searchParams.get("groupBy") || "month"; // month | method | type

  // Parse date range
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (fromStr) {
    startDate = parseISO(fromStr);
  } else {
    // Default: last 12 months
    const now = toZonedTime(new Date(), PKT);
    startDate = subMonths(startOfMonth(now), 11);
  }

  if (toStr) {
    endDate = endOfMonth(parseISO(toStr));
  } else {
    endDate = new Date();
  }

  // Build where clause for payments
  const paymentWhere: Record<string, unknown> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (parkId) {
    paymentWhere.feeEvent = { batch: { parkId } };
  } else if (cityId) {
    paymentWhere.feeEvent = { batch: { park: { cityId } } };
  }

  // Fetch payments with fee event info
  const payments = await db.payment.findMany({
    where: paymentWhere,
    select: {
      id: true,
      amount: true,
      method: true,
      createdAt: true,
      feeEvent: {
        select: {
          feeType: true,
          batch: {
            select: {
              id: true,
              park: {
                select: {
                  id: true,
                  name: true,
                  city: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Calculate totals
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Compute pending and overdue from fee events
  const feeEventWhere: Record<string, unknown> = { isActive: true };
  if (parkId) {
    feeEventWhere.batch = { parkId };
  } else if (cityId) {
    feeEventWhere.batch = { park: { cityId } };
  }

  const feeEvents = await db.feeEvent.findMany({
    where: feeEventWhere,
    select: {
      id: true,
      amount: true,
      feeType: true,
      dueDate: true,
      _count: { select: { payments: true } },
      payments: { select: { amount: true } },
    },
  });

  let totalPending = 0;
  let totalOverdue = 0;
  const nowPKT = toZonedTime(new Date(), PKT);

  for (const fe of feeEvents) {
    const collected = fe.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(fe.amount) - collected;
    if (remaining > 0) {
      if (fe.dueDate && isBefore(new Date(fe.dueDate), nowPKT)) {
        totalOverdue += remaining;
      } else {
        totalPending += remaining;
      }
    }
  }

  // Group data based on groupBy parameter
  let groupedData: Array<Record<string, unknown>> = [];

  if (groupBy === "month") {
    const monthMap = new Map<string, { month: string; collected: number; count: number }>();

    for (const p of payments) {
      const pDate = toZonedTime(p.createdAt, PKT);
      const key = formatPKT(pDate, "yyyy-MM");
      const label = formatPKT(pDate, "MMM yyyy");

      const existing = monthMap.get(key) || { month: label, collected: 0, count: 0 };
      existing.collected += Number(p.amount);
      existing.count += 1;
      monthMap.set(key, existing);
    }

    groupedData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: v.month,
        value: Math.round(v.collected),
        count: v.count,
      }));
  } else if (groupBy === "method") {
    const methodMap = new Map<string, number>();

    for (const p of payments) {
      const method = p.method || "other";
      methodMap.set(method, (methodMap.get(method) || 0) + Number(p.amount));
    }

    const METHOD_LABELS: Record<string, string> = {
      cash: "Cash",
      bank: "Bank Transfer",
      online: "Online",
      other: "Other",
    };

    groupedData = Array.from(methodMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([method, amount]) => ({
        label: METHOD_LABELS[method] || method,
        value: Math.round(amount),
        key: method,
      }));
  } else if (groupBy === "type") {
    const typeMap = new Map<string, number>();

    for (const p of payments) {
      const feeType = p.feeEvent?.feeType || "other";
      typeMap.set(feeType, (typeMap.get(feeType) || 0) + Number(p.amount));
    }

    const TYPE_LABELS: Record<string, string> = {
      tuition: "Tuition",
      admission: "Admission Fee",
      other: "Other",
    };

    groupedData = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, amount]) => ({
        label: TYPE_LABELS[type] || type,
        value: Math.round(amount),
        key: type,
      }));
  }

  // Previous period comparison (same duration, period before)
  const periodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const prevStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(startDate.getTime() - 1);

  const prevPayments = await db.payment.findMany({
    where: {
      createdAt: { gte: prevStart, lte: prevEnd },
      ...(parkId ? { feeEvent: { batch: { parkId } } } : {}),
      ...(cityId && !parkId ? { feeEvent: { batch: { park: { cityId } } } } : {}),
    },
    select: { amount: true },
  });
  const prevTotal = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const changePercent = prevTotal > 0
    ? Math.round(((totalCollected - prevTotal) / prevTotal) * 100)
    : totalCollected > 0 ? 100 : 0;

  return NextResponse.json({
    summary: {
      totalCollected: Math.round(totalCollected),
      totalPending: Math.round(totalPending),
      totalOverdue: Math.round(totalOverdue),
      previousPeriod: Math.round(prevTotal),
      changePercent,
    },
    groupedBy: groupBy,
    data: groupedData,
    currency: "PKR",
  });
}