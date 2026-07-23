import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  updateContentPlanSchema,
  archiveContentPlanSchema,
} from "@/lib/content-planner/validation";
import {
  canReadContentPlan,
  canWriteContentPlan,
} from "@/lib/content-planner/scope";
import type { SessionUser } from "@/lib/auth/scope";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/content-planner/plans/[id]
 * Get a specific content plan with scope check
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await context.params;

  const canRead = await canReadContentPlan(auth.user as SessionUser, id);
  if (!canRead) {
    return NextResponse.json(
      { error: "Access denied: cannot read this plan" },
      { status: 403 }
    );
  }

  const plan = await db.contentPlan.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true, code: true } },
      batch: { select: { id: true, name: true } },
      park: { select: { id: true, name: true } },
      basePlan: { select: { id: true, name: true, kind: true } },
      overrides: {
        select: {
          id: true,
          name: true,
          park: { select: { id: true, name: true } },
          status: true,
        },
      },
      sessions: {
        select: {
          id: true,
          sessionDate: true,
          weekLabel: true,
          dayLabel: true,
          isOffDay: true,
          status: true,
          _count: { select: { blocks: true } },
        },
        orderBy: { sessionDate: "asc" },
      },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

/**
 * PATCH /api/admin/content-planner/plans/[id]
 * Update a content plan (managers only)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await context.params;

  // Verify plan exists and get its scope
  const existingPlan = await db.contentPlan.findUnique({
    where: { id },
    select: { id: true, cityId: true, batchId: true, parkId: true, name: true, status: true },
  });

  if (!existingPlan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Verify write permission
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    existingPlan.cityId,
    existingPlan.batchId,
    existingPlan.parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot update this plan" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updateContentPlanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updatedPlan = await db.contentPlan.update({
    where: { id },
    data: parsed.data,
    include: {
      city: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
      park: { select: { id: true, name: true } },
    },
  });

  // Audit log (redact source workbook)
  await logAudit({
    userId: auth.user.id!,
    action: "update",
    entityType: "content_plan",
    entityId: id,
    oldValues: {
      name: existingPlan.name,
      status: existingPlan.status,
    },
    newValues: {
      name: updatedPlan.name,
      status: updatedPlan.status,
    },
  });

  return NextResponse.json(updatedPlan);
}

/**
 * DELETE /api/admin/content-planner/plans/[id]/archive
 * Archive a content plan (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await context.params;

  // Verify plan exists and get its scope
  const existingPlan = await db.contentPlan.findUnique({
    where: { id },
    select: { id: true, cityId: true, batchId: true, parkId: true, name: true, status: true },
  });

  if (!existingPlan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Verify write permission
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    existingPlan.cityId,
    existingPlan.batchId,
    existingPlan.parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot archive this plan" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = archiveContentPlanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Archive the plan (status = archived)
  const archivedPlan = await db.contentPlan.update({
    where: { id },
    data: { status: "archived" },
  });

  // Audit log
  await logAudit({
    userId: auth.user.id!,
    action: "archive",
    entityType: "content_plan",
    entityId: id,
    reason: parsed.data.reason,
    oldValues: { status: existingPlan.status },
    newValues: { status: "archived" },
  });

  return NextResponse.json({ success: true, plan: archivedPlan });
}
