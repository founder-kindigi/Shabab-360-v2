import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireCapability,
  requireResourceScope,
} from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit, createAuditLogData } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().nullable().optional(),
  isActive: z.boolean().optional(),
});

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
  const { id } = await params;

  const existing = await db.batch.findUnique({
    where: { id },
    include: { park: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(user, {
    cityId: existing.cityId ?? existing.park.cityId,
    parkId: existing.parkId,
  });
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

  // Enforce one active batch per city if reactivating
  if (data.isActive === true && !existing.isActive) {
    const targetCityId = existing.cityId ?? existing.park.cityId;
    if (targetCityId) {
      const activeBatch = await db.batch.findFirst({
        where: {
          id: { not: id },
          isActive: true,
          OR: [
            { cityId: targetCityId },
            { park: { cityId: targetCityId } },
          ],
        },
        select: { id: true, name: true },
      });
      if (activeBatch) {
        return NextResponse.json(
          {
            error: `An active batch ("${activeBatch.name}") already exists for this city. Please deactivate it first.`,
          },
          { status: 400 }
        );
      }
    }
  }

  const old = {
    name: existing.name,
    startDate: existing.startDate,
    endDate: existing.endDate,
    isActive: existing.isActive,
  };

  try {
  const updated = await db.$transaction(async tx => {
    const updated = await tx.batch.update({ where: { id }, data });

  await tx.auditLog.create({ data: createAuditLogData({
    userId: user.id,
    action: "update",
    entityType: "batch",
    entityId: id,
    oldValues: old,
    newValues: parsed.data,
  }) });

    return updated;
  });
  return NextResponse.json(updated);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "An active batch already exists for this city" }, { status: 409 });
    return NextResponse.json({ error: "Batch could not be saved" }, { status: 503 });
  }
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
  const { id } = await params;

  const existing = await db.batch.findUnique({
    where: { id },
    include: { park: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(user, {
    cityId: existing.cityId ?? existing.park.cityId,
    parkId: existing.parkId,
  });
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
