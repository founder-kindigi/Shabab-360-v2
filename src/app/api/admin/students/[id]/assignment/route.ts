import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { resolveRequestedHierarchy } from "@/lib/auth/hierarchy";
import { isHqRole } from "@/lib/auth/scope";
import { createAuditLogData } from "@/lib/audit";
import { db } from "@/lib/db";

const assignmentSchema = z.object({
  groupId: z
    .string()
    .trim()
    .min(1, "Group is required")
    .max(128, "Group identifier is not valid"),
});

/**
 * Place a participant into one active group. Park and city are derived from the
 * resolved group scope; a client value is never accepted. A re-placement also
 * requires authority over the participant's existing group, so a scoped actor
 * cannot pull a record out of another scope. Attendance history is never
 * rewritten by this operation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { groupId } = parsed.data;

  const existing = await db.participant.findUnique({
    where: { id },
    select: { id: true, groupId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  if (existing.groupId) {
    // Authority over the current placement is required before moving it.
    const existingScope = await resolveRequestedHierarchy(auth.user, {
      groupId: existing.groupId,
    });
    if (existingScope instanceof NextResponse) return existingScope;
  } else if (!isHqRole(auth.user.role)) {
    // An unassigned record has no scope, so only central staff may place it.
    return NextResponse.json(
      { error: "An unassigned participant may only be placed by central staff" },
      { status: 403 }
    );
  }

  const group = await db.group.findFirst({ where: { id: groupId, isActive: true } });
  if (!group) {
    return NextResponse.json(
      { error: { groupId: ["Selected group not found or inactive"] } },
      { status: 400 }
    );
  }

  const destinationScope = await resolveRequestedHierarchy(auth.user, { groupId });
  if (destinationScope instanceof NextResponse) return destinationScope;

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.participant.update({ where: { id }, data: { groupId } });
    await tx.auditLog.create({
      data: createAuditLogData({
        userId: auth.user.id,
        action: "student.assignGroup",
        entityType: "participant",
        entityId: id,
        oldValues: { groupId: existing.groupId },
        newValues: { groupId },
      }),
    });
    return next;
  });

  return NextResponse.json({ participantId: updated.id, groupId: updated.groupId });
}
