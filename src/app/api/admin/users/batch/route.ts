import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import type { StaffRole } from "@/types";

const VALID_ROLES: StaffRole[] = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
];

const batchSchema = z.object({
  action: z.enum(["activate", "deactivate", "reset-password", "assign-role"]),
  userIds: z.array(z.string().min(1)).min(1, "At least 1 user ID is required").max(100),
  role: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("access.scope.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { action, role } = parsed.data;
  const userIds = [...new Set(parsed.data.userIds)];

  // Validate all IDs exist
  const existing = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  });

  const existingIds = new Set(existing.map((u) => u.id));
  const invalidIds = userIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Users not found: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  // For assign-role, validate the role
  if (action === "assign-role") {
    if (!role || !VALID_ROLES.includes(role as StaffRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }
  }

  try {
    let success = 0;

    if (action === "activate" || action === "deactivate") {
      const isActive = action === "activate";
      const result = await db.$transaction((tx) => tx.user.updateMany({
        where: { id: { in: userIds } },
        // Invalidate every active session when the account state changes.
        data: { isActive, tokenVersion: { increment: 1 } },
      }));
      success = result.count;

      for (const id of userIds) {
        await logAudit({
          userId: auth.user.id,
          action: `batch-${action}`,
          entityType: "user",
          entityId: id,
          newValues: { isActive },
        });
      }
    } else if (action === "reset-password") {
      const result = await db.$transaction((tx) => tx.user.updateMany({
        where: { id: { in: userIds } },
        // A current JWT must not survive a newly required password reset.
        data: { mustResetPwd: true, tokenVersion: { increment: 1 } },
      }));
      success = result.count;

      for (const id of userIds) {
        await logAudit({
          userId: auth.user.id,
          action: "batch-reset-password",
          entityType: "user",
          entityId: id,
          newValues: { mustResetPwd: true },
        });
      }
    } else if (action === "assign-role") {
      const staffMetas = await db.$transaction(async (tx) => {
        const currentStaffMetas = await tx.staffMeta.findMany({
          where: { userId: { in: userIds } },
          select: { id: true, userId: true },
        });
        const staffMetaUserIds = new Set(currentStaffMetas.map((staffMeta) => staffMeta.userId));
        const usersWithoutMeta = userIds.filter((id) => !staffMetaUserIds.has(id));

        if (currentStaffMetas.length > 0) {
          await tx.staffMeta.updateMany({
            where: { userId: { in: userIds } },
            data: { role: role! },
          });
        }
        if (usersWithoutMeta.length > 0) {
          await tx.staffMeta.createMany({
            data: usersWithoutMeta.map((userId) => ({ userId, role: role! })),
          });
        }
        await tx.user.updateMany({
          where: { id: { in: userIds } },
          data: { tokenVersion: { increment: 1 } },
        });

        return currentStaffMetas;
      });
      success = userIds.length;

      for (const staffMeta of staffMetas) {
        await logAudit({
          userId: auth.user.id,
          action: "batch-assign-role",
          entityType: "staffMeta",
          entityId: staffMeta.id,
          newValues: { role },
        });
      }
      for (const userId of userIds.filter((id) => !staffMetas.some((staffMeta) => staffMeta.userId === id))) {
        await logAudit({
          userId: auth.user.id,
          action: "batch-assign-role",
          entityType: "user",
          entityId: userId,
          newValues: { role },
        });
      }
    }

    return NextResponse.json({ success, failed: 0 });
  } catch (error) {
    console.error("Batch user action failed:", error);
    return NextResponse.json({ success: 0, failed: userIds.length }, { status: 500 });
  }
}
