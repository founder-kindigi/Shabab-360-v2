import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { SessionUser } from "@/lib/auth/scope";
import { paginatedQuerySchema, queryParamsToObject, queryValidationError } from "@/lib/api/query-params";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = ["pending", "in_progress", "completed", "cancelled"];
const leadsQuerySchema = z
  .object({
    status: z.enum(VALID_STATUSES).optional(),
  })
  .merge(paginatedQuerySchema({ defaultPageSize: 50, maxPageSize: 100 }));

/**
 * GET /api/calling/campaigns/[id]/leads
 *
 * Fetches campaign assignments as sanitized lead items.
 *
 * Security & Scope Rules:
 * 1. Requires `calling.view` capability.
 * 2. Resolves campaign & actor city scope via `verifyCallingManagerOrPoc`.
 *    Authorizes managers, POCs, and active non-revoked non-expired external callers.
 * 3. Returns 404 for missing campaign, 403 for foreign city/scope or unauthorized actor.
 * 4. External callers and non-manager/non-POC callers list ONLY their assigned leads.
 * 5. For each lead:
 *    - `canInteract: true` ONLY if the authenticated active caller owns the assignment.
 *    - PII (applicantName, guardianPhone) included ONLY when `canInteract === true`.
 *    - Non-owner responses omit PII and NEVER expose raw StaffMeta / external IDs.
 * 6. Bounded status filter: rejects invalid values with 400.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as SessionUser;
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = { ...user, id: user.id };

  const { id: campaignId } = await params;

  // 1. Verify campaign & actor scope (managers, POCs, or valid external callers)
  const verified = await verifyCallingManagerOrPoc(actor, campaignId);
  if (verified.error || !verified.campaign) {
    return NextResponse.json(
      { error: verified.error || "Campaign authorization failed" },
      { status: verified.status || 403 }
    );
  }

  // 2. Validate bounded filters and pagination before querying.
  const { searchParams } = new URL(request.url);
  const rawQuery = queryParamsToObject(searchParams);
  if (rawQuery.status === "all") delete rawQuery.status;
  const query = leadsQuerySchema.safeParse(rawQuery);
  if (!query.success) return NextResponse.json(queryValidationError(query.error), { status: 400 });
  const { status: statusParam, page, pageSize } = query.data;

  // 3. Resolve active caller identity for user.id
  const [userStaffMeta, userExternalCallers] = await Promise.all([
    db.staffMeta.findFirst({
      where: { userId: actor.id, isActive: true },
      select: { id: true },
    }),
    db.externalSupportCaller.findMany({
      where: {
        userId: actor.id,
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

  // External callers and non-manager/non-POC callers list ONLY their assigned leads
  if (!verified.isManager && !verified.isPoc) {
    const orFilters: Prisma.CallingAssignmentWhereInput[] = [];
    if (myStaffMetaId) {
      orFilters.push({ callerStaffMetaId: myStaffMetaId });
    }
    if (myExternalIds.size > 0) {
      orFilters.push({ callerExternalId: { in: Array.from(myExternalIds) } });
    }
    if (orFilters.length > 0) {
      whereClause.OR = orFilters;
    } else {
      return NextResponse.json([]);
    }
  }

  // 5. Fetch assignments
  const [assignments, total] = await Promise.all([
    db.callingAssignment.findMany({
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.callingAssignment.count({ where: whereClause }),
  ]);

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

  return NextResponse.json({
    data: leads,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
