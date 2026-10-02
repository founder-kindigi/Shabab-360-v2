import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const grantShareSchema = z.object({
  staffMetaId: z.string().min(1, "Staff member is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
  const isHq = auth.user.role === "super_admin" || auth.user.role === "program_admin";
  if (!isHq && auth.user.assignedCityId !== meeting.cityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = grantShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Validate target staff exists, is active, and belongs to the same city
  const targetStaff = await db.staffMeta.findUnique({
    where: { id: parsed.data.staffMetaId },
    select: {
      id: true,
      isActive: true,
      assignedCityId: true,
      assignedPark: { select: { cityId: true } },
      assignedGroup: { select: { batch: { select: { cityId: true, park: { select: { cityId: true } } } } } },
    },
  });
  if (!targetStaff || !targetStaff.isActive) {
    return NextResponse.json({ error: "Active staff member not found" }, { status: 404 });
  }

  const staffCityId =
    targetStaff.assignedCityId ??
    targetStaff.assignedPark?.cityId ??
    targetStaff.assignedGroup?.batch.cityId ??
    targetStaff.assignedGroup?.batch.park.cityId;
  if (!staffCityId || staffCityId !== meeting.cityId) {
    return NextResponse.json({ error: "Staff member must belong to the meeting city" }, { status: 400 });
  }

  // Check for existing share
  const existing = await db.mashwaraMeetingShare.findUnique({
    where: { meetingId_staffMetaId: { meetingId, staffMetaId: targetStaff.id } },
    select: { id: true, isRevoked: true },
  });
  if (existing && !existing.isRevoked) {
    return NextResponse.json({ error: "Staff member already has an active share for this meeting" }, { status: 409 });
  }

  // Resolve granter's staffMetaId
  const granterStaff = await db.staffMeta.findFirst({
    where: { userId: auth.user.id, isActive: true },
    select: { id: true },
  });
  if (!granterStaff) {
    return NextResponse.json({ error: "Active staff record not found" }, { status: 403 });
  }

  let share;
  if (existing) {
    // Re-activate a previously revoked share
    share = await db.mashwaraMeetingShare.update({
      where: { id: existing.id },
      data: { isRevoked: false, revokedAt: null, grantedAt: new Date(), grantedById: granterStaff.id },
      select: { id: true, meetingId: true, staffMetaId: true, grantedAt: true, isRevoked: true },
    });
  } else {
    share = await db.mashwaraMeetingShare.create({
      data: { meetingId, staffMetaId: targetStaff.id, grantedById: granterStaff.id },
      select: { id: true, meetingId: true, staffMetaId: true, grantedAt: true, isRevoked: true },
    });
  }

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "mashwara_meeting_share",
    entityId: share.id,
    newValues: { meetingId, staffMetaId: targetStaff.id },
  });

  return NextResponse.json(share, { status: 201 });
}
