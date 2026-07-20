import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability, requireCityScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head"]);
  if (authError) return authError;

  const { id } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const park = await db.park.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true } },
      _count: { select: { batches: true } },
      batches: {
        select: {
          _count: { select: { groups: true } },
        },
      },
    },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  // city_head can only access parks in their own city
  if (auth.user.role === "city_head") {
    if (!requireCityScope(auth.user, park.cityId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { batches, ...parkData } = park;
  return NextResponse.json({
    ...parkData,
    _count: {
      ...park._count,
      groups: batches.reduce((total, batch) => total + batch._count.groups, 0),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head"]);
  if (authError) return authError;

  const { id } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const existing = await db.park.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  // city_head can only edit parks in their own city
  if (auth.user.role === "city_head") {
    if (!requireCityScope(auth.user, existing.cityId)) {
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

  const data = parsed.data;

  const old = {
    name: existing.name,
    address: existing.address,
    isActive: existing.isActive,
  };

  const updated = await db.park.update({ where: { id }, data });

  await logAudit({
    userId: auth.user.id,
    action: "update",
    entityType: "park",
    entityId: id,
    oldValues: old,
    newValues: data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { id } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const existing = await db.park.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  await db.park.update({ where: { id }, data: { isActive: false } });

  await logAudit({
    userId: auth.user.id,
    action: "delete",
    entityType: "park",
    entityId: id,
    oldValues: { name: existing.name, cityId: existing.cityId },
  });

  return NextResponse.json({ success: true });
}
