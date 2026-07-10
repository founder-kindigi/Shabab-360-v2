import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
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

  const group = await db.group.findUnique({
    where: { id },
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
      _count: { select: { participants: true } },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Scope check
  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (group.batch.park.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (
    !isHQ &&
    ["park_admin", "park_lead"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    if (group.batch.parkId !== user.assignedParkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (user.role === "murabbi" && user.assignedGroupId) {
    if (group.id !== user.assignedGroupId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(group);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id } = await params;

  const existing = await db.group.findUnique({
    where: { id },
    include: { batch: { include: { park: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Scope check
  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (existing.batch.park.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (
    !isHQ &&
    ["park_admin", "park_lead"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    if (existing.batch.parkId !== user.assignedParkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (user.role === "murabbi" && user.assignedGroupId) {
    if (existing.id !== user.assignedGroupId) {
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

  const old = {
    name: existing.name,
    isActive: existing.isActive,
  };

  const updated = await db.group.update({
    where: { id },
    data: parsed.data,
  });

  await logAudit({
    userId: user.id,
    action: "update",
    entityType: "group",
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

  const existing = await db.group.findUnique({
    where: { id },
    include: { batch: { include: { park: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Scope check
  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");
  if (!isHQ && user.role === "city_head" && user.assignedCityId) {
    if (existing.batch.park.cityId !== user.assignedCityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (
    !isHQ &&
    ["park_admin", "park_lead"].includes(user.role || "") &&
    user.assignedParkId
  ) {
    if (existing.batch.parkId !== user.assignedParkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.group.update({ where: { id }, data: { isActive: false } });

  await logAudit({
    userId: user.id,
    action: "delete",
    entityType: "group",
    entityId: id,
    oldValues: {
      name: existing.name,
      batchId: existing.batchId,
    },
  });

  return NextResponse.json({ success: true });
}