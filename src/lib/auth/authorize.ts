import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole, StaffRole } from "@/types";
import {
  ATTENDANCE_ROLES,
  canAccessResourceScope,
  isHqRole,
  isStaffRole,
  ORGANIZATION_MANAGEMENT_ROLES,
  STAFF_ROLES,
  type ResourceScope,
  type SessionUser,
} from "@/lib/auth/scope";
import { userHasCapability } from "@/lib/auth/capability-access";
import type { AccessCapability } from "@/lib/auth/capabilities";

export {
  ATTENDANCE_ROLES,
  ORGANIZATION_MANAGEMENT_ROLES,
  STAFF_ROLES,
  canAccessResourceScope,
  isHqRole,
  isStaffRole,
};
export type { ResourceScope, SessionUser };

/**
 * Check if the current user has one of the allowed roles.
 * Returns null if authorized, or a 401/403 response if not.
 */
export async function requireRole(roles: (UserRole | StaffRole)[]): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.role || !roles.includes(user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.mustResetPwd) {
    return NextResponse.json({ error: "Password reset required" }, { status: 403 });
  }

  return null;
}

/**
 * Get the current session user, or return 401.
 */
export async function requireAuth(): Promise<{ user: SessionUser } | NextResponse> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.mustResetPwd) {
    return NextResponse.json({ error: "Password reset required" }, { status: 403 });
  }

  return { user };
}

/**
 * Enforce a module capability before any resource-scope check. This is not a
 * substitute for requireResourceScope on city, park, group, or record data.
 */
export async function requireCapability(
  capability: AccessCapability
): Promise<{ user: SessionUser } | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (!(await userHasCapability(auth.user, capability))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return auth;
}

export function requireResourceScope(
  user: SessionUser,
  scope: ResourceScope,
  allowedRoles: readonly StaffRole[] = STAFF_ROLES
): NextResponse | null {
  if (!canAccessResourceScope(user, scope, allowedRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

/**
 * Check if the user's assigned city matches the required cityId.
 */
export function requireCityScope(user: SessionUser, cityId: string): boolean {
  return canAccessResourceScope(user, { cityId });
}

/**
 * Check if the user's assigned park matches the required parkId.
 */
export function requireParkScope(user: SessionUser, parkId: string): boolean {
  return canAccessResourceScope(user, { parkId });
}

/**
 * Check if the user's assigned group matches the required groupId.
 */
export function requireGroupScope(user: SessionUser, groupId: string): boolean {
  return canAccessResourceScope(user, { groupId });
}
