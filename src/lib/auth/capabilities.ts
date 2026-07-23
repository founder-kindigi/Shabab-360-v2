import type { UserRole } from "@/types";

/**
 * Fixed capability catalogue. Values are stored by later schema work, so a
 * capability is never accepted from a free-text request or route name.
 */
export const ACCESS_CAPABILITIES = [
  "dashboard.view",
  "organisation.view",
  "organisation.manage",
  "people.view",
  "students.manage",
  "guardians.manage",
  "admissions.manage",
  "attendance.mark",
  "attendance.correct",
  "fees.manage",
  "announcements.manage",
  "reports.view",
  "audit.view",
  "settings.manage",
  "content.view",
  "content.manage",
  "access.role_defaults.manage",
  "access.user_overrides.manage",
  "access.scope.manage",
  "access.city_staff.manage",
] as const;

// Individual overrides must never grant audit, system-setting, or access
// administration powers. Those remain role-level, Super Admin-controlled.
export const USER_OVERRIDE_CAPABILITIES = [
  "dashboard.view",
  "organisation.view",
  "organisation.manage",
  "people.view",
  "students.manage",
  "guardians.manage",
  "admissions.manage",
  "attendance.mark",
  "attendance.correct",
  "fees.manage",
  "announcements.manage",
  "reports.view",
  "content.view",
  "content.manage",
] as const;

export type AccessCapability = (typeof ACCESS_CAPABILITIES)[number];
export type AccessCapabilityEffect = "allow" | "deny";

export type UserCapabilityOverrideState = {
  effect: string;
  isActive: boolean;
  expiresAt: Date | null;
};

const superAdminCapabilities = ACCESS_CAPABILITIES;

/**
 * Default module access only. Resource-scope checks still decide whether a
 * granted capability can read or change a particular city, park, or group.
 */
export const ROLE_DEFAULT_CAPABILITIES: Readonly<Record<UserRole, readonly AccessCapability[]>> = {
  super_admin: superAdminCapabilities,
  program_admin: [
    "dashboard.view",
    "organisation.view",
    "organisation.manage",
    "people.view",
    "students.manage",
    "guardians.manage",
    "admissions.manage",
    "attendance.mark",
    "attendance.correct",
    "fees.manage",
    "announcements.manage",
    "reports.view",
    "audit.view",
    "settings.manage",
    "content.view",
    "content.manage",
  ],
  city_head: [
    "dashboard.view",
    "organisation.view",
    "organisation.manage",
    "people.view",
    "students.manage",
    "guardians.manage",
    "admissions.manage",
    "attendance.mark",
    "attendance.correct",
    "fees.manage",
    "announcements.manage",
    "reports.view",
    "access.city_staff.manage",
    "content.view",
    "content.manage",
  ],
  park_lead: [
    "dashboard.view",
    "organisation.view",
    "attendance.mark",
    "attendance.correct",
    "content.view",
  ],
  park_admin: [
    "dashboard.view",
    "attendance.mark",
  ],
  murabbi: [
    "dashboard.view",
    "attendance.mark",
    "content.view",
  ],
  guardian: ["dashboard.view", "people.view", "guardians.manage", "reports.view"],
  student: ["dashboard.view", "people.view", "students.manage", "reports.view"],
};

export function isAccessCapability(value: string): value is AccessCapability {
  return (ACCESS_CAPABILITIES as readonly string[]).includes(value);
}

export function isUserRole(value: string | null | undefined): value is UserRole {
  return Boolean(value && Object.prototype.hasOwnProperty.call(ROLE_DEFAULT_CAPABILITIES, value));
}

export function isAccessCapabilityEffect(value: string): value is AccessCapabilityEffect {
  return value === "allow" || value === "deny";
}

export function roleHasDefaultCapability(role: UserRole | null | undefined, capability: AccessCapability): boolean {
  return Boolean(role && ROLE_DEFAULT_CAPABILITIES[role].includes(capability));
}

export function isActiveUserCapabilityOverride(
  override: UserCapabilityOverrideState | null | undefined,
  now: Date
): boolean {
  return Boolean(
    override &&
      override.isActive &&
      (!override.expiresAt || override.expiresAt.getTime() > now.getTime())
  );
}

/**
 * Resolves module access only. Callers must still perform resource-scope
 * authorization after this check. A malformed active override denies access.
 */
export function resolveEffectiveCapability(
  role: string | null | undefined,
  capability: AccessCapability,
  roleOverrideEffect: string | null | undefined,
  userOverride: UserCapabilityOverrideState | null | undefined,
  now: Date
): boolean {
  if (!isUserRole(role)) return false;

  if (userOverride && isActiveUserCapabilityOverride(userOverride, now)) {
    return userOverride.effect === "allow";
  }

  if (roleOverrideEffect !== null && roleOverrideEffect !== undefined) {
    return roleOverrideEffect === "allow";
  }

  return roleHasDefaultCapability(role, capability);
}
