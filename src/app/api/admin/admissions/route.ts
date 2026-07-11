import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const VALID_STATUSES = ["submitted", "reviewing", "interviewed", "accepted", "rejected", "enrolled"];

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
});

export async function GET(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const cityId = searchParams.get("cityId") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 100);

  const where: Record<string, unknown> = {};

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
        interviews: {
          orderBy: { createdAt: "desc" },
        },
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

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { applicantName, applicantDOB, gender, guardianName, guardianPhone, guardianRelation, cityId, preferredParkId, notes } = parsed.data;

  // Generate tracking code: SHB-YYYY-NNNN
  const year = new Date().getFullYear();
  const prefix = `SHB-${year}-`;

  // Find the latest tracking code for this year to get the next number
  const latestApp = await db.admissionApplication.findFirst({
    where: { trackingCode: { startsWith: prefix } },
    orderBy: { trackingCode: "desc" },
    select: { trackingCode: true },
  });

  let nextNum = 1;
  if (latestApp) {
    const numStr = latestApp.trackingCode.slice(prefix.length);
    const num = parseInt(numStr, 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  const trackingCode = `${prefix}${String(nextNum).padStart(4, "0")}`;

  const application = await db.admissionApplication.create({
    data: {
      trackingCode,
      applicantName,
      applicantDOB: applicantDOB ? new Date(applicantDOB) : null,
      gender: gender || null,
      guardianName,
      guardianPhone,
      guardianRelation: guardianRelation || null,
      cityId: cityId || null,
      preferredParkId: preferredParkId || null,
      notes: notes || null,
    },
  });

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "admission_application",
    entityId: application.id,
    newValues: { trackingCode, applicantName, guardianName, cityId, preferredParkId },
  });

  return NextResponse.json(application, { status: 201 });
}