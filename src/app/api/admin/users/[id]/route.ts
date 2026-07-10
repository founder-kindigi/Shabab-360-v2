import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { StaffRole } from "@/types";

const VALID_ROLES: StaffRole[] = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
];

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  mustResetPwd: z.boolean().optional(),
  // StaffMeta fields
  role: z.enum(VALID_ROLES).optional(),
  assignedCityId: z.string().nullable().optional(),
  assignedParkId: z.string().nullable().optional(),
  assignedGroupId: z.string().nullable().optional(),
  staffMetaIsActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user: currentUser } = auth;

  const { id } = await params;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Check email uniqueness if changing
  if (data.email) {
    const existing = await db.user.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
  }

  // Validate role-based assignments
  const effectiveRole = data.role;
  if (effectiveRole && ["city_head", "park_admin", "park_lead", "murabbi"].includes(effectiveRole)) {
    if (!data.assignedCityId && data.assignedCityId !== null) {
      // If they have a city-requiring role but no city assignment, check existing
      const existingMeta = await db.staffMeta.findUnique({ where: { userId: id } });
      if (!existingMeta?.assignedCityId && data.assignedCityId === undefined) {
        return NextResponse.json(
          { error: { assignedCityId: ["City assignment is required for this role"] } },
          { status: 400 }
        );
      }
    }
  }

  if (effectiveRole && ["park_admin", "park_lead", "murabbi"].includes(effectiveRole)) {
    if (!data.assignedParkId && data.assignedParkId !== null) {
      const existingMeta = await db.staffMeta.findUnique({ where: { userId: id } });
      if (!existingMeta?.assignedParkId && data.assignedParkId === undefined) {
        return NextResponse.json(
          { error: { assignedParkId: ["Park assignment is required for this role"] } },
          { status: 400 }
        );
      }
    }
  }

  if (effectiveRole === "murabbi" && !data.assignedGroupId && data.assignedGroupId !== null) {
    const existingMeta = await db.staffMeta.findUnique({ where: { userId: id } });
    if (!existingMeta?.assignedGroupId && data.assignedGroupId === undefined) {
      return NextResponse.json(
        { error: { assignedGroupId: ["Group assignment is required for murabbi role"] } },
        { status: 400 }
      );
    }
  }

  // Prevent self-deactivation
  if (data.isActive === false && currentUser.id === id) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account" },
      { status: 400 }
    );
  }

  // Get old values for audit
  const oldUser = await db.user.findUnique({
    where: { id },
    select: { name: true, email: true, phone: true, isActive: true, mustResetPwd: true },
  });
  const oldMeta = await db.staffMeta.findUnique({
    where: { userId: id },
    select: { role: true, assignedCityId: true, assignedParkId: true, assignedGroupId: true, isActive: true },
  });

  // Update user fields
  const userData: any = {};
  if (data.name !== undefined) userData.name = data.name;
  if (data.email !== undefined) userData.email = data.email;
  if (data.phone !== undefined) userData.phone = data.phone;
  if (data.isActive !== undefined) userData.isActive = data.isActive;
  if (data.mustResetPwd !== undefined) userData.mustResetPwd = data.mustResetPwd;

  if (Object.keys(userData).length > 0) {
    await db.user.update({ where: { id }, data: userData });
  }

  // Upsert staffMeta
  const hasStaffChanges =
    data.role !== undefined ||
    data.assignedCityId !== undefined ||
    data.assignedParkId !== undefined ||
    data.assignedGroupId !== undefined ||
    data.staffMetaIsActive !== undefined;

  if (hasStaffChanges) {
    const staffData: any = {};
    if (data.role !== undefined) staffData.role = data.role;
    if (data.assignedCityId !== undefined) staffData.assignedCityId = data.assignedCityId;
    if (data.assignedParkId !== undefined) staffData.assignedParkId = data.assignedParkId;
    if (data.assignedGroupId !== undefined) staffData.assignedGroupId = data.assignedGroupId;
    if (data.staffMetaIsActive !== undefined) staffData.isActive = data.staffMetaIsActive;

    await db.staffMeta.upsert({
      where: { userId: id },
      update: staffData,
      create: {
        userId: id,
        role: data.role || "park_lead",
        assignedCityId: data.assignedCityId ?? null,
        assignedParkId: data.assignedParkId ?? null,
        assignedGroupId: data.assignedGroupId ?? null,
        isActive: data.staffMetaIsActive ?? true,
      },
    });
  }

  // Fire audit log
  await logAudit({
    userId: currentUser.id,
    action: "update",
    entityType: "user",
    entityId: id,
    oldValues: { ...oldUser, ...oldMeta },
    newValues: { ...userData, ...(hasStaffChanges ? { role: data.role, assignedCityId: data.assignedCityId, assignedParkId: data.assignedParkId, assignedGroupId: data.assignedGroupId } : {}) },
  });

  // Return updated user
  const updatedUser = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      mustResetPwd: true,
      createdAt: true,
      staffMeta: {
        select: {
          id: true,
          role: true,
          assignedCityId: true,
          assignedParkId: true,
          assignedGroupId: true,
          isActive: true,
          assignedCity: { select: { id: true, name: true } },
          assignedPark: { select: { id: true, name: true } },
          assignedGroup: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(updatedUser);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user: currentUser } = auth;

  const { id } = await params;

  // Prevent self-deletion
  if (currentUser.id === id) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account" },
      { status: 400 }
    );
  }

  const existingUser = await db.user.findUnique({ where: { id } });
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Soft-delete: deactivate user and staffMeta
  await db.user.update({
    where: { id },
    data: { isActive: false },
  });

  await db.staffMeta.updateMany({
    where: { userId: id },
    data: { isActive: false },
  });

  // Fire audit log
  await logAudit({
    userId: currentUser.id,
    action: "delete",
    entityType: "user",
    entityId: id,
    oldValues: { name: existingUser.name, email: existingUser.email },
  });

  return NextResponse.json({ success: true });
}