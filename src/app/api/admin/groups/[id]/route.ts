import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
});

const HIERARCHY_MANAGER_ROLES = ["super_admin", "program_admin", "city_head"];

function canManageHierarchy(role?: string | null) {
  return HIERARCHY_MANAGER_ROLES.includes(role || "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("organisation.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const { id } = await params;

  const group = await db.group.findUnique({
    where: { id },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          cityId: true,
          park: {
            select: {
              id: true,
              name: true,
              city: { select: { id: true, name: true } },
            },
          },
        },
      },
      park: { select: { id: true, name: true, cityId: true } },
      _count: { select: { participants: true } },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(user, {
    cityId: group.batch.cityId ?? group.batch.park.city.id,
    parkId: group.parkId ?? group.batch.park.id,
    groupId: group.id,
  });
  if (scopeError) return scopeError;

  return NextResponse.json(group);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  if (!canManageHierarchy(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await db.group.findUnique({
    where: { id },
    include: { batch: { include: { park: true } }, park: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(
    user,
    { cityId: existing.batch.cityId ?? existing.batch.park.cityId, parkId: existing.parkId ?? existing.batch.parkId, groupId: existing.id }
  );
  if (scopeError) return scopeError;

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
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  if (!canManageHierarchy(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await db.group.findUnique({
    where: { id },
    include: { batch: { include: { park: true } }, park: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(
    user,
    { cityId: existing.batch.cityId ?? existing.batch.park.cityId, parkId: existing.parkId ?? existing.batch.parkId, groupId: existing.id }
  );
  if (scopeError) return scopeError;

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
