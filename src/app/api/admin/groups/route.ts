import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  batchId: z.string().min(1, "Batch is required"),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId") || undefined;

  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");

  // Build where clause based on role
  let where: any = { isActive: true };

  if (isHQ) {
    if (batchId) where.batchId = batchId;
  } else if (user.role === "city_head" && user.assignedCityId) {
    where.batch = { park: { cityId: user.assignedCityId } };
    if (batchId) where.batchId = batchId;
  } else if (
    ["park_admin", "park_lead"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    where.batch = { parkId: user.assignedParkId };
    if (batchId) where.batchId = batchId;
  } else if (user.role === "murabbi" && user.assignedGroupId) {
    // Murabbi: only their own group
    where.id = user.assignedGroupId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await db.group.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          park: { select: { id: true, name: true } },
        },
      },
      _count: { select: { participants: true } },
    },
  });

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify batch access
  const batch = await db.batch.findUnique({
    where: { id: parsed.data.batchId, isActive: true },
    include: { park: true },
  });
  if (!batch) {
    return NextResponse.json(
      { error: "Batch not found" },
      { status: 404 }
    );
  }

  // Scope check
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (batch.park.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (
    !isHQ &&
    ["park_admin", "park_lead"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    if (batch.parkId !== user.assignedParkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (user.role === "murabbi") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (!isHQ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const group = await db.group.create({
    data: {
      name: parsed.data.name,
      batchId: parsed.data.batchId,
    },
  });

  await logAudit({
    userId: user.id,
    action: "create",
    entityType: "group",
    entityId: group.id,
    newValues: parsed.data,
  });

  return NextResponse.json(group, { status: 201 });
}