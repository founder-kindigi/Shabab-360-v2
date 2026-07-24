import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/authorize";
import { isHqRole, type SessionUser } from "@/lib/auth/scope";
import { resolveActorCity, canAccessParticipantProfile } from "@/lib/student-profile/scope";
import { updateProfileSchema, SENSITIVE_PROFILE_FIELDS } from "@/lib/student-profile/zod";
import { redactProfileSensitiveValues } from "@/lib/student-profile/audit";
import { createAuditLogData } from "@/lib/audit";

function stripSensitiveFields(profile: Record<string, unknown>): Record<string, unknown> {
  const result = { ...profile };
  for (const field of SENSITIVE_PROFILE_FIELDS) {
    delete result[field];
  }
  return result;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const { participantId } = await params;

  // LAYER 1: capability gate
  const auth = await requireCapability("students.profile.view");
  if (auth instanceof NextResponse) return auth;

  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // LAYER 2: resolve city & participant access
  const url = new URL(_req.url);
  const providedCityId = url.searchParams.get("cityId");
  const includeSensitive = url.searchParams.get("includeSensitive") === "true";

  const resolvedCity = await resolveActorCity(user, providedCityId);
  if (resolvedCity === null) {
    if (isHqRole(user.role)) return NextResponse.json({ error: "cityId required for HQ" }, { status: 400 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!(await canAccessParticipantProfile(user, participantId, resolvedCity))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // LAYER 3: sensitive field check
  if (includeSensitive) {
    const sensitiveAuth = await requireCapability("students.profile.sensitive.view");
    if (sensitiveAuth instanceof NextResponse) return sensitiveAuth;
  }

  // Fetch profile
  const profile = await db.studentExtendedProfile.findUnique({
    where: { participantId },
  });

  if (!profile) {
    return NextResponse.json(null, { status: 200 }); // empty state — not an error
  }

  const result = includeSensitive
    ? { ...profile }
    : stripSensitiveFields({ ...profile } as unknown as Record<string, unknown>);

  return NextResponse.json(result);
}

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const { participantId } = await params;

  // LAYER 1: capability gate
  const auth = await requireCapability("students.profile.manage");
  if (auth instanceof NextResponse) return auth;

  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // LAYER 2: resolve city & participant access
  const url = new URL(_req.url);
  const providedCityId = url.searchParams.get("cityId");

  const resolvedCity = await resolveActorCity(user, providedCityId);
  if (resolvedCity === null) {
    if (isHqRole(user.role)) return NextResponse.json({ error: "cityId required for HQ" }, { status: 400 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!(await canAccessParticipantProfile(user, participantId, resolvedCity))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the participant exists before upsert (avoid uncontrolled FK error)
  const participantExists = await db.participant.findUnique({
    where: { id: participantId },
    select: { id: true },
  });
  if (!participantExists) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  // Parse and validate body
  const body = await _req.json().catch(() => ({}));
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Check if this update includes sensitive fields
  const hasSensitive = SENSITIVE_PROFILE_FIELDS.some((f) => f in parsed.data);
  if (hasSensitive) {
    const sensitiveAuth = await requireCapability("students.profile.sensitive.manage");
    if (sensitiveAuth instanceof NextResponse) return sensitiveAuth;
  }

  // Upsert — create on first write, update existing
  const existing = await db.studentExtendedProfile.findUnique({ where: { participantId } });

  const profile = await db.studentExtendedProfile.upsert({
    where: { participantId },
    create: {
      participantId,
      ...parsed.data,
    },
    update: parsed.data,
  });

  // Audit
  if (existing) {
    const auditData = createAuditLogData({
      userId: user.id,
      action: "student_profile.update",
      entityType: "StudentExtendedProfile",
      entityId: profile.id,
      oldValues: redactProfileSensitiveValues(existing as unknown as Record<string, unknown>),
      newValues: redactProfileSensitiveValues(parsed.data as unknown as Record<string, unknown>),
    });
    await db.auditLog.create({ data: auditData });
  } else {
    const auditData = createAuditLogData({
      userId: user.id,
      action: "student_profile.create",
      entityType: "StudentExtendedProfile",
      entityId: profile.id,
      newValues: redactProfileSensitiveValues(profile as unknown as Record<string, unknown>),
    });
    await db.auditLog.create({ data: auditData });
  }

  // Determine response projection: sensitive fields only if caller has sensitive.view
  const sensitiveViewAuth = await requireCapability("students.profile.sensitive.view");
  const callerCanViewSensitive = !(sensitiveViewAuth instanceof NextResponse);

  const result = callerCanViewSensitive
    ? { ...profile }
    : stripSensitiveFields({ ...profile } as unknown as Record<string, unknown>);

  return NextResponse.json(result, { status: existing ? 200 : 201 });
}
