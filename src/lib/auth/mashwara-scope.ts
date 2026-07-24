import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/scope";

async function resolveStaffCityId(
  staffMetaId: string
): Promise<string | null> {
  const staff = await db.staffMeta.findUnique({
    where: { id: staffMetaId },
    select: {
      assignedCityId: true,
      assignedPark: { select: { cityId: true } },
      assignedGroup: {
        select: {
          park: { select: { cityId: true } },
          batch: { select: { cityId: true, park: { select: { cityId: true } } } },
        },
      },
    },
  });
  if (!staff) return null;

  return (
    staff.assignedCityId ??
    staff.assignedPark?.cityId ??
    staff.assignedGroup?.park?.cityId ??
    staff.assignedGroup?.batch.cityId ??
    staff.assignedGroup?.batch.park.cityId ??
    null
  );
}

export async function resolveMashwaraAccess(
  user: SessionUser,
  meeting: { id: string; cityId: string }
): Promise<boolean> {
  const isHq = user.role === "super_admin" || user.role === "program_admin";
  if (isHq) return true;

  if (user.id) {
    if (user.assignedCityId && user.assignedCityId === meeting.cityId) return true;

    const staffMeta = await db.staffMeta.findFirst({
      where: { userId: user.id, isActive: true },
      select: { id: true },
    });
    if (!staffMeta) return false;

    const staffCityId = await resolveStaffCityId(staffMeta.id);
    if (staffCityId && staffCityId === meeting.cityId) return true;

    const share = await db.mashwaraMeetingShare.findUnique({
      where: {
        meetingId_staffMetaId: { meetingId: meeting.id, staffMetaId: staffMeta.id },
      },
      select: { isRevoked: true },
    });
    if (share && !share.isRevoked) return true;
  }

  return false;
}
