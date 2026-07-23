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
 * City Head: city-level match (already enforced via resolvedCity).
 * Park Lead: participant's park must equal assignedParkId.
 * Murabbi: participant's group must equal assignedGroupId.
 * Guardian: must have a GuardianChild link to the participant.
 * Student: must own the participant record.
 * Returns true if access is granted.
 */
export async function canAccessParticipantProfile(
  user: SessionUser,
  participantId: string,
  resolvedCity: string
): Promise<boolean> {
  // Fetch participant with group chain for scope verification
  const participant = await db.participant.findUnique({
    where: { id: participantId },
    select: {
      userId: true,
      groupId: true,
      group: {
        select: {
          parkId: true,
          batch: { select: { cityId: true, parkId: true } },
        },
      },
    },
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

  // Staff: verify exact scope
  const participantCity = participant.group?.batch?.cityId;
  if (!participantCity || participantCity !== resolvedCity) return false;

  // Park Lead: participant's park must match own assigned park.
  // group.parkId may be null during hierarchy transition — fall back to batch.parkId.
  if (user.role === "park_lead") {
    const participantParkId = participant.group?.parkId ?? participant.group?.batch?.parkId;
    return participantParkId === user.assignedParkId;
  }

  // Murabbi: participant's group must match own assigned group
  if (user.role === "murabbi") {
    return participant.groupId === user.assignedGroupId;
  }

  // HQ and City Head: city-level match is sufficient
  return true;
}
