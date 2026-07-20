import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const batchSchema = z.object({
  action: z.enum(["activate", "deactivate", "change-group", "export"]),
  participantIds: z.array(z.string().min(1)).min(1, "At least 1 participant ID is required"),
  groupId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { action, participantIds, groupId } = parsed.data;

  // Validate all IDs exist
  const existing = await db.participant.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, userId: true, state: true },
  });

  const existingIds = new Set(existing.map((p) => p.id));
  const invalidIds = participantIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Participants not found: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  // For change-group, validate the group
  if (action === "change-group") {
    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required for change-group action" },
        { status: 400 }
      );
    }
    const group = await db.group.findUnique({
      where: { id: groupId, isActive: true },
    });
    if (!group) {
      return NextResponse.json(
        { error: "Target group not found or inactive" },
        { status: 400 }
      );
    }
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    if (action === "activate" || action === "deactivate") {
      const newState = action === "activate" ? "active" : "inactive";
      const userIdsToRevoke = newState === "inactive"
        ? existing.flatMap((participant) =>
            participant.state !== "inactive" && participant.userId ? [participant.userId] : []
          )
        : [];
      const result = await db.$transaction(async (tx) => {
        const updated = await tx.participant.updateMany({
          where: { id: { in: participantIds } },
          data: { state: newState },
        });
        if (userIdsToRevoke.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: userIdsToRevoke } },
            data: { tokenVersion: { increment: 1 } },
          });
        }
        return updated;
      });
      success = result.count;

      // Audit log for each participant
      for (const id of participantIds) {
        await logAudit({
          userId: auth.user.id,
          action: `batch-${action}`,
          entityType: "participant",
          entityId: id,
          newValues: { state: newState },
        });
      }
    } else if (action === "change-group") {
      const result = await db.participant.updateMany({
        where: { id: { in: participantIds } },
        data: { groupId: groupId! },
      });
      success = result.count;

      for (const id of participantIds) {
        await logAudit({
          userId: auth.user.id,
          action: "batch-change-group",
          entityType: "participant",
          entityId: id,
          newValues: { groupId: groupId },
        });
      }
    } else if (action === "export") {
      // Export just returns success — actual CSV is handled client-side
      success = participantIds.length;
    }
  } catch (err: any) {
    failed = participantIds.length - success;
    errors.push(err.message || "Batch operation failed");
  }

  return NextResponse.json({ success, failed, errors: errors.length > 0 ? errors : undefined });
}
