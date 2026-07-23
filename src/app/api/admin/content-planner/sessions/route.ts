import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  sessionListQuerySchema,
  createSessionSchema,
} from "@/lib/content-planner/validation";
import { queryValidationError } from "@/lib/api/query-params";
import {
  canReadContentPlan,
  canWriteContentPlan,
} from "@/lib/content-planner/scope";
import type { SessionUser } from "@/lib/auth/scope";

/**
 * GET /api/admin/content-planner/sessions
 * List sessions for a plan with date filtering
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const searchParams = request.nextUrl.searchParams;
  const queryObject = Object.fromEntries(searchParams.entries());
  const parsed = sessionListQuerySchema.safeParse(queryObject);

  if (!parsed.success) {
    return NextResponse.json(queryValidationError(parsed.error), {
      status: 400,
    });
  }

  const { planId, page, pageSize, startDate, endDate, status } = parsed.data;

  // Verify access to the plan
  const canRead = await canReadContentPlan(auth.user as SessionUser, planId);
  if (!canRead) {
    return NextResponse.json(
      { error: "Access denied: cannot read this plan" },
      { status: 403 }
    );
  }

  // Build where clause
  const where: {
    planId: string;
    sessionDate?: { gte?: Date; lte?: Date };
    status?: string;
  } = { planId };

  if (startDate || endDate) {
    where.sessionDate = {};
    if (startDate) where.sessionDate.gte = new Date(startDate);
    if (endDate) where.sessionDate.lte = new Date(endDate);
  }

  if (status) where.status = status;

  const skip = (page - 1) * pageSize;

  const [sessions, total] = await Promise.all([
    db.contentPlanSession.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { sessionDate: "asc" },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            city: { select: { name: true } },
          },
        },
        _count: { select: { blocks: true } },
      },
    }),
    db.contentPlanSession.count({ where }),
  ]);

  return NextResponse.json({
    sessions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

/**
 * POST /api/admin/content-planner/sessions
 * Create a new session for a plan (managers only)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json();
  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { planId, sessionDate, ...sessionData } = parsed.data;

  // Verify plan exists and get its scope
  const plan = await db.contentPlan.findUnique({
    where: { id: planId },
    select: { id: true, cityId: true, batchId: true, parkId: true, status: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Verify write permission
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    plan.cityId,
    plan.batchId,
    plan.parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot create session in this plan" },
      { status: 403 }
    );
  }

  // Check for duplicate session date in this plan
  const existingSession = await db.contentPlanSession.findUnique({
    where: {
      planId_sessionDate: {
        planId,
        sessionDate: new Date(sessionDate),
      },
    },
  });

  if (existingSession) {
    return NextResponse.json(
      { error: "A session already exists for this date in this plan" },
      { status: 409 }
    );
  }

  // Create the session
  const session = await db.contentPlanSession.create({
    data: {
      ...sessionData,
      planId,
      sessionDate: new Date(sessionDate),
    },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          city: { select: { name: true } },
        },
      },
    },
  });

  // Audit log (redact source row)
  await logAudit({
    userId: auth.user.id!,
    action: "create",
    entityType: "content_plan_session",
    entityId: session.id,
    newValues: {
      planId: session.planId,
      sessionDate: session.sessionDate,
      isOffDay: session.isOffDay,
      status: session.status,
    },
  });

  return NextResponse.json(session, { status: 201 });
}
