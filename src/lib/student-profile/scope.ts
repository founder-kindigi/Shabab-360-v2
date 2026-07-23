import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/scope";
import { isHqRole } from "@/lib/auth/scope";

/**
 * Resolve the actor's authorized city for student profile operations.
 * HQ (super_admin, program_admin): must provide an explicit cityId.
 *   Missing/malformed/nonexistent cityId returns null → caller returns 400.
 * Scoped roles: derive city from StaffMeta.
 *   Foreign supplied cityId returns null → caller returns 403.
 * Returns the resolved city string, or null if no valid city.
 */
export async function resolveActorCity(
  user: SessionUser,
  providedCityId?: string | null
): Promise<string | null> {
  if (isHqRole(user.role)) {
    if (!providedCityId) return null;
    const city = await db.city.findUnique({ where: { id: providedCityId }, select: { id: true } });
    return city?.id ?? null;
  }

  // Scoped: derive from StaffMeta
  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: user.id! },
    select: { assignedCityId: true, assignedParkId: true, assignedGroupId: true },
  });
  if (!staffMeta) return null;

  let derivedCity: string | null = null;

  if (staffMeta.assignedCityId) {
    derivedCity = staffMeta.assignedCityId;
  } else if (staffMeta.assignedParkId) {
    const park = await db.park.findUnique({ where: { id: staffMeta.assignedParkId }, select: { cityId: true } });
    derivedCity = park?.cityId ?? null;
  } else if (staffMeta.assignedGroupId) {
    const group = await db.group.findUnique({
      where: { id: staffMeta.assignedGroupId },
      select: { batch: { select: { cityId: true } } },
    });
    derivedCity = group?.batch?.cityId ?? null;
  }

  if (!derivedCity) return null;

  // If a cityId was supplied, it must match the derived city
  if (providedCityId && providedCityId !== derivedCity) return null;

  return derivedCity;
}

/**
 * Verify the user can access a specific participant's extended profile.
 * HQ: resolvedCity must match the participant's city.
 * Staff: resolvedCity must match participant's city via group/batch/city chain.
 * Guardian: must have a GuardianChild link to the participant.
 * Student: must own the participant record.
 * Returns true if access is granted.
 */
export async function canAccessParticipantProfile(
  user: SessionUser,
  participantId: string,
  resolvedCity: string
): Promise<boolean> {
  // Student self-access
  const participant = await db.participant.findUnique({
    where: { id: participantId },
    select: { userId: true, group: { select: { batch: { select: { cityId: true } } } } },
  });
  if (!participant) return false;

  // Student: own record
  if (user.role === "student") {
    return participant.userId === user.id;
  }

  // Guardian: linked child
  if (user.role === "guardian") {
    const link = await db.guardianChild.findFirst({
      where: { participantId, guardian: { userId: user.id! } },
    });
    return link !== null;
  }

  // Staff: verify city match
  const participantCity = participant.group?.batch?.cityId;
  return participantCity === resolvedCity;
}
