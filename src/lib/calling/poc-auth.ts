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
    return {
      error: "Campaign not found",
      status: 404,
      campaign: null,
      isManager: false,
      isPoc: false,
      isExternalCaller: false,
    };
  }

  // 1. Check management capability first
  const sessionUser = { ...user, role: user.role ?? undefined } as any;
  const canManagePoc = await userHasCapability(sessionUser, "calling.poc.manage");
  if (canManagePoc) {
    const resolved = await resolveActorCity(user, campaign.cityId, prisma);
    if (resolved.error) {
      return {
        error: resolved.error,
        status: resolved.status,
        campaign: null,
        isManager: false,
        isPoc: false,
        isExternalCaller: false,
      };
    }
    return {
      campaign,
      isPoc: false,
      isManager: true,
      isExternalCaller: false,
      cityId: campaign.cityId,
      error: null,
      status: 200,
    };
  }

  const now = new Date();

  // 2. Check active Calling POC assignment
  const staffMeta = await prisma.staffMeta.findUnique({
    where: { userId: user.id },
  });

  if (staffMeta && staffMeta.isActive) {
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

    if (pocAssignment) {
      return {
        campaign,
        isPoc: true,
        isManager: false,
        isExternalCaller: false,
        cityId: campaign.cityId,
        error: null,
        status: 200,
      };
    }
  }

  // 3. Check active, non-revoked, non-expired ExternalSupportCaller in campaign's city
  const extCaller = await prisma.externalSupportCaller.findFirst({
    where: {
      userId: user.id,
      campaignId,
      isActive: true,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      campaign: { select: { cityId: true } },
    },
  });

  if (extCaller && extCaller.campaign) {
    if (extCaller.campaign.cityId === campaign.cityId) {
      return {
        campaign,
        isPoc: false,
        isManager: false,
        isExternalCaller: true,
        cityId: campaign.cityId,
        error: null,
        status: 200,
      };
    }
  }

  return {
    error: "Forbidden: insufficient calling permissions",
    status: 403,
    campaign: null,
    isManager: false,
    isPoc: false,
    isExternalCaller: false,
  };
}
