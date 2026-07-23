import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  blockListQuerySchema,
  createBlockSchema,
  validateNotOffDay,
  validateCategoryTeamMapping,
} from "@/lib/content-planner/validation";
import { queryValidationError } from "@/lib/api/query-params";
import {
  canReadContentPlan,
  canWriteContentPlan,
  verifyTeamInCity,
  CATEGORY_TO_TEAM_CODE,
} from "@/lib/content-planner/scope";
import type { SessionUser } from "@/lib/auth/scope";

/**
 * GET /api/admin/content-planner/blocks
 * List blocks for a session
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const searchParams = request.nextUrl.searchParams;
  const queryObject = Object.fromEntries(searchParams.entries());
  const parsed = blockListQuerySchema.safeParse(queryObject);

  if (!parsed.success) {
    return NextResponse.json(queryValidationError(parsed.error), {
      status: 400,
    });
  }

  const { sessionId, page, pageSize, category, teamId, status } = parsed.data;

  // Verify access to the session's plan
  const session = await db.contentPlanSession.findUnique({
    where: { id: sessionId },
    select: { planId: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const canRead = await canReadContentPlan(
    auth.user as SessionUser,
    session.planId
  );
  if (!canRead) {
    return NextResponse.json(
      { error: "Access denied: cannot read this session" },
      { status: 403 }
    );
  }

  // Build where clause
  const where: {
    sessionId: string;
    category?: string;
    teamId?: string;
    status?: string;
  } = { sessionId };

  if (category) where.category = category;
  if (teamId) where.teamId = teamId;
  if (status) where.status = status;

  const skip = (page - 1) * pageSize;

  const [blocks, total] = await Promise.all([
    db.contentPlanBlock.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        team: {
          select: { id: true, name: true, code: true },
        },
        resources: {
          select: { id: true, label: true, url: true, kind: true },
        },
        _count: { select: { activities: true } },
      },
    }),
    db.contentPlanBlock.count({ where }),
  ]);

  return NextResponse.json({
    blocks,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

/**
 * POST /api/admin/content-planner/blocks
 * Create a new content block (managers only)
 * Enforces: approved categories only, team-category mapping, no blocks on off-days
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const parsed = createBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { sessionId, teamId, category, ...blockData } = parsed.data;

  // Verify session exists, get plan scope, and check if off-day
  const session = await db.contentPlanSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      planId: true,
      isOffDay: true,
      plan: {
        select: { cityId: true, batchId: true, parkId: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Enforce: off-days have zero blocks
  try {
    validateNotOffDay(session.isOffDay);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }

  // Verify write permission
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    session.plan.cityId,
    session.plan.batchId,
    session.plan.parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot create block in this plan" },
      { status: 403 }
    );
  }

  // Verify team exists and belongs to the plan's city
  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    select: { id: true, cityId: true, code: true, isActive: true },
  });

  if (!team || !team.isActive) {
    return NextResponse.json(
      { error: "Team not found or inactive" },
      { status: 404 }
    );
  }

  if (team.cityId !== session.plan.cityId) {
    return NextResponse.json(
      { error: "Team must belong to the same city as the plan" },
      { status: 400 }
    );
  }

  // Enforce: category must match team code mapping
  try {
    validateCategoryTeamMapping(category, team.code);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }

  // Check for duplicate category at this sortOrder
  const existingBlock = await db.contentPlanBlock.findUnique({
    where: {
      sessionId_category_sortOrder: {
        sessionId,
        category,
        sortOrder: blockData.sortOrder || 0,
      },
    },
  });

  if (existingBlock) {
    return NextResponse.json(
      {
        error: `A block with category '${category}' and sortOrder ${blockData.sortOrder || 0} already exists for this session`,
      },
      { status: 409 }
    );
  }

  // Create the block
  const block = await db.contentPlanBlock.create({
    data: {
      ...blockData,
      sessionId,
      teamId,
      category,
    },
    include: {
      team: {
        select: { id: true, name: true, code: true },
      },
      session: {
        select: {
          id: true,
          sessionDate: true,
          plan: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Audit log (redact source workbook content)
  await logAudit({
    userId: auth.user.id!,
    action: "create",
    entityType: "content_plan_block",
    entityId: block.id,
    newValues: {
      sessionId: block.sessionId,
      teamId: block.teamId,
      category: block.category,
      title: block.title,
      status: block.status,
    },
  });

  return NextResponse.json(block, { status: 201 });
}
