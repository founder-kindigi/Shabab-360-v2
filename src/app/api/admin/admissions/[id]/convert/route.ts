import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const convertSchema = z.object({
  groupId: z.string().min(1, "Group is required"),
  createGuardian: z.boolean().optional().default(true),
});

class ConversionConflictError extends Error {}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("admissions.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;
  const parsed = convertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { groupId, createGuardian } = parsed.data;

  const existing = await db.admissionApplication.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (existing.status !== "accepted") {
    return NextResponse.json(
      { error: { status: ["Only accepted applications can be converted to participants"] } },
      { status: 400 }
    );
  }

  if (existing.convertedParticipantId) {
    return NextResponse.json(
      { error: { status: ["This application has already been converted"] } },
      { status: 400 }
    );
  }

  // Validate group exists
  const group = await db.group.findUnique({
    where: { id: groupId, isActive: true },
    include: {
      batch: {
        include: {
          park: { select: { id: true, name: true, cityId: true } },
        },
      },
    },
  });
  if (!group) {
    return NextResponse.json(
      { error: { groupId: ["Selected group not found or inactive"] } },
      { status: 400 }
    );
  }

  let participant;
  try {
    participant = await db.$transaction(async (tx) => {
      const createdParticipant = await tx.participant.create({
        data: {
          name: existing.applicantName,
          dateOfBirth: existing.applicantDOB,
          gender: existing.gender,
          groupId,
          state: "active",
        },
      });

      if (createGuardian) {
        const guardian = await tx.guardian.create({
          data: { name: existing.guardianName, phone: existing.guardianPhone },
        });

        await tx.guardianChild.create({
          data: {
            guardianId: guardian.id,
            participantId: createdParticipant.id,
            relation: existing.guardianRelation || undefined,
          },
        });
      }

      const transition = await tx.admissionApplication.updateMany({
        where: { id, status: "accepted", convertedParticipantId: null },
        data: { convertedParticipantId: createdParticipant.id, status: "enrolled" },
      });
      if (transition.count !== 1) throw new ConversionConflictError();

      return createdParticipant;
    });
  } catch (error) {
    if (error instanceof ConversionConflictError) {
      return NextResponse.json(
        { error: "Application was already converted or its status changed" },
        { status: 409 }
      );
    }
    throw error;
  }

  await logAudit({
    userId: auth.user.id,
    action: "convert_application",
    entityType: "admission_application",
    entityId: id,
    newValues: {
      status: "enrolled",
      participantId: participant.id,
      groupId,
      createGuardian,
    },
  });

  // Return the created participant with group info
  const result = await db.admissionApplication.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true } },
      preferredPark: { select: { id: true, name: true, cityId: true } },
      interviews: { orderBy: { createdAt: "desc" } },
      convertedParticipant: {
        select: {
          id: true,
          name: true,
          state: true,
          group: {
            select: {
              id: true,
              name: true,
              batch: {
                select: {
                  id: true,
                  name: true,
                  park: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
