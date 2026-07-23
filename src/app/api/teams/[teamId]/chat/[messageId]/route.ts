import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isStaffActiveTeamMember } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; messageId: string }> }
) {
  const auth = await requireCapability("teams.workspace.view");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId, messageId } = await params;

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: auth.user.id },
  });

  if (!staffMeta || !(await isStaffActiveTeamMember(staffMeta.id, teamId))) {
    return NextResponse.json({ error: "Active team membership required" }, { status: 403 });
  }

  const message = await db.teamChatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message || message.teamId !== teamId || message.isDeleted) {
    return NextResponse.json({ error: "Chat message not found" }, { status: 404 });
  }

  const hasManageCapability = await userHasCapability(auth.user, "teams.workspace.manage");
  let actionName = "moderate_chat_message";

  if (!hasManageCapability) {
    if (message.authorId !== staffMeta.id) {
      return NextResponse.json(
        { error: "Forbidden: Cannot delete messages sent by other team members" },
        { status: 403 }
      );
    }

    const ageMs = Date.now() - new Date(message.createdAt).getTime();
    const tenMinutesMs = 10 * 60 * 1000;

    if (ageMs > tenMinutesMs) {
      return NextResponse.json(
        { error: "Forbidden: Deletion window of 10 minutes has expired" },
        { status: 403 }
      );
    }

    actionName = "delete_own_chat_message";
  }

  const softDeleted = await db.teamChatMessage.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: auth.user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: auth.user.id,
      action: actionName,
      entityType: "TeamChatMessage",
      entityId: messageId,
      reason: "Soft-deleted team chat message",
    },
  });

  return NextResponse.json({ data: softDeleted });
}
