import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const checkBadgesSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
});

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

  const parsed = checkBadgesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const student = await db.participant.findUnique({
    where: { id: parsed.data.studentId },
    include: {
      group: { include: { park: true } },
      unlockedBadges: { select: { badgeId: true } },
      pointTransactions: { select: { points: true } },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && student.group?.park?.cityId !== actorCity) {
    return NextResponse.json({ error: "Forbidden: Cannot evaluate badges for student outside city scope" }, { status: 403 });
  }

  const totalPoints = student.pointTransactions.reduce((acc, curr) => acc + curr.points, 0);
  const unlockedBadgeIds = new Set(student.unlockedBadges.map((b) => b.badgeId));

  const eligibleBadges = await db.badge.findMany({
    where: {
      requiredPoints: { lte: totalPoints },
      id: { notIn: Array.from(unlockedBadgeIds) },
    },
  });

  if (eligibleBadges.length === 0) {
    return NextResponse.json({
      studentId: student.id,
      totalPoints,
      newlyUnlockedCount: 0,
      newlyUnlockedBadges: [],
    });
  }

  const newlyUnlocked = await db.$transaction(async (tx) => {
    const created: any[] = [];
    for (const badge of eligibleBadges) {
      const unlocked = await tx.studentBadge.create({
        data: {
          studentId: student.id,
          badgeId: badge.id,
        },
        include: { badge: true },
      });
      created.push(unlocked.badge);
    }
    return created;
  });

  logAudit({
    userId: user.id!,
    action: "gamification.badge.auto_unlock",
    entityType: "student_badge",
    entityId: student.id,
    newValues: {
      studentId: student.id,
      unlockedBadgeCodes: newlyUnlocked.map((b) => b.code),
    },
  });

  return NextResponse.json({
    studentId: student.id,
    totalPoints,
    newlyUnlockedCount: newlyUnlocked.length,
    newlyUnlockedBadges: newlyUnlocked,
  });
}
