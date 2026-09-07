import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

const evaluationSchema = z.object({
  participantId: z.string().min(1),
  parkId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  discipline: z.number().int().min(0).max(10),
  farmabardari: z.number().int().min(0).max(10),
  islah: z.number().int().min(0).max(10),
  ibadah: z.number().int().min(0).max(10),
  participation: z.number().int().min(0).max(10),
  comment: z.string().min(10, "Comment must be at least 10 characters"),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parkId = searchParams.get("parkId");
  const month = parseInt(searchParams.get("month") || "0", 10);
  const year = parseInt(searchParams.get("year") || "0", 10);

  if (!parkId || !month || !year) {
    return NextResponse.json({ error: "Missing required query parameters" }, { status: 400 });
  }

  try {
    const batches = await db.batch.findMany({
      where: { parkId, isActive: true },
      select: { id: true },
    });
    
    const batchIds = batches.map(b => b.id);
    
    const groups = await db.group.findMany({
      where: { batchId: { in: batchIds }, isActive: true },
      select: { id: true },
    });
    
    const groupIds = groups.map(g => g.id);

    // Get participants with their evaluation for this month
    const participants = await db.participant.findMany({
      where: { groupId: { in: groupIds }, state: "active" },
      include: {
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
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = evaluationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    const evaluation = await db.studentEvaluation.upsert({
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
        murabbiUserId: user.id,
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

    return NextResponse.json({ evaluation }, { status: 201 });
  } catch (error) {
    console.error("POST /api/park/evaluations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
