import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { admissionAdditionalFieldsShape } from "@/lib/admissions/validation";

const VALID_STATUSES = ["submitted", "screening", "interview_scheduled", "interviewed", "accepted", "rejected", "enrolled"] as const;

const STATUS_FLOW: Record<string, string[]> = {
  submitted: ["screening", "rejected"],
  screening: ["interview_scheduled", "rejected", "submitted"],
  interview_scheduled: ["interviewed", "rejected", "screening"],
  interviewed: ["accepted", "rejected", "interview_scheduled"],
  accepted: ["enrolled", "rejected", "interviewed"],
  rejected: ["submitted"],
  enrolled: [],
};

// Legacy alias mapping for old status names
const STATUS_ALIASES: Record<string, string> = {
  reviewing: "screening",
};

const patchSchema = z.object({
  applicantName: z.string().min(2).optional(),
  applicantDOB: z.string().optional(),
  gender: z.string().optional(),
  guardianName: z.string().min(2).optional(),
  guardianPhone: z.string().min(5).optional(),
  guardianRelation: z.string().optional(),
  cityId: z.string().nullable().optional(),
  preferredParkId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...admissionAdditionalFieldsShape,
  status: z.enum(VALID_STATUSES).optional(),
  // Enrollment fields
  groupId: z.string().min(1).optional(),
  createGuardian: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { id } = await params;

  const application = await db.admissionApplication.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true } },
      preferredPark: {
        select: { id: true, name: true, cityId: true },
      },
      interviews: {
        orderBy: { createdAt: "desc" },
      },
      convertedParticipant: {
        select: {
          id: true,
          name: true,
          group: {
            select: {
              id: true,
              name: true,
              batch: {
                select: { id: true, name: true, park: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json(application);
}

export async function PATCH(
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

  const existing = await db.admissionApplication.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate status transition
  if (data.status && data.status !== existing.status) {
    const allowed = STATUS_FLOW[existing.status] || [];
    if (!allowed.includes(data.status)) {
      return NextResponse.json(
        { error: { status: [`Cannot move from "${existing.status}" to "${data.status}". Allowed: ${allowed.join(", ")}`] } },
        { status: 400 }
      );
    }
  }

  // If enrolling, we need groupId
  if (data.status === "enrolled") {
    if (!data.groupId) {
      return NextResponse.json(
        { error: { groupId: ["Group is required when enrolling"] } },
        { status: 400 }
      );
    }

    if (existing.convertedParticipantId) {
      return NextResponse.json(
        { error: { status: ["This application has already been enrolled"] } },
        { status: 400 }
      );
    }

    // Validate group exists
    const group = await db.group.findUnique({
      where: { id: data.groupId, isActive: true },
      include: { batch: true },
    });
    if (!group) {
      return NextResponse.json(
        { error: { groupId: ["Selected group not found or inactive"] } },
        { status: 400 }
      );
    }

    // Use transaction for enrollment data integrity
    const enrollmentResult = await db.$transaction(async (tx) => {
      const participant = await tx.participant.create({
        data: {
          name: existing.applicantName,
          dateOfBirth: existing.applicantDOB,
          gender: existing.gender,
          groupId: data.groupId!,
        },
      });

      if (data.createGuardian) {
        const guardian = await tx.guardian.create({
          data: {
            name: existing.guardianName,
            phone: existing.guardianPhone,
          },
        });

        await tx.guardianChild.create({
          data: {
            guardianId: guardian.id,
            participantId: participant.id,
            relation: existing.guardianRelation || undefined,
          },
        });
      }

      await tx.admissionApplication.update({
        where: { id },
        data: { convertedParticipantId: participant.id, status: "enrolled" },
      });

      return participant;
    });

    await logAudit({
      userId: auth.user.id,
      action: "enroll",
      entityType: "admission_application",
      entityId: id,
      newValues: { status: "enrolled", participantId: enrollmentResult.id, groupId: data.groupId },
    });

    // Return updated application with participant
    const updated = await db.admissionApplication.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true } },
        preferredPark: { select: { id: true, name: true, cityId: true } },
        interviews: { orderBy: { createdAt: "desc" } },
        convertedParticipant: {
          select: {
            id: true,
            name: true,
            group: {
              select: {
                id: true,
                name: true,
                batch: {
                  select: { id: true, name: true, park: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  }

  // Normal update (non-enrollment)
  const updateData: Record<string, unknown> = {};
  if (data.applicantName !== undefined) updateData.applicantName = data.applicantName;
  if (data.applicantDOB !== undefined) updateData.applicantDOB = data.applicantDOB ? new Date(data.applicantDOB) : null;
  if (data.gender !== undefined) updateData.gender = data.gender || null;
  if (data.guardianName !== undefined) updateData.guardianName = data.guardianName;
  if (data.guardianPhone !== undefined) updateData.guardianPhone = data.guardianPhone;
  if (data.guardianRelation !== undefined) updateData.guardianRelation = data.guardianRelation || null;
  if (data.cityId !== undefined) updateData.cityId = data.cityId;
  if (data.preferredParkId !== undefined) updateData.preferredParkId = data.preferredParkId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact;
  if (data.emergencyPhone !== undefined) updateData.emergencyPhone = data.emergencyPhone;
  if (data.previousEducation !== undefined) updateData.previousEducation = data.previousEducation;
  if (data.reference !== undefined) updateData.reference = data.reference;
  if (data.status !== undefined) updateData.status = data.status;

  const application = await db.admissionApplication.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    userId: auth.user.id,
    action: "update",
    entityType: "admission_application",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: updateData,
  });

  return NextResponse.json(application);
}
