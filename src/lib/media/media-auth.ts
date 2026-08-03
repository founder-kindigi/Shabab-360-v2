import type { SessionUser } from "@/lib/auth/scope";
import { isHqRole } from "@/lib/auth/scope";
import { db } from "@/lib/db";

const MEDIA_TEAM_CODES = ["MEDIA", "media"];

export type MediaAuthResult =
  | { authorized: true; cityId: string }
  | { authorized: false; error: string; status: number };

export async function resolveMediaCity(
  user: SessionUser,
  requestedCityId?: string | null
): Promise<MediaAuthResult> {
  if (!user.id || !user.role) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }
  if (isHqRole(user.role)) {
    if (!requestedCityId || typeof requestedCityId !== "string" || !requestedCityId.trim()) {
      return { authorized: false, error: "cityId is required for HQ users", status: 400 };
    }
    const city = await db.city.findUnique({ where: { id: requestedCityId.trim() } });
    if (!city || !city.isActive) {
      return { authorized: false, error: "City not found or inactive", status: 400 };
    }
    return { authorized: true, cityId: city.id };
  }
  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: user.id },
    include: {
      assignedCity: true,
      assignedPark: { include: { city: true } },
      assignedGroup: { include: { batch: { include: { city: true } }, park: { include: { city: true } } } },
    },
  });
  if (!staffMeta || !staffMeta.isActive) {
    return { authorized: false, error: "Forbidden: inactive or missing staff assignment", status: 403 };
  }
  let derivedCityId: string | null = null;
  if (staffMeta.assignedCityId) derivedCityId = staffMeta.assignedCityId;
  else if (staffMeta.assignedPark?.cityId) derivedCityId = staffMeta.assignedPark.cityId;
  else if (staffMeta.assignedGroup?.batch?.cityId) derivedCityId = staffMeta.assignedGroup.batch.cityId;
  else if (staffMeta.assignedGroup?.park?.cityId) derivedCityId = staffMeta.assignedGroup.park.cityId;
  if (!derivedCityId) {
    return { authorized: false, error: "Forbidden: city scope cannot be resolved", status: 403 };
  }
  if (requestedCityId && requestedCityId.trim() && requestedCityId.trim() !== derivedCityId) {
    return { authorized: false, error: "Forbidden: requested city does not match actor scope", status: 403 };
  }
  return { authorized: true, cityId: derivedCityId };
}

export async function hasActiveMediaMembership(user: SessionUser, cityId: string): Promise<boolean> {
  if (!user.id) return false;
  const staffMeta = await db.staffMeta.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!staffMeta) return false;
  const team = await db.collaborationTeam.findFirst({
    where: { cityId, code: { in: MEDIA_TEAM_CODES }, isActive: true, memberships: { some: { staffMetaId: staffMeta.id, isActive: true, endedAt: null } } },
    select: { id: true },
  });
  return team !== null;
}

export async function hasActiveMediaMembershipByStaffMetaId(staffMetaId: string, cityId: string): Promise<boolean> {
  const team = await db.collaborationTeam.findFirst({
    where: { cityId, code: { in: MEDIA_TEAM_CODES }, isActive: true, memberships: { some: { staffMetaId, isActive: true, endedAt: null } } },
    select: { id: true },
  });
  return team !== null;
}

export async function requireMediaAccess(
  user: SessionUser,
  capability: "media.briefs.manage" | "media.workspace.view" | "media.workspace.manage",
  resolvedCityId: string
): Promise<MediaAuthResult> {
  const { userHasCapability } = await import("@/lib/auth/capability-access");
  const hasCap = await userHasCapability(user, capability);
  if (!hasCap) return { authorized: false, error: "Forbidden: missing capability", status: 403 };
  const isMember = await hasActiveMediaMembership(user, resolvedCityId);
  if (!isMember) return { authorized: false, error: "Forbidden: no active Media team membership", status: 403 };
  return { authorized: true, cityId: resolvedCityId };
}
