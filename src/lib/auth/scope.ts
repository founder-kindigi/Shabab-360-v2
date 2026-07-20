import type { StaffRole } from "@/types";

const HQ_ROLES: readonly StaffRole[] = ["super_admin", "program_admin"];
export const STAFF_ROLES: readonly StaffRole[] = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
];

export const ORGANIZATION_MANAGEMENT_ROLES: readonly StaffRole[] = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
];
export const ATTENDANCE_ROLES: readonly StaffRole[] = [
  "park_admin",
  "park_lead",
  "murabbi",
];

export type SessionUser = {
  id?: string;
  name?: string | null;
  role?: string;
  mustResetPwd?: boolean;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

/**
 * The complete hierarchy for a record being authorized. Callers must include
 * every identifier they have; missing context denies scoped staff by design.
 */
export type ResourceScope = {
  cityId?: string | null;
  parkId?: string | null;
  groupId?: string | null;
};

export function isHqRole(role?: string | null): role is "super_admin" | "program_admin" {
  return HQ_ROLES.includes(role as StaffRole);
}

export function isStaffRole(role?: string | null): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

/**
 * Enforce a complete organization scope. Roles without a matching assignment
 * or a caller-provided resource identifier are denied instead of falling
 * through to a broader scope.
 */
export function canAccessResourceScope(
  user: SessionUser,
  scope: ResourceScope,
  allowedRoles: readonly StaffRole[] = STAFF_ROLES
): boolean {
  if (!user.id || !isStaffRole(user.role) || !allowedRoles.includes(user.role)) {
    return false;
  }

  if (isHqRole(user.role)) {
    return true;
  }

  if (user.role === "city_head") {
    return Boolean(scope.cityId && user.assignedCityId && scope.cityId === user.assignedCityId);
  }

  if (user.role === "park_admin" || user.role === "park_lead") {
    return Boolean(scope.parkId && user.assignedParkId && scope.parkId === user.assignedParkId);
  }

  return Boolean(scope.groupId && user.assignedGroupId && scope.groupId === user.assignedGroupId);
}
