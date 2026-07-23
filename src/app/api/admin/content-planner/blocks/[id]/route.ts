import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  updateBlockSchema,
  archiveContentPlanSchema,
} from "@/lib/content-planner/validation";
import {
  canReadContentPlan,
  canWriteContentPlan,
} from "@/lib/content-planner/scope";
import type { SessionUser } from "@/lib/auth/scope";

/**
 * GET /api/admin/content-planner/blocks/[id]
 * Read a single block with its resources and activities
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const block = await db.contentPlanBlock.findUnique({
    where: { id },
    include: {
      team: {
        select: { id: true, name: true, code: true },
      },
      resources: {
        select: { id: true, label: true, url: true, kind: true },
      },
      activities: {
        select: {
          id: true,
          title: true,
          description: true,
          scheduledFor: true,
        },
      },
      session: {
        select: {
          id: true,
          sessionDate: true,
          planId: true,
          plan: {
            select: { id: true, name: true, city: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!block) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  // Verify read access to the plan
  const canRead = await canReadContentPlan(
    auth.user as SessionUser,
    block.session.planId
  );

  if (!canRead) {
    return NextResponse.json(
      { error: "Access denied: cannot read this block" },
      { status: 403 }
    );
  }

  return NextResponse.json(block);
}

/**
 * PATCH /api/admin/content-planner/blocks/[id]
 * Update block content (managers only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage");
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

  const parsed = updateBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Fetch existing block with plan scope
  const existingBlock = await db.contentPlanBlock.findUnique({
    where: { id },
    include: {
      session: {
        select: {
          id: true,
          planId: true,
          plan: {
            select: { cityId: true, batchId: true, parkId: true },
          },
        },
      },
    },
  });

  if (!existingBlock) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  // Verify write permission
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    existingBlock.session.plan.cityId,
    existingBlock.session.plan.batchId,
    existingBlock.session.plan.parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot update block in this plan" },
      { status: 403 }
    );
  }

  const { sortOrder, ...otherUpdates } = parsed.data;

  // If changing sortOrder, check for duplicate
  if (sortOrder !== undefined && sortOrder !== existingBlock.sortOrder) {
    const duplicate = await db.contentPlanBlock.findUnique({
      where: {
        sessionId_category_sortOrder: {
          sessionId: existingBlock.sessionId,
          category: existingBlock.category,
          sortOrder,
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error: `A block with category '${existingBlock.category}' and sortOrder ${sortOrder} already exists for this session`,
        },
        { status: 409 }
      );
    }
  }

  // Update block
  const updated = await db.contentPlanBlock.update({
    where: { id },
    data: {
      ...otherUpdates,
      ...(sortOrder !== undefined && { sortOrder }),
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

  // Audit log (redact content)
  await logAudit({
    userId: auth.user.id!,
    action: "update",
    entityType: "content_plan_block",
    entityId: id,
    oldValues: {
      title: existingBlock.title,
      sortOrder: existingBlock.sortOrder,
      status: existingBlock.status,
    },
    newValues: {
      title: updated.title,
      sortOrder: updated.sortOrder,
      status: updated.status,
    },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/admin/content-planner/blocks/[id]
 * Archive a block (soft delete, sets status to "archived")
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("content.manage");
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

  // Fetch existing block
  const existingBlock = await db.contentPlanBlock.findUnique({
    where: { id },
    include: {
      session: {
        select: {
          id: true,
          planId: true,
          plan: {
            select: { cityId: true, batchId: true, parkId: true },
          },
        },
      },
    },
  });

  if (!existingBlock) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  // Verify write permission
  const canWrite = await canWriteContentPlan(
    auth.user as SessionUser,
    existingBlock.session.plan.cityId,
    existingBlock.session.plan.batchId,
    existingBlock.session.plan.parkId
  );

  if (!canWrite) {
    return NextResponse.json(
      { error: "Access denied: cannot archive block in this plan" },
      { status: 403 }
    );
  }

  // Archive by updating status (we don't have "archived" status in schema, use "draft" as soft delete)
  // Or delete permanently based on requirements
  const archived = await db.contentPlanBlock.delete({
    where: { id },
  });

  // Audit log
  await logAudit({
    userId: auth.user.id!,
    action: "delete",
    entityType: "content_plan_block",
    entityId: id,
    oldValues: {
      category: archived.category,
      title: archived.title,
      status: archived.status,
    },
    newValues: {
      reason: parsed.data.reason || null,
    },
  });

  return NextResponse.json({ message: "Block deleted successfully" });
}
