import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().nullable().optional(),
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
      city: { select: { id: true, name: true } },
      _count: { select: { groups: true } },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(
    user,
    { cityId: batch.cityId ?? batch.park.city.id }
  );
  if (scopeError) return scopeError;

  return NextResponse.json(batch);
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

  const existing = await db.batch.findUnique({
    where: { id },
    include: { park: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(
    user,
    { cityId: existing.cityId ?? existing.park.cityId }
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

  const data: any = { ...parsed.data };
  const updatedStartDate = data.startDate ? new Date(data.startDate) : existing.startDate;
  const updatedEndDate = data.endDate === undefined
    ? existing.endDate
    : data.endDate ? new Date(data.endDate) : null;
  if (updatedEndDate && updatedEndDate < updatedStartDate) {
    return NextResponse.json({ error: { endDate: ["End date must be on or after the start date"] } }, { status: 400 });
  }
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
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  if (!canManageHierarchy(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await db.batch.findUnique({
    where: { id },
    include: { park: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(
    user,
    { cityId: existing.cityId ?? existing.park.cityId }
  );
  if (scopeError) return scopeError;

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
