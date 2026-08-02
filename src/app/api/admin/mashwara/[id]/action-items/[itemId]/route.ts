import { NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { resolveMashwaraAccess } from "@/lib/auth/mashwara-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notifyTaskAssignee } from "@/lib/mashwara-notifications";
import { z } from "zod";

const updateActionItemSchema = z.object({
  description: z.string().trim().min(1).max(1000).optional(),
  assignedToId: z.string().trim().min(1).max(128).optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["open", "in_progress", "completed"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: meetingId, itemId } = await params;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("mashwara.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  const body = await req.json().catch(() => ({}));
  const parseResult = updateActionItemSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const data = parseResult.data;

  try {
    const meeting = await db.mashwaraMeeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const hasAccess = await resolveMashwaraAccess(user, meeting);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: insufficient scope" }, { status: 403 });
    }

    const existingItem = await db.mashwaraActionItem.findFirst({
      where: { id: itemId, meetingId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 });
    }

    // Verify assignedToId if provided and changing
    let newAssigneeStaff: { id: string; isActive: boolean } | null = null;
    if (data.assignedToId && data.assignedToId !== existingItem.assignedToId) {
      newAssigneeStaff = await db.staffMeta.findUnique({
        where: { id: data.assignedToId },
        select: { id: true, isActive: true },
      });

      if (!newAssigneeStaff || !newAssigneeStaff.isActive) {
        return NextResponse.json(
          { error: "Assignee is inactive or does not exist" },
          { status: 400 }
        );
      }
    }

    const updatedDueDate = data.dueDate !== undefined
      ? (data.dueDate ? new Date(data.dueDate) : null)
      : existingItem.dueDate;

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.mashwaraActionItem.update({
        where: { id: itemId },
        data: {
          ...(data.description ? { description: data.description } : {}),
          ...(data.assignedToId ? { assignedToId: data.assignedToId } : {}),
          ...(data.dueDate !== undefined ? { dueDate: updatedDueDate } : {}),
          ...(data.status ? { status: data.status } : {}),
        },
      });

      await logAudit({
        userId: user.id,
        action: "mashwara_action_item_update",
        entityType: "mashwara_action_item",
        entityId: itemId,
        oldValues: {
          status: existingItem.status,
          assignedToId: existingItem.assignedToId,
          dueDate: existingItem.dueDate,
        },
        newValues: {
          status: updated.status,
          assignedToId: updated.assignedToId,
          dueDate: updated.dueDate,
        },
      });

      // Send notification if assignment changed or status updated
      const assigneeId = updated.assignedToId;
      const isReassigned = data.assignedToId && data.assignedToId !== existingItem.assignedToId;
      const isStatusChanged = data.status && data.status !== existingItem.status;

      if (isReassigned) {
        await notifyTaskAssignee(
          {
            actionItemId: itemId,
            meetingId,
            assignedToStaffMetaId: assigneeId,
            description: updated.description,
            dueDate: updated.dueDate,
            type: "assigned",
          },
          tx
        );
      } else if (isStatusChanged) {
        await notifyTaskAssignee(
          {
            actionItemId: itemId,
            meetingId,
            assignedToStaffMetaId: assigneeId,
            description: updated.description,
            dueDate: updated.dueDate,
            status: updated.status,
            type: "updated",
          },
          tx
        );
      }

      return updated;
    });

    return NextResponse.json({ success: true, actionItem: result });
  } catch (error) {
    console.error("Action item update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
