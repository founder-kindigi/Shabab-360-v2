import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { SessionUser } from "@/lib/auth/scope";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = ["pending", "in_progress", "completed", "cancelled"];

/**
 * GET /api/calling/campaigns/[id]/leads
 *
 * Fetches campaign assignments as sanitized lead items.
 *
 * Security & Scope Rules:
 * 1. Requires `calling.view` capability.
 * 2. Resolves campaign & actor city scope via `verifyCallingManagerOrPoc`.
 * 3. Returns 404 for missing campaign, 403 for foreign city/scope.
 * 4. For each lead:
 *    - `canInteract: true` ONLY if the authenticated active caller owns the assignment.
 *    - PII (applicantName, guardianPhone) included ONLY when `canInteract === true`.
 *    - Non-owner responses omit PII and NEVER expose raw StaffMeta / external IDs.
 * 5. Bounded status filter: rejects invalid values with 400.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as SessionUser;

  const { id: campaignId } = await params;

  // 1. Verify campaign & actor scope
  const verified = await verifyCallingManagerOrPoc(user, campaignId);
  if (verified.error || !verified.campaign) {
    return NextResponse.json(
      { error: verified.error || "Campaign authorization failed" },
      { status: verified.status || 403 }
    );
  }

  // 2. Validate status parameter
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  if (
    statusParam &&
    statusParam !== "all" &&
    !VALID_STATUSES.includes(statusParam)
  ) {
    return NextResponse.json(
      {
        error: `Invalid status parameter. Allowed values: ${VALID_STATUSES.join(
          ", "
        )}`,
      },
      { status: 400 }
    );
  }

  // 3. Resolve active caller identity for user.id
  const [userStaffMeta, userExternalCallers] = await Promise.all([
    db.staffMeta.findFirst({
      where: { userId: user.id, isActive: true },
      select: { id: true },
    }),
    db.externalSupportCaller.findMany({
      where: {
        userId: user.id,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    }),
  ]);

  const myStaffMetaId = userStaffMeta?.id ?? null;
  const myExternalIds = new Set(userExternalCallers.map((e) => e.id));

  // 4. Build query filter
  const whereClause: Prisma.CallingAssignmentWhereInput = {
    campaignId,
    isActive: true,
  };
  if (statusParam && statusParam !== "all") {
    whereClause.status = statusParam;
  }

  // 5. Fetch assignments
  const assignments = await db.callingAssignment.findMany({
    where: whereClause,
    include: {
      application: {
        select: {
          id: true,
          applicantName: true,
          guardianPhone: true,
          status: true,
        },
      },
      interactions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { outcome: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 6. Map to sanitized lead objects
  const leads = assignments.map((assignment) => {
    const isStaffOwner = Boolean(
      myStaffMetaId && assignment.callerStaffMetaId === myStaffMetaId
    );
    const isExternalOwner = Boolean(
      assignment.callerExternalId &&
        myExternalIds.has(assignment.callerExternalId)
    );
    const canInteract = isStaffOwner || isExternalOwner;

    const latestOutcome = assignment.interactions[0]?.outcome ?? null;

    return {
      id: assignment.id,
      applicationId: assignment.applicationId,
      status: assignment.status,
      outcome: latestOutcome,
      canInteract,
      // Never expose raw callerStaffMetaId or callerExternalId
      application: assignment.application
        ? {
            status: assignment.application.status,
            ...(canInteract
              ? {
                  applicantName: assignment.application.applicantName,
                  guardianPhone: assignment.application.guardianPhone,
                }
              : {}),
          }
        : null,
    };
  });

  return NextResponse.json(leads);
}
