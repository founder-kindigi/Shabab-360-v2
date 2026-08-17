import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  updateSessionSchema,
  archiveContentPlanSchema,
} from "@/lib/content-planner/validation";
import {
  canReadContentPlan,
  canWriteContentPlan,
} from "@/lib/content-planner/scope";
import type { SessionUser } from "@/lib/auth/scope";

/**
 * GET /api/admin/content-planner/sessions/[id]
 * Read a single session with its blocks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.view", auth.user);
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const session = await db.contentPlanSession.findUnique({
    where: { id },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          cityId: true,
          city: { select: { name: true } },
        },
      },
      blocks: {
        include: {
          team: { select: { id: true, name: true, code: true } },
          resources: true,
          _count: { select: { activities: true } },
        },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify read access to the plan
  const canRead = await canReadContentPlan(
    auth.user as SessionUser,
    session.plan.id
  );

  if (!canRead) {
    return NextResponse.json(
      { error: "Access denied: cannot read this session" },
      { status: 403 }
    );
  }

  return NextResponse.json(session);
}

/**
 * PATCH /api/admin/content-planner/sessions/[id]
 * Update session metadata (managers only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage", auth.user);
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const parsed = updateSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Fetch existing session
  const existingSession = await db.contentPlanSession.findUnique({
    where: { id },
    include: {
      plan: {
        select: { id: true, cityId: true, batchId: true, parkId: true },
      },
    },
  });

  if (!existingSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify write permission
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    existingSession.plan.cityId,
    existingSession.plan.batchId,
    existingSession.plan.parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot update session in this plan" },
      { status: 403 }
    );
  }

  const { sessionDate, ...otherUpdates } = parsed.data;

  // If changing session date, check for duplicate
  if (sessionDate) {
    const newDate = new Date(sessionDate);
    if (newDate.getTime() !== existingSession.sessionDate.getTime()) {
      const duplicate = await db.contentPlanSession.findUnique({
        where: {
          planId_sessionDate: {
            planId: existingSession.planId,
            sessionDate: newDate,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A session already exists for this date in this plan" },
          { status: 409 }
        );
      }
    }
  }

  // Update session
  const updated = await db.contentPlanSession.update({
    where: { id },
    data: {
      ...otherUpdates,
      ...(sessionDate && { sessionDate: new Date(sessionDate) }),
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

  // Audit log
  await logAudit({
    userId: auth.user.id!,
    action: "update",
    entityType: "content_plan_session",
    entityId: id,
    oldValues: {
      weekLabel: existingSession.weekLabel,
      dayLabel: existingSession.dayLabel,
      sessionDate: existingSession.sessionDate,
      focusArea: existingSession.focusArea,
      status: existingSession.status,
    },
    newValues: {
      weekLabel: updated.weekLabel,
      dayLabel: updated.dayLabel,
      sessionDate: updated.sessionDate,
      focusArea: updated.focusArea,
      status: updated.status,
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/admin/content-planner/sessions/[id]
 * Archive a session (soft delete, sets status to "cancelled")
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage", auth.user);
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = archiveContentPlanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Fetch existing session
  const existingSession = await db.contentPlanSession.findUnique({
    where: { id },
    include: {
      plan: {
        select: { id: true, cityId: true, batchId: true, parkId: true },
      },
    },
  });

  if (!existingSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify write permission
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    existingSession.plan.cityId,
    existingSession.plan.batchId,
    existingSession.plan.parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot archive session in this plan" },
      { status: 403 }
    );
  }

  // Archive (soft delete) by setting status to cancelled
  const archived = await db.contentPlanSession.update({
    where: { id },
    data: { status: "cancelled" },
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

  // Audit log
  await logAudit({
    userId: auth.user.id!,
    action: "archive",
    entityType: "content_plan_session",
    entityId: id,
    oldValues: { status: existingSession.status },
    newValues: {
      status: "cancelled",
      reason: parsed.data.reason || null,
    },
  });

  return NextResponse.json(archived);
}
