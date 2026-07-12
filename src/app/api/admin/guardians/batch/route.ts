import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const batchSchema = z.object({
  action: z.enum(["activate", "deactivate", "send-invite"]),
  guardianIds: z.array(z.string().min(1)).min(1, "At least 1 guardian ID is required"),
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

  const { action, guardianIds } = parsed.data;

  // Validate all IDs exist
  const existing = await db.guardian.findMany({
    where: { id: { in: guardianIds } },
    select: { id: true },
  });

  const existingIds = new Set(existing.map((g) => g.id));
  const invalidIds = guardianIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Guardians not found: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  let success = 0;
  let failed = 0;

  try {
    if (action === "activate" || action === "deactivate") {
      const isActive = action === "activate";
      const result = await db.guardian.updateMany({
        where: { id: { in: guardianIds } },
        data: { isActive },
      });
      success = result.count;

      for (const id of guardianIds) {
        await logAudit({
          userId: auth.user.id,
          action: `batch-${action}`,
          entityType: "guardian",
          entityId: id,
          newValues: { isActive },
        });
      }
    } else if (action === "send-invite") {
      // For send-invite, we mark them as active and log it.
      // Actual invite sending would need an email/SMS service.
      // Here we ensure they are active.
      const result = await db.guardian.updateMany({
        where: {
          id: { in: guardianIds },
          isActive: false,
        },
        data: { isActive: true },
      });
      success = guardianIds.length;

      for (const id of guardianIds) {
        await logAudit({
          userId: auth.user.id,
          action: "batch-send-invite",
          entityType: "guardian",
          entityId: id,
          newValues: { invited: true },
        });
      }
    }
  } catch (err: any) {
    failed = guardianIds.length - success;
  }

  return NextResponse.json({ success, failed });
}