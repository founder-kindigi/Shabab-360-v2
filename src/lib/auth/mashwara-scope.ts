import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/scope";

export async function resolveMashwaraActorCity(
  user: SessionUser,
  requestedCityId?: string
): Promise<{ cityId: string } | { error: string; status: number }> {
  const isHq = user.role === "super_admin" || user.role === "program_admin";

  if (isHq) {
    if (!requestedCityId) {
      return { error: "HQ users must provide a cityId", status: 400 };
    }
    return { cityId: requestedCityId };
  }

  if (!user.id) return { error: "Unauthenticated", status: 401 };

  let actorCityId: string | null = user.assignedCityId ?? null;

  if (!actorCityId) {
    const staffMeta = await db.staffMeta.findFirst({
      where: { userId: user.id, isActive: true },
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

    if (!staffMeta) return { error: "Active staff record not found", status: 403 };

    actorCityId =
      staffMeta.assignedCityId ??
      staffMeta.assignedPark?.cityId ??
      staffMeta.assignedGroup?.park?.cityId ??
      staffMeta.assignedGroup?.batch?.cityId ??
      staffMeta.assignedGroup?.batch?.park?.cityId ??
      null;
  }

  if (!actorCityId) {
    return { error: "Could not derive city scope for actor", status: 403 };
  }

  if (requestedCityId && requestedCityId !== actorCityId) {
    return { error: "Cannot access or create resources outside of your assigned city", status: 403 };
  }

  return { cityId: actorCityId };
}

export async function resolveMashwaraAccess(
  user: SessionUser,
  meeting: { id: string; cityId: string }
): Promise<boolean> {
  const actorCityResult = await resolveMashwaraActorCity(user, meeting.cityId);
  if ("cityId" in actorCityResult) {
    return true;
  }

  if (user.id) {
    const staffMeta = await db.staffMeta.findFirst({
      where: { userId: user.id, isActive: true },
      select: { id: true },
    });
    if (staffMeta) {
      const share = await db.mashwaraMeetingShare.findUnique({
        where: {
          meetingId_staffMetaId: { meetingId: meeting.id, staffMetaId: staffMeta.id },
        },
        select: { isRevoked: true },
      });
      if (share && !share.isRevoked) return true;
    }
  }

  return false;
}
