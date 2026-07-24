import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { resolveMashwaraAccess } from "@/lib/auth/mashwara-scope";
import { z } from "zod";

const actionItemSubSchema = z.object({
  teamId: z.string().min(1, "Team is required"),
  assignedToId: z.string().min(1, "Assignee is required"),
  description: z.string().trim().min(1, "Description is required").max(500),
  dueDate: z.coerce.date().optional(),
});

const createDecisionSchema = z.object({
  decision: z.string().trim().min(1, "Decision is required").max(1000),
  category: z.string().trim().max(200).optional(),
  targetTeamId: z.string().optional(),
  assignedToId: z.string().optional(),
  actionItem: actionItemSubSchema.optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("mashwara.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id: meetingId } = await params;

  const meeting = await db.mashwaraMeeting.findUnique({
    where: { id: meetingId },
    select: { id: true, cityId: true },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const access = await resolveMashwaraAccess(auth.user, meeting);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const decision = await db.mashwaraDecision.create({
    data: {
      meetingId,
      decision: parsed.data.decision,
      category: parsed.data.category ?? null,
      targetTeamId: parsed.data.targetTeamId ?? null,
      assignedToId: parsed.data.assignedToId ?? null,
    },
    select: {
      id: true,
      meetingId: true,
      decision: true,
      category: true,
      targetTeamId: true,
      assignedToId: true,
      status: true,
      createdAt: true,
    },
  });

  let actionItem: Record<string, unknown> | null = null;
  if (parsed.data.actionItem) {
    actionItem = await db.mashwaraActionItem.create({
      data: {
        meetingId,
        description: parsed.data.actionItem.description,
        teamId: parsed.data.actionItem.teamId,
        assignedToId: parsed.data.actionItem.assignedToId,
        dueDate: parsed.data.actionItem.dueDate ?? null,
      },
      select: {
        id: true,
        meetingId: true,
        description: true,
        teamId: true,
        assignedToId: true,
        dueDate: true,
        status: true,
        createdAt: true,
      },
    });
  }

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "mashwara_decision",
    entityId: decision.id,
    newValues: { meetingId, decision: parsed.data.decision, hasActionItem: !!actionItem },
  });

  return NextResponse.json({ decision, actionItem }, { status: 201 });
}
