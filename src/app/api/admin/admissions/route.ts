import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { resolveCityParkScope } from "@/lib/auth/hierarchy";
import { admissionAccess } from "@/lib/admissions/access";
import { z } from "zod";
import { createAuditLogData } from "@/lib/audit";
import { admissionAdditionalFieldsShape } from "@/lib/admissions/validation";
import {
  optionalIdentifier,
  optionalQueryText,
  paginatedQuerySchema,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";

const VALID_STATUSES = ["submitted", "screening", "interview_scheduled", "interviewed", "accepted", "rejected", "enrolled"];

const createSchema = z.object({
  applicantName: z.string().min(2, "Applicant name must be at least 2 characters"),
  applicantDOB: z.string().optional(),
  gender: z.string().optional(),
  guardianName: z.string().min(2, "Guardian name must be at least 2 characters"),
  guardianPhone: z.string().min(5, "Guardian phone must be at least 5 characters"),
  guardianRelation: z.string().optional(),
  cityId: z.string().optional(),
  preferredParkId: z.string().optional(),
  notes: z.string().optional(),
  ...admissionAdditionalFieldsShape,
});

const admissionListQuerySchema = paginatedQuerySchema({ maxPageSize: 200 }).extend({
  search: optionalQueryText(),
  status: z.enum([...VALID_STATUSES, "reviewing"]).optional(),
  cityId: optionalIdentifier(),
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"]);
  if (authError) return authError;

  const capability = await requireCapability("admissions.manage");
  if (capability instanceof NextResponse) return capability;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const query = admissionListQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const { search, status, cityId, page, pageSize } = query.data;

  try {
    const scope = await resolveCityParkScope(auth.user, { cityId });
    if (scope instanceof NextResponse) return scope;
    {
      const where: Record<string, unknown> = { ...(scope.cityId ? { cityId: scope.cityId } : {}), ...(scope.parkId ? { preferredParkId: scope.parkId } : {}) };

      if (search) {
        where.OR = [
          { applicantName: { contains: search } },
          { guardianName: { contains: search } },
          { guardianPhone: { contains: search } },
          { trackingCode: { contains: search } },
        ];
      }

      if (status && VALID_STATUSES.includes(status)) {
        where.status = status;
      } else if (status === "reviewing") {
        where.status = "screening";
      }

      if (cityId) {
        where.cityId = cityId;
      }

      const [applications, total] = await Promise.all([
        db.admissionApplication.findMany({
          where,
          include: {
            city: { select: { id: true, name: true } },
            preferredPark: { select: { id: true, name: true, cityId: true } },
            interviews: { orderBy: { createdAt: "desc" } },
            convertedParticipant: {
              select: { id: true, name: true, group: { select: { id: true, name: true, batch: { select: { id: true, name: true } } } } },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.admissionApplication.count({ where }),
      ]);

      return NextResponse.json({
        data: applications,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Admissions are temporarily unavailable" }, { status: 503 });
  }

  return NextResponse.json({ data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
}

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const capabilityAuth = await requireCapability("admissions.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const auth = await requireAuth();
  if (!auth || auth instanceof NextResponse) return auth as NextResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input data", details: parsed.error.format() }, { status: 400 });
  }

  const trackingCode = `APP-PORTAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
  const destination = { cityId: parsed.data.cityId ?? null, preferredParkId: parsed.data.preferredParkId ?? null };
  const denied = await admissionAccess(auth.user, destination);
  if (denied) return denied;
  const created = await db.$transaction(async (tx) => {
  const created = await tx.admissionApplication.create({
    data: {
      trackingCode,
      applicantName: parsed.data.applicantName,
      applicantDOB: parsed.data.applicantDOB ? new Date(parsed.data.applicantDOB) : null,
      gender: parsed.data.gender,
      guardianName: parsed.data.guardianName,
      guardianPhone: parsed.data.guardianPhone,
      guardianRelation: parsed.data.guardianRelation,
      cityId: parsed.data.cityId,
      preferredParkId: parsed.data.preferredParkId,
      notes: parsed.data.notes,
      emergencyContact: parsed.data.emergencyContact ?? null,
      emergencyPhone: parsed.data.emergencyPhone ?? null,
      previousEducation: parsed.data.previousEducation ?? null,
      reference: parsed.data.reference ?? null,
    },
    include: {
      city: { select: { id: true, name: true } },
      preferredPark: { select: { id: true, name: true, cityId: true } },
    },
  });

  await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "admission.create", entityType: "AdmissionApplication", entityId: created.id }) });
  return created;
  });

  return NextResponse.json(created, { status: 201 });
  } catch { return NextResponse.json({ error: "Admissions are temporarily unavailable" }, { status: 503 }); }
}
