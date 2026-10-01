import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { isHqRole, type SessionUser } from "@/lib/auth/scope";
import { resolveRequestedHierarchy } from "@/lib/auth/hierarchy";
export async function resolveMashwaraAccess(user: SessionUser, meeting: { id: string; cityId: string }): Promise<boolean> {
  if (!user.id || user.mustResetPwd) return false;
  if (isHqRole(user.role)) return true;
  const staff = await db.staffMeta.findFirst({ where: { userId: user.id, isActive: true } });
  if (!staff) return false;
  const scope = await resolveRequestedHierarchy({ id: user.id, role: staff.role, assignedCityId: staff.assignedCityId, assignedParkId: staff.assignedParkId, assignedGroupId: staff.assignedGroupId });
  if (scope instanceof NextResponse) return false;
  const share = await db.mashwaraMeetingShare.findUnique({ where: { meetingId_staffMetaId: { meetingId: meeting.id, staffMetaId: staff.id } } });
  if (share && !share.isRevoked && !share.revokedAt) return true;
  if (scope.cityId !== meeting.cityId) return false;
  if (staff.role === "city_head") return true;
  // Membership of an unrelated city team does not grant access to meeting minutes.
  return Boolean(await db.mashwaraAttendee.findUnique({ where: { meetingId_staffMetaId: { meetingId: meeting.id, staffMetaId: staff.id } } }));
}
