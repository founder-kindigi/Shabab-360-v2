import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
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
const CITY_HEAD_MANAGEABLE_ROLES: StaffRole[] = ["park_admin", "park_lead", "murabbi"];

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
  const authError = await requireRole(["super_admin", "city_head"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user: currentUser } = auth;
  const isCityHead = currentUser.role === "city_head";
  const capabilityAuth = await requireCapability(
    isCityHead ? "access.city_staff.manage" : "access.scope.manage"
  );
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  if (isCityHead && !currentUser.assignedCityId) {
    return NextResponse.json({ error: "City Head scope is missing" }, { status: 403 });
  }

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

  // Get old values for validation and audit before accepting scope changes.
  const oldUser = await db.user.findUnique({
    where: { id },
    select: { name: true, email: true, phone: true, isActive: true, mustResetPwd: true },
  });
  if (!oldUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const oldMeta = await db.staffMeta.findUnique({
    where: { userId: id },
    select: {
      role: true, assignedCityId: true, assignedParkId: true, assignedGroupId: true, isActive: true,
      assignedPark: { select: { cityId: true } },
      assignedGroup: { select: { batch: { select: { park: { select: { cityId: true } } } } } },
    },
  });

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

  const hasStaffChanges =
    data.role !== undefined ||
    data.assignedCityId !== undefined ||
    data.assignedParkId !== undefined ||
    data.assignedGroupId !== undefined ||
    data.staffMetaIsActive !== undefined;
  const effectiveRole = data.role ?? oldMeta?.role;
  const nextScope = {
    cityId: data.assignedCityId === undefined ? oldMeta?.assignedCityId ?? null : data.assignedCityId,
    parkId: data.assignedParkId === undefined ? oldMeta?.assignedParkId ?? null : data.assignedParkId,
    groupId: data.assignedGroupId === undefined ? oldMeta?.assignedGroupId ?? null : data.assignedGroupId,
  };

  if (isCityHead) {
    const targetCityId = oldMeta?.assignedCityId
      ?? oldMeta?.assignedPark?.cityId
      ?? oldMeta?.assignedGroup?.batch.park.cityId;
    if (!oldMeta || !CITY_HEAD_MANAGEABLE_ROLES.includes(oldMeta.role as StaffRole) || targetCityId !== currentUser.assignedCityId) {
      return NextResponse.json({ error: "You can only manage staff in your assigned city" }, { status: 403 });
    }
    if (!effectiveRole || !CITY_HEAD_MANAGEABLE_ROLES.includes(effectiveRole as StaffRole)) {
      return NextResponse.json({ error: "City Heads can only assign Park Lead, Park Admin, or Murabbi roles" }, { status: 403 });
    }
    if (nextScope.cityId !== currentUser.assignedCityId) {
      return NextResponse.json({ error: "Staff must remain assigned to your city" }, { status: 403 });
    }
  }

  if (hasStaffChanges && !effectiveRole) {
    return NextResponse.json(
      { error: { role: ["A staff role is required when assigning staff access"] } },
      { status: 400 }
    );
  }

  if (effectiveRole && ["city_head", "park_admin", "park_lead", "murabbi"].includes(effectiveRole) && !nextScope.cityId) {
    return NextResponse.json(
      { error: { assignedCityId: ["City assignment is required for this role"] } },
      { status: 400 }
    );
  }

  if (effectiveRole && ["park_admin", "park_lead", "murabbi"].includes(effectiveRole) && !nextScope.parkId) {
    return NextResponse.json(
      { error: { assignedParkId: ["Park assignment is required for this role"] } },
      { status: 400 }
    );
  }

  if (effectiveRole === "murabbi" && !nextScope.groupId) {
    return NextResponse.json(
      { error: { assignedGroupId: ["Group assignment is required for murabbi role"] } },
      { status: 400 }
    );
  }

  if (nextScope.cityId) {
    const city = await db.city.findUnique({ where: { id: nextScope.cityId }, select: { id: true } });
    if (!city) {
      return NextResponse.json({ error: { assignedCityId: ["City not found"] } }, { status: 400 });
    }
  }

  if (nextScope.parkId) {
    const park = await db.park.findUnique({ where: { id: nextScope.parkId }, select: { cityId: true } });
    if (!park) {
      return NextResponse.json({ error: { assignedParkId: ["Park not found"] } }, { status: 400 });
    }
    if (nextScope.cityId && park.cityId !== nextScope.cityId) {
      return NextResponse.json(
        { error: { assignedParkId: ["Park must belong to the assigned city"] } },
        { status: 400 }
      );
    }
  }

  if (nextScope.groupId) {
    const group = await db.group.findUnique({
      where: { id: nextScope.groupId },
      select: { batch: { select: { parkId: true } } },
    });
    if (!group) {
      return NextResponse.json({ error: { assignedGroupId: ["Group not found"] } }, { status: 400 });
    }
    if (nextScope.parkId && group.batch.parkId !== nextScope.parkId) {
      return NextResponse.json(
        { error: { assignedGroupId: ["Group must belong to the assigned park"] } },
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

  // Update user fields
  const userData: any = {};
  if (data.name !== undefined) userData.name = data.name;
  if (data.email !== undefined) userData.email = data.email;
  if (data.phone !== undefined) userData.phone = data.phone;
  if (data.isActive !== undefined) userData.isActive = data.isActive;
  if (data.mustResetPwd !== undefined) userData.mustResetPwd = data.mustResetPwd;

  const shouldInvalidateSessions =
    hasStaffChanges ||
    (data.isActive !== undefined && data.isActive !== oldUser.isActive) ||
    (data.mustResetPwd !== undefined && data.mustResetPwd !== oldUser.mustResetPwd);

  await db.$transaction(async (tx) => {
    if (Object.keys(userData).length > 0 || shouldInvalidateSessions) {
      await tx.user.update({
        where: { id },
        data: {
          ...userData,
          ...(shouldInvalidateSessions ? { tokenVersion: { increment: 1 } } : {}),
        },
      });
    }

    if (hasStaffChanges) {
      await tx.staffMeta.upsert({
        where: { userId: id },
        update: {
          role: effectiveRole,
          assignedCityId: nextScope.cityId,
          assignedParkId: nextScope.parkId,
          assignedGroupId: nextScope.groupId,
          isActive: data.staffMetaIsActive ?? oldMeta?.isActive ?? true,
        },
        create: {
          userId: id,
          role: effectiveRole!,
          assignedCityId: nextScope.cityId,
          assignedParkId: nextScope.parkId,
          assignedGroupId: nextScope.groupId,
          isActive: data.staffMetaIsActive ?? true,
        },
      });
    }

    await tx.auditLog.create({
      data: createAuditLogData({
        userId: currentUser.id,
        action: "update",
        entityType: "user",
        entityId: id,
        oldValues: { ...oldUser, ...oldMeta },
        newValues: {
          ...userData,
          ...(hasStaffChanges ? { role: effectiveRole, ...nextScope } : {}),
          ...(shouldInvalidateSessions ? { sessionInvalidated: true } : {}),
        },
      }),
    });
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
  const authError = await requireRole(["super_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user: currentUser } = auth;
  const capabilityAuth = await requireCapability("access.scope.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

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

  // Soft-delete and revoke existing JWTs atomically.
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });

    await tx.staffMeta.updateMany({
      where: { userId: id },
      data: { isActive: false },
    });

    await tx.auditLog.create({
      data: createAuditLogData({
        userId: currentUser.id,
        action: "delete",
        entityType: "user",
        entityId: id,
        oldValues: { name: existingUser.name, email: existingUser.email },
      }),
    });
  });

  return NextResponse.json({ success: true });
}
