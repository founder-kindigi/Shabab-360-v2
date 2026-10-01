import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capAuth = await requireCapability("students.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  const { id } = await params;
  const student = await db.participant.findUnique({
    where: { id },
    include: { group: { include: { park: true } } },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && student.group?.park?.cityId !== actorCity) {
    return NextResponse.json({ error: "Forbidden: Cannot view student points outside city scope" }, { status: 403 });
  }

  const transactions = await db.pointTransaction.findMany({
    where: { studentId: id },
    orderBy: { createdAt: "desc" },
  });

  const totalPoints = transactions.reduce((acc, curr) => acc + curr.points, 0);

  return NextResponse.json({
    studentId: id,
    studentName: student.name,
    totalPoints,
    transactionCount: transactions.length,
    transactions,
  });
}
