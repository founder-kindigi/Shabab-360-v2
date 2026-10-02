import { NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope, type SessionUser } from "@/lib/auth/authorize";

const REVIEW_ROLES = ["super_admin", "program_admin", "city_head"] as const;

export async function requireTrainingReviewer(): Promise<{ user: SessionUser } | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  if (!REVIEW_ROLES.includes(auth.user.role as (typeof REVIEW_ROLES)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return requireCapability("admissions.manage", auth.user);
}

export function requireTrainingCity(user: SessionUser, cityId: string) {
  return requireResourceScope(user, { cityId }, REVIEW_ROLES);
}

export function reviewerCity(user: SessionUser, requestedCityId?: string) {
  if (user.role === "city_head") {
    if (!user.assignedCityId || (requestedCityId && requestedCityId !== user.assignedCityId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return user.assignedCityId;
  }
  return requestedCityId ?? null;
}
