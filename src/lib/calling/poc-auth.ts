import { db as defaultDb } from "@/lib/db";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";

export async function verifyCallingManagerOrPoc(
  user: { id: string; role?: string | null },
  campaignId: string,
  prisma: any = defaultDb
) {
  const campaign = await prisma.callingCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    return { error: "Campaign not found", status: 404, campaign: null };
  }

  // Check management capability first
  const canManagePoc = await userHasCapability(user, "calling.poc.manage");
  if (canManagePoc) {
    const resolved = await resolveActorCity(user, campaign.cityId, prisma);
    if (resolved.error) {
      return { error: resolved.error, status: resolved.status, campaign: null };
    }
    return { campaign, isPoc: false, isManager: true, cityId: campaign.cityId, error: null, status: 200 };
  }

  // Check active Calling POC assignment
  const staffMeta = await prisma.staffMeta.findUnique({
    where: { userId: user.id },
  });

  if (!staffMeta || !staffMeta.isActive) {
    return { error: "Forbidden: insufficient calling permissions", status: 403, campaign: null };
  }

  const now = new Date();
  const pocAssignment = await prisma.callingPOCAssignment.findFirst({
    where: {
      campaignId,
      isActive: true,
      eventResponsibility: {
        assignedToStaffMetaId: staffMeta.id,
        isActive: true,
        revokedAt: null,
        startDate: { lte: now },
        endDate: { gte: now },
        cityId: campaign.cityId,
      },
    },
    include: { eventResponsibility: true },
  });

  if (!pocAssignment) {
    return { error: "Forbidden: no active Calling POC assignment for this campaign", status: 403, campaign: null };
  }

  return { campaign, isPoc: true, isManager: false, cityId: campaign.cityId, error: null, status: 200 };
}
