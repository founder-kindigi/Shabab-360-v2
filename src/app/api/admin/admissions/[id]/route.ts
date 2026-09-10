import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability, requireResourceScope } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { admissionAccess } from "@/lib/admissions/access";
import { z } from "zod";
import { createAuditLogData } from "@/lib/audit";
import { admissionAdditionalFieldsShape } from "@/lib/admissions/validation";

const VALID_STATUSES = ["submitted", "screening", "interview_scheduled", "interviewed", "accepted", "rejected", "enrolled"] as const;

const updateAdditionalFieldsSchema = z
  .object({
    ...admissionAdditionalFieldsShape,
    status: z.enum(VALID_STATUSES).optional(),
    notes: z.string().trim().max(2000).optional(),
    preferredParkId: z.string().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"]);
  if (authError) return authError;

  const capabilityAuth = await requireCapability("admissions.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
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

    if (application) {
      const denied = await admissionAccess(auth.user, application);
      if (denied) return denied;
      return NextResponse.json(application);
    }
  } catch {
    return NextResponse.json({ error: "Admissions are temporarily unavailable" }, { status: 503 });
  }

  return NextResponse.json({ error: "Application not found" }, { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"]);
  if (authError) return authError;

  const capabilityAuth = await requireCapability("admissions.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateAdditionalFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input data", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const updateData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  );

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.admissionApplication.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });
      const denied = await admissionAccess(auth.user, existing, tx);
      if (denied) return denied;
      const target = { cityId: existing.cityId, preferredParkId: parsed.data.preferredParkId ?? existing.preferredParkId };
      const targetDenied = await admissionAccess(auth.user, target, tx);
      if (targetDenied) return targetDenied;
      const nextStatus = parsed.data.status;
      if (nextStatus && nextStatus !== existing.status) {
        const allowed: Record<string, string[]> = { submitted: ["screening", "rejected"], screening: ["rejected"], interview_scheduled: ["rejected"], interviewed: ["accepted", "rejected"], accepted: [], rejected: ["screening"], enrolled: [] };
        if (!allowed[existing.status]?.includes(nextStatus)) return NextResponse.json({ error: "Use the supported interview or enrollment workflow for this transition" }, { status: 409 });
      }
      const updated = await tx.admissionApplication.update({ where: { id, updatedAt: existing.updatedAt }, data: updateData });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "admission.update", entityType: "AdmissionApplication", entityId: id, newValues: { fields: Object.keys(updateData), status: nextStatus } }) });
      return NextResponse.json(updated);
    });
  } catch {
    return NextResponse.json({ error: "Admissions are temporarily unavailable" }, { status: 503 });
  }

  return NextResponse.json({ error: "Application not found" }, { status: 404 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head"]);
  if (authError) return authError;

  const auth = await requireCapability("admissions.manage");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.admissionApplication.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });
      const denied = requireResourceScope(auth.user, { cityId: existing.cityId, parkId: existing.preferredParkId }, ["super_admin", "program_admin", "city_head"]);
      if (denied) return denied;
      if (existing.convertedParticipantId || existing.status === "enrolled") {
        return NextResponse.json({ error: "Enrolled applications cannot be deleted" }, { status: 409 });
      }
      await tx.admissionApplication.delete({ where: { id } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "admission.delete", entityType: "AdmissionApplication", entityId: id }) });
      return NextResponse.json({ success: true });
    });
  } catch {
    return NextResponse.json({ error: "Admissions are temporarily unavailable" }, { status: 503 });
  }

}
