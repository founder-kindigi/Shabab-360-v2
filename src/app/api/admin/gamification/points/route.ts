import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireCapability,
  requireResourceScope,
  isHqRole,
  isStaffRole,
  resolveActorCity,
} from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { groupHierarchyInclude, requireResolvedGroupScope, resolveRequestedHierarchy, groupParkWhere } from "@/lib/auth/hierarchy";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("students.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  // This is an administrative ledger route. Students and guardians have
  // self-service views elsewhere and must never use a broad points listing.
  if (!isStaffRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorScope = await resolveRequestedHierarchy(user);
  if (actorScope instanceof NextResponse) return actorScope;
  const url = new URL(request.url);
  const studentIdFilter = url.searchParams.get("studentId");
  const categoryFilter = url.searchParams.get("category");

  const where: any = {};
  if (categoryFilter) where.category = categoryFilter;

  if (studentIdFilter) {
    const student = await db.participant.findUnique({
      where: { id: studentIdFilter },
      include: { group: { include: groupHierarchyInclude } },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const scopeError = requireResolvedGroupScope(user, student.group);
    if (scopeError) return scopeError;
    where.studentId = studentIdFilter;
  } else {
    where.student = { group: {
      ...(actorScope.groupId ? { id: actorScope.groupId } : {}),
      ...(actorScope.parkId ? groupParkWhere(actorScope.parkId) : actorScope.cityId ? { OR: [{ park: { cityId: actorScope.cityId } }, { parkId: null, batch: { park: { cityId: actorScope.cityId } } }] } : {}),
    } };
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
  // The approved role matrix has no point-award policy, value limits, or
  // correction workflow. Keep this write unavailable instead of reusing the
  // student self-profile capability as authority to change another student.
  return NextResponse.json(
    { error: "Point awards are unavailable until the approved staff award policy is implemented." },
    { status: 503 }
  );
}
