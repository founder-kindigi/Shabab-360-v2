import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  feeType: z.enum(["tuition", "admission", "other"], {
    errorMap: () => ({ message: "Fee type must be tuition, admission, or other" }),
  }),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("cityId") || undefined;
  const parkId = searchParams.get("parkId") || undefined;
  const batchId = searchParams.get("batchId") || undefined;
  const feeType = searchParams.get("feeType") || undefined;
  const status = searchParams.get("status") || "active";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 20;

  // Build where clause
  const where: Record<string, unknown> = {};
  if (status === "active") where.isActive = true;
  if (batchId) where.batchId = batchId;
  if (parkId) where.batch = { parkId };
  if (cityId) where.batch = { park: { cityId } };
  if (feeType) where.feeType = feeType;

  // Combine park/city/batch filters
  const combinedWhere: Record<string, unknown> = {};
  if (status === "active") combinedWhere.isActive = true;
  if (feeType) combinedWhere.feeType = feeType;

  if (batchId) {
    combinedWhere.batchId = batchId;
  } else if (parkId) {
    combinedWhere.batch = { parkId };
  } else if (cityId) {
    combinedWhere.batch = { park: { cityId } };
  }

  const [feeEvents, total] = await Promise.all([
    db.feeEvent.findMany({
      where: combinedWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
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
        payments: {
          select: { id: true, amount: true },
        },
      },
    }),
    db.feeEvent.count({ where: combinedWhere }),
  ]);

  // Get participant counts for each batch
  const batchIds = [...new Set(feeEvents.map((f) => f.batchId))];
  const batchParticipantCounts = await db.group.findMany({
    where: { batchId: { in: batchIds }, isActive: true },
    select: {
      batchId: true,
      _count: { select: { participants: { where: { state: "active" } } } },
    },
  });

  const participantCountMap: Record<string, number> = {};
  for (const g of batchParticipantCounts) {
    participantCountMap[g.batchId] = (participantCountMap[g.batchId] || 0) + g._count.participants;
  }

  const now = new Date();

  const enriched = feeEvents.map((fe) => {
    const totalPaid = fe.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalParticipants = participantCountMap[fe.batchId] || 0;
    const totalExpected = fe.amount * totalParticipants;
    const paidCount = fe.payments.length;
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
      amount: fe.amount,
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

  // Summary stats (for all matching, not just page)
  const allFeeEvents = await db.feeEvent.findMany({
    where: { ...combinedWhere, isActive: true },
    include: {
      payments: { select: { id: true, amount: true } },
      batch: {
        select: {
          id: true,
          groups: {
            where: { isActive: true },
            select: {
              _count: { select: { participants: { where: { state: "active" } } } },
            },
          },
        },
      },
    },
  });

  let summaryTotalEvents = allFeeEvents.length;
  let summaryTotalExpected = 0;
  let summaryTotalCollected = 0;

  for (const fe of allFeeEvents) {
    const totalParts = fe.batch.groups.reduce(
      (sum, g) => sum + g._count.participants,
      0
    );
    summaryTotalExpected += fe.amount * totalParts;
    summaryTotalCollected += fe.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  return NextResponse.json({
    data: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
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

  return NextResponse.json(feeEvent, { status: 201 });
}