import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id } = await params;

  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      park: {
        select: {
          id: true,
          name: true,
          city: { select: { id: true, name: true } },
        },
      },
      _count: { select: { groups: true } },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  // Scope check
  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (batch.park.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (
    !isHQ &&
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    if (batch.parkId !== user.assignedParkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(batch);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id } = await params;

  const existing = await db.batch.findUnique({
    where: { id },
    include: { park: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  // Scope check
  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (existing.park.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (
    !isHQ &&
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    if (existing.parkId !== user.assignedParkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data: any = { ...parsed.data };
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) {
    data.endDate = data.endDate ? new Date(data.endDate) : null;
  }

  const old = {
    name: existing.name,
    startDate: existing.startDate,
    endDate: existing.endDate,
    isActive: existing.isActive,
  };

  const updated = await db.batch.update({ where: { id }, data });

  await logAudit({
    userId: user.id,
    action: "update",
    entityType: "batch",
    entityId: id,
    oldValues: old,
    newValues: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id } = await params;

  const existing = await db.batch.findUnique({
    where: { id },
    include: { park: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  // Scope check
  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (existing.park.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (
    !isHQ &&
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    if (existing.parkId !== user.assignedParkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.batch.update({ where: { id }, data: { isActive: false } });

  await logAudit({
    userId: user.id,
    action: "delete",
    entityType: "batch",
    entityId: id,
    oldValues: {
      name: existing.name,
      parkId: existing.parkId,
    },
  });

  return NextResponse.json({ success: true });
}