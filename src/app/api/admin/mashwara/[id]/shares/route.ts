import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { resolveMashwaraActorCity } from "@/lib/auth/mashwara-scope";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { z } from "zod";

const grantShareSchema = z
  .object({
    staffMetaId: z.string().min(1, "Staff member is required"),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("mashwara.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id: meetingId } = await params;

  const meeting = await db.mashwaraMeeting.findUnique({
    where: { id: meetingId },
    select: { id: true, cityId: true },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Verify granter has city access to the meeting
  const actorCityResult = await resolveMashwaraActorCity(
    auth.user,
    meeting.cityId,
  );
  if ("error" in actorCityResult) {
    return NextResponse.json(
      { error: actorCityResult.error },
      { status: actorCityResult.status },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const parsed = grantShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Validate target staff exists, is active, and belongs to the same city
  const targetStaff = await db.staffMeta.findUnique({
    where: { id: parsed.data.staffMetaId },
    select: {
      id: true,
      isActive: true,
      assignedCityId: true,
      assignedPark: { select: { cityId: true } },
      assignedGroup: {
        select: {
          park: { select: { cityId: true } },
          batch: {
            select: { cityId: true, park: { select: { cityId: true } } },
          },
        },
      },
    },
  });

  if (!targetStaff) {
    return NextResponse.json(
      { error: "Staff member not found" },
      { status: 404 },
    );
  }

  if (!targetStaff.isActive) {
    return NextResponse.json(
      { error: "Staff member is inactive" },
      { status: 403 },
    );
  }

  const staffCityId =
    targetStaff.assignedCityId ??
    targetStaff.assignedPark?.cityId ??
    targetStaff.assignedGroup?.park?.cityId ??
    targetStaff.assignedGroup?.batch?.cityId ??
    targetStaff.assignedGroup?.batch?.park?.cityId ??
    null;

  if (staffCityId !== meeting.cityId) {
    return NextResponse.json(
      { error: "Staff member must belong to the meeting city" },
      { status: 403 },
    );
  }

  // Resolve granter's staffMetaId
  const granterStaff = await db.staffMeta.findFirst({
    where: { userId: auth.user.id, isActive: true },
    select: { id: true },
  });
  if (!granterStaff) {
    return NextResponse.json(
      { error: "Active staff record not found" },
      { status: 403 },
    );
  }

  try {
    const shareResult = await db.$transaction(async (tx) => {
      // Check for existing share inside transaction
      const existing = await tx.mashwaraMeetingShare.findUnique({
        where: {
          meetingId_staffMetaId: { meetingId, staffMetaId: targetStaff.id },
        },
        select: { id: true, isRevoked: true, revokedAt: true },
      });

      if (existing && !existing.isRevoked && existing.revokedAt === null) {
        throw new Error(
          "Staff member already has an active share for this meeting",
        );
      }

      let share;
      if (existing) {
        // Re-activate a previously revoked share
        share = await tx.mashwaraMeetingShare.update({
          where: { id: existing.id },
          data: {
            isRevoked: false,
            revokedAt: null,
            grantedAt: new Date(),
            grantedById: granterStaff.id,
          },
          select: {
            id: true,
            meetingId: true,
            staffMetaId: true,
            grantedAt: true,
            isRevoked: true,
          },
        });
      } else {
        share = await tx.mashwaraMeetingShare.create({
          data: {
            meetingId,
            staffMetaId: targetStaff.id,
            grantedById: granterStaff.id,
          },
          select: {
            id: true,
            meetingId: true,
            staffMetaId: true,
            grantedAt: true,
            isRevoked: true,
          },
        });
      }

      await tx.auditLog.create({
        data: createAuditLogData({
          userId: auth.user.id,
          action: "create",
          entityType: "mashwara_meeting_share",
          entityId: share.id,
          newValues: { meetingId, staffMetaId: targetStaff.id },
        }),
      });

      return share;
    });

    return NextResponse.json(shareResult, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "Staff member already has an active share for this meeting"
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Transaction failed" }, { status: 500 });
  }
}
