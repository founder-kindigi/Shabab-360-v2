import { NextResponse } from "next/server";
import { requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { performManualDropout } from "@/lib/attendance/policy-engine";
import { db } from "@/lib/db";
import { z } from "zod";

const dropoutRequestSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
}).strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Dropout changes the participant lifecycle; attendance marking alone is not
  // sufficient authority to end a student's future attendance eligibility.
  const capAuth = await requireCapability("students.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = dropoutRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const { reason } = parseResult.data;

    // Fetch participant with group scope for hierarchy authorization
    const participant = await db.participant.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            batch: {
              include: {
                park: true,
              },
            },
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Hierarchy scope check
    const scopeError = requireResourceScope(user, {
      cityId: participant.group?.batch.park.cityId ?? null,
      parkId: participant.group?.batch.parkId ?? null,
      groupId: participant.groupId,
    });
    if (scopeError) return scopeError;

    // Check if already dropped out (idempotency conflict)
    if (participant.state === "dropout") {
      return NextResponse.json(
        {
          error: "Participant is already dropped out",
          participant: {
            id: participant.id,
            name: participant.name,
            state: participant.state,
            dropoutAt: participant.dropoutAt,
            dropoutReason: participant.dropoutReason,
            dropoutSource: participant.dropoutSource,
          },
        },
        { status: 409 }
      );
    }

    // Perform manual dropout
    const result = await performManualDropout({
      participantId: id,
      reason,
      actorUserId: user.id || "system",
    });

    if (!result.success || !result.participant) {
      if (result.notFound) {
        return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      }
      if (result.conflict) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update dropout state" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      participant: {
        id: result.participant.id,
        name: result.participant.name,
        state: result.participant.state,
        dropoutAt: result.participant.dropoutAt,
        dropoutReason: result.participant.dropoutReason,
        dropoutSource: result.participant.dropoutSource,
      },
    });
  } catch (error) {
    console.error("Student manual dropout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
