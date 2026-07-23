import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  contentPlanListQuerySchema,
  createContentPlanSchema,
} from "@/lib/content-planner/validation";
import { queryValidationError } from "@/lib/api/query-params";
import {
  buildContentPlanScopeFilter,
  canWriteContentPlan,
  CONTENT_PLANNER_READER_ROLES,
} from "@/lib/content-planner/scope";
import type { SessionUser } from "@/lib/auth/scope";

/**
 * GET /api/admin/content-planner/plans
 * List content plans with server-derived scope enforcement
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryObject = Object.fromEntries(searchParams.entries());
  const parsed = contentPlanListQuerySchema.safeParse(queryObject);

  if (!parsed.success) {
    return NextResponse.json(queryValidationError(parsed.error), {
      status: 400,
    });
  }

  const { page, pageSize, cityId, batchId, parkId, status, kind, search } =
    parsed.data;

  // Build scope filter - request params may only narrow scope
  const scopeFilter = await buildContentPlanScopeFilter(
    auth.user as SessionUser,
    cityId,
    batchId,
    parkId
  );

  if (!scopeFilter) {
    return NextResponse.json(
      { error: "Access denied: insufficient scope" },
      { status: 403 }
    );
  }

  // Apply additional filters
  const where: any = { ...scopeFilter };

  if (status) where.status = status;
  if (kind) where.kind = kind;
  if (search) {
    where.OR = [{ name: { contains: search, mode: "insensitive" } }];
  }

  const skip = (page - 1) * pageSize;

  const [plans, total] = await Promise.all([
    db.contentPlan.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        city: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true } },
        park: { select: { id: true, name: true } },
        basePlan: { select: { id: true, name: true } },
        _count: { select: { sessions: true, overrides: true } },
      },
    }),
    db.contentPlan.count({ where }),
  ]);

  return NextResponse.json({
    plans,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

/**
 * POST /api/admin/content-planner/plans
 * Create a new content plan (managers only)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = createContentPlanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { cityId, batchId, parkId, basePlanId, ...planData } = parsed.data;

  // Verify write permission for the target scope
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    cityId,
    batchId,
    parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot create plan in this scope" },
      { status: 403 }
    );
  }

  // Verify city exists and is active
  const city = await db.city.findUnique({
    where: { id: cityId },
    select: { id: true, isActive: true },
  });

  if (!city || !city.isActive) {
    return NextResponse.json(
      { error: "City not found or inactive" },
      { status: 404 }
    );
  }

  // Verify batch belongs to city if provided
  if (batchId) {
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      select: { cityId: true, isActive: true },
    });

    if (!batch || !batch.isActive || batch.cityId !== cityId) {
      return NextResponse.json(
        { error: "Batch not found, inactive, or does not belong to city" },
        { status: 400 }
      );
    }
  }

  // Verify park belongs to city if provided
  if (parkId) {
    const park = await db.park.findUnique({
      where: { id: parkId },
      select: { cityId: true, isActive: true },
    });

    if (!park || !park.isActive || park.cityId !== cityId) {
      return NextResponse.json(
        { error: "Park not found, inactive, or does not belong to city" },
        { status: 400 }
      );
    }
  }

  // Verify basePlan exists and user can access it if provided
  if (basePlanId) {
    const basePlan = await db.contentPlan.findUnique({
      where: { id: basePlanId },
      select: { id: true, cityId: true, kind: true },
    });

    if (!basePlan) {
      return NextResponse.json(
        { error: "Base plan not found" },
        { status: 404 }
      );
    }

    // Base plan must be in the same city and must be a template
    if (basePlan.cityId !== cityId) {
      return NextResponse.json(
        { error: "Base plan must be in the same city" },
        { status: 400 }
      );
    }

    if (basePlan.kind !== "template") {
      return NextResponse.json(
        { error: "Base plan must be a template, not an override" },
        { status: 400 }
      );
    }
  }

  // Create the plan
  const plan = await db.contentPlan.create({
    data: {
      ...planData,
      cityId,
      batchId,
      parkId,
      basePlanId,
    },
    include: {
      city: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
      park: { select: { id: true, name: true } },
    },
  });

  // Audit log (redact source workbook data)
  await logAudit({
    userId: auth.user.id!,
    action: "create",
    entityType: "content_plan",
    entityId: plan.id,
    newValues: {
      name: plan.name,
      cityId: plan.cityId,
      batchId: plan.batchId,
      parkId: plan.parkId,
      kind: plan.kind,
      status: plan.status,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
