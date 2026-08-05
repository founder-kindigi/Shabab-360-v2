import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().min(5, "Phone must be at least 5 characters").optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
  participantIds: z.array(z.string()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { id } = await params;

  const guardian = await db.guardian.findUnique({
    where: { id },
    include: {
      children: {
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              phone: true,
              state: true,
              group: { select: { id: true, name: true, batch: { select: { id: true, name: true, park: { select: { id: true, name: true } } } } } },
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  return NextResponse.json(guardian);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("guardians.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const existing = await db.guardian.findUnique({
    where: { id },
    include: { children: { select: { participantId: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, phone, cnic, address, isActive, participantIds } = parsed.data;

  // Update basic fields
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (cnic !== undefined) data.cnic = cnic || null;
  if (address !== undefined) data.address = address || null;
  if (isActive !== undefined) data.isActive = isActive;
  const revokeUserSession = isActive === false && existing.isActive && existing.userId;
  if (revokeUserSession) {
    data.user = { update: { tokenVersion: { increment: 1 } } };
  }

  // Update children links if participantIds provided
  if (participantIds !== undefined) {
    const currentIds = existing.children.map((c) => c.participantId);
    const toRemove = currentIds.filter((cid) => !participantIds.includes(cid));
    const toAdd = participantIds.filter((pid) => !currentIds.includes(pid));

    if (toRemove.length > 0) {
      await db.guardianChild.deleteMany({
        where: {
          guardianId: id,
          participantId: { in: toRemove },
        },
      });
    }

    if (toAdd.length > 0) {
      await db.guardianChild.createMany({
        data: toAdd.map((pid) => ({ guardianId: id, participantId: pid })),
      });
    }
  }

  const guardian = await db.guardian.update({
    where: { id },
    data,
  });

  await logAudit({
    userId: auth.user.id,
    action: "update",
    entityType: "guardian",
    entityId: id,
    oldValues: {
      name: existing.name,
      phone: existing.phone,
      isActive: existing.isActive,
    },
    newValues: data,
  });

  return NextResponse.json(guardian);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("guardians.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const existing = await db.guardian.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });
  }

  const guardian = await db.guardian.update({
    where: { id },
    data: {
      isActive: false,
      ...(existing.userId
        ? { user: { update: { tokenVersion: { increment: 1 } } } }
        : {}),
    },
  });

  await logAudit({
    userId: auth.user.id,
    action: "delete",
    entityType: "guardian",
    entityId: id,
    oldValues: { name: existing.name, isActive: existing.isActive },
    newValues: { isActive: false },
  });

  return NextResponse.json(guardian);
}
