import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/scope";
import { isHqRole } from "@/lib/auth/scope";
import { groupHierarchyInclude, groupResourceScope, resolveRequestedHierarchy } from "@/lib/auth/hierarchy";

/** HQ selects an explicit city. Family access derives from an active ownership link. */
export async function resolveActorCity(user: SessionUser, providedCityId?: string | null, prisma: any = db): Promise<string | null> {
  if (!user.id || user.mustResetPwd) return null;
  if (isHqRole(user.role)) {
    if (!providedCityId) return null;
    return (await prisma.city.findUnique({ where: { id: providedCityId }, select: { id: true } }))?.id ?? null;
  }
  if (user.role === "student" || user.role === "guardian") {
    const participants = await prisma.participant.findMany({
      where: user.role === "student" ? { userId: user.id } : { guardianLinks: { some: { guardian: { userId: user.id, isActive: true } } } },
      include: { group: { include: groupHierarchyInclude } },
    });
    const cities = new Set<string>(participants.map((p: any) => groupResourceScope(p.group)?.cityId).filter(Boolean));
    return providedCityId ? (cities.has(providedCityId) ? providedCityId : null) : (cities.size === 1 ? [...cities][0] : null);
  }
  const scope = await resolveRequestedHierarchy(user, { cityId: providedCityId }, prisma);
  return scope instanceof NextResponse ? null : scope.cityId;
}

/** City, park and group boundaries all use the participant's authoritative group park. */
export async function canAccessParticipantProfile(user: SessionUser, participantId: string, resolvedCity: string, prisma: any = db): Promise<boolean> {
  if (!user.id || user.mustResetPwd) return false;
  const participant = await prisma.participant.findUnique({ where: { id: participantId }, include: { group: { include: groupHierarchyInclude } } });
  const resource = groupResourceScope(participant?.group);
  if (!participant || !resource || resource.cityId !== resolvedCity) return false;
  if (user.role === "student") return participant.userId === user.id;
  if (user.role === "guardian") return Boolean(await prisma.guardianChild.findFirst({ where: { participantId, guardian: { userId: user.id, isActive: true } } }));
  return !((await resolveRequestedHierarchy(user, resource, prisma)) instanceof NextResponse);
}
