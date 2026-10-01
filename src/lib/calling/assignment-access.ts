import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/scope";
import { verifyCallingManagerOrPoc } from "./poc-auth";
import { resolveActorCity } from "@/lib/auth/events-scope";

export async function activeCallingPrincipal(user: SessionUser, campaignId: string, prisma: any = db) {
  if (!user.id || user.mustResetPwd) return null;
  const verified = await verifyCallingManagerOrPoc(user as { id: string; role?: string }, campaignId, prisma);
  if (verified.status === 404) return null;
  if (!verified.error && verified.campaign) return { campaign: verified.campaign, manager: true, staffId: null, externalId: null };
  const now = new Date();
  const campaign = await prisma.callingCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return null;
  const external = await prisma.externalSupportCaller.findFirst({ where: { userId: user.id, campaignId, isActive: true, revokedAt: null, expiresAt: { gt: now } } });
  if (external) return { campaign, manager: false, staffId: null, externalId: external.id };
  const staff = await prisma.staffMeta.findFirst({ where: { userId: user.id, isActive: true } });
  if (!staff) return null;
  const city = await resolveActorCity({ id: user.id, role: staff.role }, campaign.cityId, prisma);
  if (city.error) return null;
  return { campaign, manager: false, staffId: staff.id, externalId: null };
}

export function ownsCallingAssignment(principal: NonNullable<Awaited<ReturnType<typeof activeCallingPrincipal>>>, assignment: any) {
  return principal.manager || Boolean((principal.staffId && assignment.callerStaffMetaId === principal.staffId) || (principal.externalId && assignment.callerExternalId === principal.externalId));
}
