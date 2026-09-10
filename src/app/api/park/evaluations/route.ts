import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveRequestedHierarchy, groupHierarchyInclude, groupResourceScope, groupParkWhere } from "@/lib/auth/hierarchy";
import { createAuditLogData } from "@/lib/audit";
import { z } from "zod";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const evaluationSchema = z.object({
  participantId: z.string().trim().min(1).max(128),
  parkId: z.string().trim().min(1).max(128),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  discipline: z.number().int().min(0).max(10),
  farmabardari: z.number().int().min(0).max(10),
  islah: z.number().int().min(0).max(10),
  ibadah: z.number().int().min(0).max(10),
  participation: z.number().int().min(0).max(10),
  comment: z.string().trim().min(10, "Comment must be at least 10 characters").max(2000),
});

export async function GET(request: Request) {
  const auth = await requireCapability("students.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const allowedRoles = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parkId = searchParams.get("parkId");
  const month = Number(searchParams.get("month") || "0");
  const year = Number(searchParams.get("year") || "0");

  if (!parkId || month < 1 || month > 12 || year < 2000 || year > 2100 || !Number.isInteger(month) || !Number.isInteger(year)) {
    return NextResponse.json({ error: "Missing required query parameters" }, { status: 400 });
  }

  try {
    const scope = await resolveRequestedHierarchy(user, { parkId });
    if (scope instanceof NextResponse) return scope;
    const groups = await db.group.findMany({
      where: { ...groupParkWhere(parkId), ...(scope.groupId ? { id: scope.groupId } : {}), batch: { isActive: true }, isActive: true },
      select: { id: true },
    });
    
    const groupIds = groups.map(g => g.id);

    // Get participants with their evaluation for this month
    const participants = await db.participant.findMany({
      where: { groupId: { in: groupIds }, state: "active" },
      select: {
        id: true, name: true, groupId: true,
        group: { select: { name: true } },
        evaluations: {
          where: { month, year },
        }
      }
    });

    return NextResponse.json({ participants });
  } catch (error) {
    console.error("GET /api/park/evaluations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCapability("students.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const allowedRoles = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const result = evaluationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    return await db.$transaction(async (tx) => {
    const participant = await tx.participant.findUnique({ where: { id: data.participantId }, include: { group: { include: groupHierarchyInclude } } });
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    const linked = groupResourceScope(participant.group);
    if (!linked || linked.parkId !== data.parkId) return NextResponse.json({ error: "Participant does not belong to the selected park" }, { status: 403 });
    const scope = await resolveRequestedHierarchy(user, linked, tx);
    if (scope instanceof NextResponse) return scope;
    const evaluation = await tx.studentEvaluation.upsert({
      where: {
        participantId_month_year: {
          participantId: data.participantId,
          month: data.month,
          year: data.year,
        }
      },
      update: {
        discipline: data.discipline,
        farmabardari: data.farmabardari,
        islah: data.islah,
        ibadah: data.ibadah,
        participation: data.participation,
        comment: data.comment,
      },
      create: {
        participantId: data.participantId,
        murabbiUserId: user.id!,
        parkId: data.parkId,
        month: data.month,
        year: data.year,
        discipline: data.discipline,
        farmabardari: data.farmabardari,
        islah: data.islah,
        ibadah: data.ibadah,
        participation: data.participation,
        comment: data.comment,
      },
    });

    await tx.auditLog.create({ data: createAuditLogData({ userId: user.id, action: "student.evaluation.save", entityType: "StudentEvaluation", entityId: evaluation.id, newValues: { participantId: data.participantId, month: data.month, year: data.year } }) });
    return NextResponse.json({ evaluation }, { status: 201 });
    });
  } catch (error) {
    console.error("POST /api/park/evaluations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
