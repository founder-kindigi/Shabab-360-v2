import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isHqRole, isStaffRole, type SessionUser } from "./scope";
import { requireResourceScope } from "./authorize";
import type { StaffRole } from "@/types";

type Selection = { cityId?: string | null; parkId?: string | null; groupId?: string | null };
export type Hierarchy = { kind: "hq" | "city" | "park" | "group"; cityId: string | null; parkId: string | null; groupId: string | null };
const forbidden = () => NextResponse.json({ error: "Required hierarchy scope is missing or conflicts with the requested resource" }, { status: 403 });

/** A present group park always wins. Legacy fallback is only for null group parks. */
export function groupResourceScope(group: any): { cityId: string; parkId: string; groupId: string } | null {
  const park = group?.parkId ? group.park : group?.batch?.park;
  const parkId = group?.parkId ?? group?.batch?.parkId;
  const cityId = park?.cityId;
  if (!group?.id || !parkId || !cityId) return null;
  if (group.batch?.cityId && group.batch.cityId !== cityId) return null;
  return { cityId, parkId, groupId: group.id };
}

export const groupHierarchyInclude = { park: true, batch: { include: { park: true } } } as const;

export function requireResolvedGroupScope(user: SessionUser, group: any, roles?: readonly StaffRole[]) {
  const scope = groupResourceScope(group);
  if (!scope) return forbidden();
  return roles ? requireResourceScope(user, scope, roles) : requireResourceScope(user, scope);
}

/** Resolve validated assignments, then intersect every requested filter. */
export async function resolveRequestedHierarchy(user: SessionUser, requested: Selection = {}, prisma: any = db): Promise<Hierarchy | NextResponse> {
  if (!user.id || user.mustResetPwd || !isStaffRole(user.role)) return forbidden();
  const role = user.role!;
  const scope: Hierarchy = { kind: "hq", cityId: null, parkId: null, groupId: null };
  if (role === "city_head") {
    if (!user.assignedCityId) return forbidden();
    scope.kind = "city";
    scope.cityId = user.assignedCityId;
  } else if (role === "park_admin" || role === "park_lead") {
    if (!user.assignedParkId) return forbidden();
    const park = await prisma.park.findUnique({ where: { id: user.assignedParkId } });
    if (!park || park.isActive === false || (user.assignedCityId && user.assignedCityId !== park.cityId)) return forbidden();
    Object.assign(scope, { kind: "park", cityId: park.cityId, parkId: park.id });
  } else if (role === "murabbi") {
    if (!user.assignedGroupId) return forbidden();
    const group = await prisma.group.findUnique({ where: { id: user.assignedGroupId }, include: groupHierarchyInclude });
    const resolved = groupResourceScope(group);
    if (!resolved || (user.assignedCityId && user.assignedCityId !== resolved.cityId) || (user.assignedParkId && user.assignedParkId !== resolved.parkId)) return forbidden();
    Object.assign(scope, resolved, { kind: "group" });
  } else if (!isHqRole(role)) return forbidden();

  let selected: Selection = { ...requested };
  if (requested.groupId) {
    const group = await prisma.group.findUnique({ where: { id: requested.groupId }, include: groupHierarchyInclude });
    const resolved = groupResourceScope(group);
    if (!resolved || (requested.parkId && requested.parkId !== resolved.parkId) || (requested.cityId && requested.cityId !== resolved.cityId)) return forbidden();
    selected = { ...selected, ...resolved };
  } else if (requested.parkId) {
    const park = await prisma.park.findUnique({ where: { id: requested.parkId } });
    if (!park || park.isActive === false || (requested.cityId && requested.cityId !== park.cityId)) return forbidden();
    selected = { ...selected, parkId: park.id, cityId: park.cityId };
  }
  for (const key of ["cityId", "parkId", "groupId"] as const) {
    if (selected[key] && scope[key] && selected[key] !== scope[key]) return forbidden();
    if (selected[key]) scope[key] = selected[key]!;
  }
  return scope;
}

/** Park/city financial records have no group boundary; a group grant cannot expand it. */
export async function resolveCityParkScope(user: SessionUser, requested: Selection = {}, prisma: any = db) {
  const scope = await resolveRequestedHierarchy(user, requested, prisma);
  if (scope instanceof NextResponse || scope.kind === "group") return scope instanceof NextResponse ? scope : forbidden();
  return scope;
}

export function groupParkWhere(parkId: string) {
  return { OR: [{ parkId }, { parkId: null, batch: { parkId } }] };
}

export function hierarchyGroupWhere(scope: Hierarchy) {
  return {
    ...(scope.groupId ? { id: scope.groupId } : {}),
    ...(scope.parkId ? groupParkWhere(scope.parkId) : {}),
    ...(scope.cityId ? { AND: [{ OR: [{ park: { cityId: scope.cityId } }, { parkId: null, batch: { park: { cityId: scope.cityId } } }] }] } : {}),
  };
}
