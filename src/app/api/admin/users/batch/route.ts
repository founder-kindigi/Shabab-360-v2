import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
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
  userIds: z.array(z.string().min(1)).min(1, "At least 1 user ID is required"),
  role: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { action, userIds, role } = parsed.data;

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

  let success = 0;
  let failed = 0;

  try {
    if (action === "activate" || action === "deactivate") {
      const isActive = action === "activate";
      const result = await db.user.updateMany({
        where: { id: { in: userIds } },
        data: { isActive },
      });
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
      const result = await db.user.updateMany({
        where: { id: { in: userIds } },
        data: { mustResetPwd: true },
      });
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
      // Update all staffMeta records for these users
      const staffMetas = await db.staffMeta.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true },
      });

      const staffMetaUserIds = new Set(staffMetas.map((sm) => sm.userId));
      const usersWithoutMeta = userIds.filter((id) => !staffMetaUserIds.has(id));

      if (staffMetas.length > 0) {
        await db.staffMeta.updateMany({
          where: { userId: { in: userIds } },
          data: { role: role! },
        });
        success = staffMetas.length;

        for (const sm of staffMetas) {
          await logAudit({
            userId: auth.user.id,
            action: "batch-assign-role",
            entityType: "staffMeta",
            entityId: sm.id,
            newValues: { role },
          });
        }
      }

      // Users without staffMeta — create it
      if (usersWithoutMeta.length > 0) {
        await db.staffMeta.createMany({
          data: usersWithoutMeta.map((uid) => ({
            userId: uid,
            role: role!,
          })),
        });
        success += usersWithoutMeta.length;
      }
    }
  } catch (err: any) {
    failed = userIds.length - success;
  }

  return NextResponse.json({ success, failed });
}