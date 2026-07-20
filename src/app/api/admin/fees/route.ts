import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  optionalIdentifier,
  paginatedQuerySchema,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { moneyToNumber } from "@/lib/money";

const createSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  feeType: z.enum(["tuition", "admission", "other"]),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().optional(),
});

const listSchema = paginatedQuerySchema({ defaultPageSize: 20 }).extend({
  cityId: optionalIdentifier(),
  parkId: optionalIdentifier(),
  batchId: optionalIdentifier(),
  feeType: z.enum(["tuition", "admission", "other"]).optional(),
  status: z.enum(["active", "all"]).default("active"),
});

function buildFeeEventWhere(filters: z.infer<typeof listSchema>): Prisma.FeeEventWhereInput {
  const where: Prisma.FeeEventWhereInput = {};

  if (filters.status === "active") where.isActive = true;
  if (filters.batchId) where.batchId = filters.batchId;
  if (filters.feeType) where.feeType = filters.feeType;

  if (filters.cityId || filters.parkId) {
    where.batch = {
      park: {
        ...(filters.cityId ? { cityId: filters.cityId } : {}),
        ...(filters.parkId ? { id: filters.parkId } : {}),
      },
    };
  }

  return where;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("fees.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = listSchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }

  const { page, pageSize: limit } = parsedQuery.data;
  const feeEventWhere = buildFeeEventWhere(parsedQuery.data);

  // Keep page data bounded and let the database aggregate all matching totals.
  const [feeEvents, feeEventSummary, paymentSummary] = await Promise.all([
    db.feeEvent.findMany({
      where: feeEventWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        batchId: true,
        title: true,
        feeType: true,
        amount: true,
        dueDate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        batch: {
          select: {
            id: true,
            name: true,
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
    }),
    db.feeEvent.groupBy({
      by: ["batchId"],
      where: feeEventWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { feeEvent: { is: feeEventWhere } },
      _sum: { amount: true },
    }),
  ]);

  const feeEventIds = feeEvents.map((feeEvent) => feeEvent.id);
  const batchIds = [
    ...new Set([
      ...feeEvents.map((feeEvent) => feeEvent.batchId),
      ...feeEventSummary.map((summary) => summary.batchId),
    ]),
  ];

  const [batchParticipantCounts, pagePaymentTotals] = await Promise.all([
    batchIds.length > 0
      ? db.group.findMany({
          where: { batchId: { in: batchIds }, isActive: true },
          select: {
            batchId: true,
            _count: { select: { participants: { where: { state: "active" } } } },
          },
        })
      : Promise.resolve([]),
    feeEventIds.length > 0
      ? db.payment.groupBy({
          by: ["feeEventId"],
          where: { feeEventId: { in: feeEventIds } },
          _count: { _all: true },
          _sum: { amount: true },
        })
      : Promise.resolve([]),
  ]);

  const participantCountMap: Record<string, number> = {};
  for (const g of batchParticipantCounts) {
    participantCountMap[g.batchId] = (participantCountMap[g.batchId] || 0) + g._count.participants;
  }

  const paymentTotals = new Map<string, { totalPaid: number; paidCount: number }>(
    pagePaymentTotals.map((payment): [string, { totalPaid: number; paidCount: number }] => [
      payment.feeEventId,
      { totalPaid: moneyToNumber(payment._sum.amount), paidCount: payment._count._all },
    ])
  );

  const now = new Date();

  const enriched = feeEvents.map((fe) => {
    const paymentTotal = paymentTotals.get(fe.id);
    const totalPaid = paymentTotal?.totalPaid || 0;
    const totalParticipants = participantCountMap[fe.batchId] || 0;
    const amount = moneyToNumber(fe.amount);
    const totalExpected = amount * totalParticipants;
    const paidCount = paymentTotal?.paidCount || 0;
    const rate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

    let dueDateStatus: "overdue" | "upcoming" | "paid" | "none" = "none";
    if (fe.dueDate) {
      if (rate >= 100) {
        dueDateStatus = "paid";
      } else if (fe.dueDate < now) {
        dueDateStatus = "overdue";
      } else {
        const daysUntil = Math.ceil((fe.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 7) {
          dueDateStatus = "upcoming";
        } else {
          dueDateStatus = "none";
        }
      }
    }

    return {
      id: fe.id,
      batchId: fe.batchId,
      title: fe.title,
      feeType: fe.feeType,
      amount,
      dueDate: fe.dueDate,
      isActive: fe.isActive,
      createdAt: fe.createdAt,
      updatedAt: fe.updatedAt,
      batch: fe.batch,
      totalPaid,
      totalExpected,
      paidCount,
      totalParticipants,
      rate: Math.round(rate * 100) / 100,
      dueDateStatus,
    };
  });

  const summaryTotalEvents = feeEventSummary.reduce(
    (total, summary) => total + summary._count._all,
    0
  );
  let summaryTotalExpected = 0;
  for (const summary of feeEventSummary) {
    summaryTotalExpected +=
      moneyToNumber(summary._sum.amount) * (participantCountMap[summary.batchId] || 0);
  }
  const summaryTotalCollected = moneyToNumber(paymentSummary._sum.amount);

  return NextResponse.json({
    data: enriched,
    pagination: {
      page,
      limit,
      total: summaryTotalEvents,
      totalPages: Math.ceil(summaryTotalEvents / limit),
    },
    summary: {
      totalFeeEvents: summaryTotalEvents,
      totalExpected: summaryTotalExpected,
      totalCollected: summaryTotalCollected,
      collectionRate:
        summaryTotalExpected > 0
          ? Math.round((summaryTotalCollected / summaryTotalExpected) * 10000) / 100
          : 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("fees.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify batch exists
  const batch = await db.batch.findUnique({
    where: { id: parsed.data.batchId, isActive: true },
  });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const feeEvent = await db.feeEvent.create({
    data: {
      batchId: parsed.data.batchId,
      title: parsed.data.title,
      feeType: parsed.data.feeType,
      amount: parsed.data.amount,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "fee_event",
    entityId: feeEvent.id,
    newValues: parsed.data,
  });

  return NextResponse.json(
    { ...feeEvent, amount: moneyToNumber(feeEvent.amount) },
    { status: 201 }
  );
}
