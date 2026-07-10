import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole, StaffRole } from "@/types";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

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

  return { user };
}

/**
 * Check if the user's assigned city matches the required cityId.
 */
export function requireCityScope(user: SessionUser, cityId: string): boolean {
  // Super admin and program admin bypass city scope
  if (user.role === "super_admin" || user.role === "program_admin") {
    return true;
  }
  // City head must match their assigned city
  if (user.role === "city_head") {
    return user.assignedCityId === cityId;
  }
  // Park staff inherit city scope from their park
  if (user.role === "park_admin" || user.role === "park_lead" || user.role === "murabbi") {
    // Will be checked via park scope
    return true;
  }
  return false;
}

/**
 * Check if the user's assigned park matches the required parkId.
 */
export function requireParkScope(user: SessionUser, parkId: string): boolean {
  if (user.role === "super_admin" || user.role === "program_admin") {
    return true;
  }
  if (user.role === "city_head") {
    // City head can access all parks in their city - checked at query level
    return true;
  }
  if (user.role === "park_admin" || user.role === "park_lead") {
    return user.assignedParkId === parkId;
  }
  if (user.role === "murabbi") {
    return user.assignedParkId === parkId;
  }
  return false;
}

/**
 * Check if the user's assigned group matches the required groupId.
 */
export function requireGroupScope(user: SessionUser, groupId: string): boolean {
  if (user.role === "super_admin" || user.role === "program_admin") {
    return true;
  }
  if (user.role === "city_head" || user.role === "park_admin" || user.role === "park_lead") {
    return true;
  }
  if (user.role === "murabbi") {
    return user.assignedGroupId === groupId;
  }
  return false;
}