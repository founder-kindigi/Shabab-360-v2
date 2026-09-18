import type { UserRole } from "@/types";

/**
 * Stable product-facing role labels.
 *
 * Internal database role names are deliberately unchanged; this map is the
 * only place where an internal name becomes an operator-facing label.
 * `program_admin` is presented as "Program Head". `super_admin` stays a
 * technical system-owner identity and is never presented as an operating role.
 */
export const PRODUCT_ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  super_admin: "System Owner",
  program_admin: "Program Head",
  city_head: "City Head",
  park_lead: "Park Lead",
  park_admin: "Park Admin",
  murabbi: "Murabbi",
  muawin: "Muawin",
  student: "Shabab",
  guardian: "Guardian",
};

/**
 * Resolve a stable product-facing label for a persisted role name. Unknown,
 * blank, or absent roles return null so a caller never has to guess a label.
 */
export function productRoleLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  const normalized = role.toLowerCase().trim() as UserRole;
  return PRODUCT_ROLE_LABELS[normalized] ?? null;
}
