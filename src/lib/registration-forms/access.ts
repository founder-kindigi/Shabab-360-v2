import { NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope, type SessionUser } from "@/lib/auth/authorize";

const FORM_MANAGER_ROLES = ["super_admin", "program_admin", "city_head"] as const;

export async function requireFormManager(): Promise<{ user: SessionUser } | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  if (!FORM_MANAGER_ROLES.includes(auth.user.role as (typeof FORM_MANAGER_ROLES)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return requireCapability("admissions.manage", auth.user);
}

export function requireFormCity(user: SessionUser, ownerCityId: string) {
  return requireResourceScope(user, { cityId: ownerCityId }, FORM_MANAGER_ROLES);
}

export function scopedFormCity(user: SessionUser, requestedCityId?: string): string | NextResponse | null {
  if (user.role === "city_head") {
    if (!user.assignedCityId || (requestedCityId && requestedCityId !== user.assignedCityId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return user.assignedCityId;
  }
  return requestedCityId ?? null;
}
