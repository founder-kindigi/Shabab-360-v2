import { db } from "@/lib/db";
import { isHqRole, type SessionUser } from "@/lib/auth/scope";

export type CityResolveResult =
  | { success: true; cityId: string }
  | { success: false; status: 400 | 403; error: string };

/**
 * Resolves server-derived city scope for a user.
 * - HQ roles require an explicit valid `providedCityId` (returns 400 if missing).
 * - Scoped staff derive their city from StaffMeta (assignedCityId or via assignedPark/assignedGroup).
 * - If a scoped staff member passes a `providedCityId` that does not match their derived city, returns 403.
 */
export async function resolveActorCity(
  user?: SessionUser | null,
  providedCityId?: string | null
): Promise<CityResolveResult> {
  if (!user || !user.id || !user.role) {
    return { success: false, status: 403, error: "Forbidden" };
  }

  if (isHqRole(user.role)) {
    if (!providedCityId || typeof providedCityId !== "string" || !providedCityId.trim()) {
      return { success: false, status: 400, error: "cityId parameter is required for HQ roles" };
    }
    return { success: true, cityId: providedCityId.trim() };
  }

  let derivedCityId: string | null = user.assignedCityId ?? null;

  if (!derivedCityId && user.assignedParkId) {
    const park = await db.park.findUnique({
      where: { id: user.assignedParkId },
      select: { cityId: true },
    });
    derivedCityId = park?.cityId ?? null;
  }

  if (!derivedCityId && user.assignedGroupId) {
    const group = await db.group.findUnique({
      where: { id: user.assignedGroupId },
      select: { park: { select: { cityId: true } } },
    });
    derivedCityId = group?.park?.cityId ?? null;
  }

  if (!derivedCityId) {
    return { success: false, status: 403, error: "User has no assigned city scope" };
  }

  if (providedCityId && providedCityId.trim() !== derivedCityId) {
    return { success: false, status: 403, error: "Forbidden city scope mismatch" };
  }

  return { success: true, cityId: derivedCityId };
}

/**
 * Resolves the derived city for a target StaffMeta record.
 * Returns null if the staff member is inactive or has no city scope.
 */
export async function getStaffMetaDerivedCity(staffMetaId: string): Promise<string | null> {
  const staff = await db.staffMeta.findUnique({
    where: { id: staffMetaId },
    select: {
      isActive: true,
      assignedCityId: true,
      assignedPark: { select: { cityId: true } },
      assignedGroup: { select: { park: { select: { cityId: true } } } },
    },
  });

  if (!staff || !staff.isActive) return null;

  return (
    staff.assignedCityId ??
    staff.assignedPark?.cityId ??
    staff.assignedGroup?.park?.cityId ??
    null
  );
}

/**
 * Verifies whether a user is an active member of a specific CollaborationTeam.
 */
export async function isStaffActiveTeamMember(
  staffMetaId: string,
  teamId: string
): Promise<boolean> {
  const membership = await db.staffTeamMembership.findFirst({
    where: {
      staffMetaId,
      teamId,
      isActive: true,
      endedAt: null,
    },
  });
  return Boolean(membership);
}
