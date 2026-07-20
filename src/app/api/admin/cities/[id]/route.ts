import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const { id } = await params;

  const city = await db.city.findUnique({
    where: { id },
    include: { _count: { select: { parks: true } } },
  });
  if (!city)
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  return NextResponse.json(city);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const { id } = await params;

  const existing = await db.city.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "City not found" }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (data.code && data.code !== existing.code) {
    const dup = await db.city.findUnique({ where: { code: data.code } });
    if (dup)
      return NextResponse.json(
        { error: "A city with this code already exists" },
        { status: 409 }
      );
  }

  const old = {
    name: existing.name,
    code: existing.code,
    isActive: existing.isActive,
  };
  const updated = await db.city.update({ where: { id }, data });
  const auth = await requireAuth();
  if (!(auth instanceof NextResponse)) {
    await logAudit({
      userId: auth.user.id,
      action: "update",
      entityType: "city",
      entityId: id,
      oldValues: old,
      newValues: data,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const { id } = await params;

  const existing = await db.city.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "City not found" }, { status: 404 });

  await db.city.update({ where: { id }, data: { isActive: false } });
  const auth = await requireAuth();
  if (!(auth instanceof NextResponse)) {
    await logAudit({
      userId: auth.user.id,
      action: "delete",
      entityType: "city",
      entityId: id,
      oldValues: existing,
    });
  }

  return NextResponse.json({ success: true });
}
