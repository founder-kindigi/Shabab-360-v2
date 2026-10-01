import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isHqRole, type SessionUser } from "./scope";
import { groupHierarchyInclude, groupResourceScope, resolveRequestedHierarchy } from "./hierarchy";
export async function visibleCities(user: SessionUser): Promise<{ unrestricted: boolean; cityIds: string[] } | NextResponse> {
  if (!user.id || user.mustResetPwd) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (isHqRole(user.role)) return { unrestricted: true, cityIds: [] };
  if (user.role !== "student" && user.role !== "guardian") {
    const scope = await resolveRequestedHierarchy(user);
    if (scope instanceof NextResponse) return scope;
    return { unrestricted: false, cityIds: scope.cityId ? [scope.cityId] : [] };
  }
  const participants = await db.participant.findMany({
    where: user.role === "student" ? { userId: user.id } : { guardianLinks: { some: { guardian: { userId: user.id, isActive: true } } } },
    include: { group: { include: groupHierarchyInclude } },
  });
  const cityIds = [...new Set(participants.map((p) => groupResourceScope(p.group)?.cityId).filter((id): id is string => Boolean(id)))];
  if (!cityIds.length) return NextResponse.json({ error: "Linked participant scope is required" }, { status: 403 });
  return { unrestricted: false, cityIds };
}
