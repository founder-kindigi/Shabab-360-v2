import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const awardPointsSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  points: z.number().int().refine((val) => val !== 0, "Points cannot be zero"),
  category: z.enum(["attendance", "participation", "quiz", "conduct", "manual_bonus"]),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("students.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  const actorCity = await resolveActorCity();
  const url = new URL(request.url);
  const studentIdFilter = url.searchParams.get("studentId");
  const categoryFilter = url.searchParams.get("category");

  const where: any = {};
  if (categoryFilter) where.category = categoryFilter;

  if (studentIdFilter) {
    const student = await db.participant.findUnique({
      where: { id: studentIdFilter },
      include: { group: { include: { park: true } } },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (actorCity && student.group?.park?.cityId !== actorCity) {
      return NextResponse.json({ error: "Forbidden: Cannot view points outside city scope" }, { status: 403 });
    }
    where.studentId = studentIdFilter;
  } else if (actorCity) {
    where.student = { group: { park: { cityId: actorCity } } };
  } else if (!["super_admin", "program_admin"].includes(user.role || "")) {
    return NextResponse.json({ error: "Student or city context is required" }, { status: 400 });
  }

  const transactions = await db.pointTransaction.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, groupId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(transactions);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("students.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = awardPointsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const student = await db.participant.findUnique({
    where: { id: parsed.data.studentId },
    include: { group: { include: { park: true } } },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && student.group?.park?.cityId !== actorCity) {
    return NextResponse.json({ error: "Forbidden: Cannot award points to student outside city scope" }, { status: 403 });
  }

  const transaction = await db.pointTransaction.create({
    data: {
      studentId: parsed.data.studentId,
      points: parsed.data.points,
      category: parsed.data.category,
      reason: parsed.data.reason,
      awardedBy: user.id!,
    },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  logAudit({
    userId: user.id!,
    action: "gamification.points.award",
    entityType: "point_transaction",
    entityId: transaction.id,
    newValues: {
      studentId: transaction.studentId,
      points: transaction.points,
      category: transaction.category,
      reason: transaction.reason,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
