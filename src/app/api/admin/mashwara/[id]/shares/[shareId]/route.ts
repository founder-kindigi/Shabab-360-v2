import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { resolveMashwaraActorCity } from "@/lib/auth/mashwara-scope";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("mashwara.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id: meetingId, shareId } = await params;

  const meeting = await db.mashwaraMeeting.findUnique({
    where: { id: meetingId },
    select: { id: true, cityId: true },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Verify actor has city access
  const actorCityResult = await resolveMashwaraActorCity(auth.user, meeting.cityId);
  if ("error" in actorCityResult) {
    return NextResponse.json({ error: actorCityResult.error }, { status: actorCityResult.status });
  }

  try {
    await db.$transaction(async (tx) => {
      const share = await tx.mashwaraMeetingShare.findFirst({
        where: { id: shareId, meetingId },
        select: { id: true, isRevoked: true, revokedAt: true, staffMetaId: true },
      });

      if (!share) {
        throw { status: 404, message: "Share not found" };
      }

      if (share.isRevoked !== false || share.revokedAt !== null) {
        throw { status: 409, message: "Share is already revoked" };
      }

      await tx.mashwaraMeetingShare.update({
        where: { id: shareId },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: createAuditLogData({
          userId: auth.user.id,
          action: "delete",
          entityType: "mashwara_meeting_share",
          entityId: shareId,
          oldValues: { meetingId, staffMetaId: share.staffMetaId, isRevoked: false },
          newValues: { isRevoked: true },
        })
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error && typeof error === "object" && "status" in error) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Transaction failed" }, { status: 500 });
  }
}
