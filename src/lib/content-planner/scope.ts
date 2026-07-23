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
 * Content planner allowed roles. City Head and above may manage plans;
 * Park Lead and Murabbi have read-only access for delivery.
 */
export const CONTENT_PLANNER_MANAGER_ROLES: readonly StaffRole[] = [
  "super_admin",
  "program_admin",
  "city_head",
];

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
 * Build a Prisma where clause for content plan queries based on user scope.
 * Request parameters may narrow but never broaden the derived scope.
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

  // Narrow to request city if provided, or restrict to allowed cities
  if (requestCityId) {
    if (!allowedCities.includes(requestCityId)) {
      return null; // Request exceeds permission
    }
    filter.cityId = requestCityId;
  } else {
    filter.cityId = { in: allowedCities };
  }

  // Apply batch filter if requested
  if (requestBatchId) {
    // Verify batch belongs to an allowed city
    const batch = await db.batch.findUnique({
      where: { id: requestBatchId },
      select: { cityId: true },
    });
    if (!batch?.cityId || !allowedCities.includes(batch.cityId)) {
      return null;
    }
    filter.batchId = requestBatchId;
  }

  // Apply park filter if requested
  if (requestParkId) {
    const effectiveCityId = requestCityId || allowedCities[0];
    if (!effectiveCityId) return null;

    const allowedParks = await deriveContentPlannerParkScope(user, effectiveCityId);
    if (!allowedParks) return null;

    if (allowedParks === "all") {
      // Verify park exists in the city
      const park = await db.park.findUnique({
        where: { id: requestParkId },
        select: { cityId: true },
      });
      if (!park || park.cityId !== effectiveCityId) {
        return null;
      }
      filter.parkId = requestParkId;
    } else {
      // Check if requested park is in allowed list
      if (!allowedParks.includes(requestParkId)) {
        return null;
      }
      filter.parkId = requestParkId;
    }
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
 * Only manager roles can write; readers are denied.
 */
export async function canWriteContentPlan(
  user: SessionUser,
  cityId: string,
  batchId?: string | null,
  parkId?: string | null
): Promise<boolean> {
  if (!user.id || !user.role) return false;

  // Only manager roles can write
  if (!CONTENT_PLANNER_MANAGER_ROLES.includes(user.role as StaffRole)) {
    return false;
  }

  const filter = await buildContentPlanScopeFilter(user, cityId, batchId, parkId);
  return filter !== null;
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
