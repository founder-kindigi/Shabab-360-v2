/**
 * Content Planner authorization helpers enforce server-derived city/batch/park scope.
 * Request inputs may narrow scope only; they must never broaden access.
 */

import type { SessionUser } from "@/lib/auth/scope";
import { isHqRole } from "@/lib/auth/scope";
import type { StaffRole } from "@/types";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Content planner reader roles for documentation only.
 * Authorization uses content.view and content.manage capabilities, not role lists.
 */
export const CONTENT_PLANNER_READER_ROLES: readonly StaffRole[] = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_lead",
  "park_admin",
  "murabbi",
];

/**
 * Four approved content categories mapped to collaboration teams.
 * Categories are: exercises, sports, skills, tadreeb.
 * Media and muawin teams exist but have no Batch 4 source columns.
 */
export const APPROVED_CONTENT_CATEGORIES = [
  "exercises",
  "sports",
  "skills",
  "tadreeb",
] as const;

export type ContentCategory = (typeof APPROVED_CONTENT_CATEGORIES)[number];

/**
 * Category to team code mapping based on workbook analysis.
 */
export const CATEGORY_TO_TEAM_CODE: Record<ContentCategory, string> = {
  exercises: "sports",
  sports: "sports",
  skills: "skills",
  tadreeb: "tadreeb",
};

export function isApprovedCategory(category: string): category is ContentCategory {
  return APPROVED_CONTENT_CATEGORIES.includes(category as ContentCategory);
}

/**
 * Returns true when the user holds an HQ role (super_admin, program_admin).
 * HQ actors have access to all cities but must explicitly supply cityId on
 * list/create requests to prevent blind cross-city data dumps.
 */
export function isHqUser(user: SessionUser): boolean {
  return isHqRole(user.role);
}

/**
 * Derive the maximum accessible city scope for the session user.
 * Returns null for users without valid content planner access.
 */
export async function deriveContentPlannerCityScope(
  user: SessionUser
): Promise<string[] | null> {
  if (!user.id || !user.role) return null;

  // HQ roles have access to all cities
  if (isHqRole(user.role)) {
    const cities = await db.city.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return cities.map((c) => c.id);
  }

  // City Head has access only to assigned city
  if (user.role === "city_head" && user.assignedCityId) {
    return [user.assignedCityId];
  }

  // Park staff: derive city from assigned park
  if (
    (user.role === "park_lead" ||
      user.role === "park_admin" ||
      user.role === "murabbi") &&
    user.assignedParkId
  ) {
    const park = await db.park.findUnique({
      where: { id: user.assignedParkId },
      select: { cityId: true },
    });
    return park ? [park.cityId] : null;
  }

  // Murabbi with only group assignment: derive city from group's park
  if (user.role === "murabbi" && user.assignedGroupId) {
    const group = await db.group.findUnique({
      where: { id: user.assignedGroupId },
      include: { park: { select: { cityId: true } } },
    });
    return group?.park ? [group.park.cityId] : null;
  }

  return null;
}

/**
 * Derive accessible park scope for the session user within a specific city.
 * Returns null if user cannot access the city, or all park IDs if unrestricted within city.
 */
export async function deriveContentPlannerParkScope(
  user: SessionUser,
  cityId: string
): Promise<string[] | null | "all"> {
  if (!user.id || !user.role) return null;

  const citiesAllowed = await deriveContentPlannerCityScope(user);
  if (!citiesAllowed || !citiesAllowed.includes(cityId)) {
    return null;
  }

  // HQ and City Head have access to all parks in their allowed cities
  if (isHqRole(user.role) || user.role === "city_head") {
    return "all";
  }

  // Park staff: only assigned park if in the correct city
  if (
    (user.role === "park_lead" ||
      user.role === "park_admin" ||
      user.role === "murabbi") &&
    user.assignedParkId
  ) {
    const park = await db.park.findUnique({
      where: { id: user.assignedParkId },
      select: { cityId: true },
    });
    if (park && park.cityId === cityId) {
      return [user.assignedParkId];
    }
  }

  // Murabbi with only group: derive park from group if in correct city
  if (user.role === "murabbi" && user.assignedGroupId) {
    const group = await db.group.findUnique({
      where: { id: user.assignedGroupId },
      include: { park: { select: { id: true, cityId: true } } },
    });
    if (group?.park && group.park.cityId === cityId) {
      return [group.park.id];
    }
  }

  return null;
}

/**
 * Returns true when the user's role is park- or group-scoped (not HQ, not city_head).
 * These users must always have their park scope enforced even when the caller
 * does not supply an explicit parkId.
 */
function isParkScopedRole(role: string | null | undefined): boolean {
  return (
    role === "park_lead" || role === "park_admin" || role === "murabbi"
  );
}

/**
 * Build a Prisma where clause for content plan queries based on user scope.
 * Request parameters may narrow but never broaden the derived scope.
 *
 * Park-scoped users (park_lead, park_admin, murabbi) always receive an
 * enforced park filter even when requestParkId is omitted — this prevents
 * listing plans that belong to sibling parks in the same city.
 *
 * Batch validation checks both cityId and parkId so a batch that belongs to
 * another park in the same city is rejected.
 */
export async function buildContentPlanScopeFilter(
  user: SessionUser,
  requestCityId?: string | null,
  requestBatchId?: string | null,
  requestParkId?: string | null
): Promise<Prisma.ContentPlanWhereInput | null> {
  const allowedCities = await deriveContentPlannerCityScope(user);
  if (!allowedCities) return null;

  const filter: Prisma.ContentPlanWhereInput = {};

  // ── City ──────────────────────────────────────────────────────────────────
  if (requestCityId) {
    if (!allowedCities.includes(requestCityId)) return null;
    filter.cityId = requestCityId;
  } else {
    filter.cityId = { in: allowedCities };
  }

  // ── Derived park scope (always enforced for park/group-scoped roles) ──────
  // Use the effective city for park derivation: prefer the explicitly requested
  // city; fall back to the sole city in allowedCities (park-scoped users
  // always have exactly one city).
  const effectiveCityId = requestCityId ?? (allowedCities.length === 1 ? allowedCities[0] : null);

  let derivedParkIds: string[] | null = null; // null means "all parks allowed"

  if (isParkScopedRole(user.role)) {
    if (!effectiveCityId) return null; // Cannot resolve park without a city

    const parkScope = await deriveContentPlannerParkScope(user, effectiveCityId);
    if (!parkScope) return null; // No park access at all

    if (parkScope !== "all") {
      derivedParkIds = parkScope; // e.g. ["park1"]
    }
    // parkScope === "all" means unrestricted within city — leave derivedParkIds null
  }

  // ── Apply park filter ─────────────────────────────────────────────────────
  if (requestParkId) {
    if (derivedParkIds !== null) {
      // Park-scoped: requested park must be within derived set
      if (!derivedParkIds.includes(requestParkId)) return null;
      filter.parkId = requestParkId;
    } else if (effectiveCityId) {
      // HQ / city_head: verify park exists in the effective city
      const park = await db.park.findUnique({
        where: { id: requestParkId },
        select: { cityId: true },
      });
      if (!park || park.cityId !== effectiveCityId) return null;
      filter.parkId = requestParkId;
    } else {
      return null;
    }
  } else if (derivedParkIds !== null) {
    // Park-scoped user omitted parkId: enforce derived park unconditionally
    filter.parkId = { in: derivedParkIds };
  }

  // ── Batch ─────────────────────────────────────────────────────────────────
  if (requestBatchId) {
    const batch = await db.batch.findUnique({
      where: { id: requestBatchId },
      select: { cityId: true, parkId: true },
    });

    // Batch must belong to an allowed city
    if (!batch?.cityId || !allowedCities.includes(batch.cityId)) return null;

    // For park-scoped users: batch must also belong to their derived park
    if (derivedParkIds !== null && !derivedParkIds.includes(batch.parkId)) {
      return null;
    }

    filter.batchId = requestBatchId;
  }

  return filter;
}

/**
 * Verify a user can read a specific content plan by ID.
 * Returns true if access is granted, false otherwise.
 */
export async function canReadContentPlan(
  user: SessionUser,
  planId: string
): Promise<boolean> {
  if (!user.id || !user.role) return false;

  const plan = await db.contentPlan.findUnique({
    where: { id: planId },
    select: { cityId: true, parkId: true, batchId: true },
  });

  if (!plan) return false;

  const filter = await buildContentPlanScopeFilter(
    user,
    plan.cityId,
    plan.batchId ?? undefined,
    plan.parkId ?? undefined
  );

  return filter !== null;
}

/**
 * Verify a user can write (create/update/archive) content plans in a given scope.
 * Requires content.manage capability plus resource scope check.
 * Dynamic capability grants allow write access regardless of role.
 */
export async function canWriteContentPlan(
  user: SessionUser,
  cityId: string,
  batchId?: string | null,
  parkId?: string | null
): Promise<boolean> {
  if (!user.id || !user.role) return false;

  // Check resource scope first
  const filter = await buildContentPlanScopeFilter(user, cityId, batchId, parkId);
  if (filter === null) return false;

  // Capability check is performed by route handlers via requireCapability
  // This function only validates resource scope
  return true;
}

/**
 * Verify a team exists and belongs to the correct city.
 */
export async function verifyTeamInCity(
  teamId: string,
  cityId: string
): Promise<boolean> {
  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: { cityId: true, isActive: true },
  });

  return Boolean(team && team.cityId === cityId && team.isActive);
}
