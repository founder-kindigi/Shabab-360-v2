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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: participantId } = await params;

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: participantId } = await params;

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

  const expectedVersion = _req.headers.get("if-match");
  if (!expectedVersion) return NextResponse.json({ error: "Reload the profile before saving" }, { status: 428 });
  if (expectedVersion !== "new" && !Number.isFinite(Date.parse(expectedVersion))) {
    return NextResponse.json({ error: "Invalid profile version" }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) return NextResponse.json({ error: "No changed fields" }, { status: 400 });

  try {
    // Resolve the response projection before committing; permission storage failure
    // must not turn a successful save into an apparent failed request.
    const sensitiveViewAuth = await requireCapability("students.profile.sensitive.view");
    const callerCanViewSensitive = !(sensitiveViewAuth instanceof NextResponse);
    const saved = await db.$transaction(async (tx) => {
      const existing = await tx.studentExtendedProfile.findUnique({ where: { participantId } });
      if ((existing?.updatedAt.toISOString() ?? "new") !== expectedVersion) return null;
      const profile = existing
        ? await tx.studentExtendedProfile.update({
            where: { participantId, updatedAt: existing.updatedAt },
            data: { ...parsed.data, updatedAt: new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1)) },
          })
        : await tx.studentExtendedProfile.create({ data: { participantId, ...parsed.data } });
      // Only changed fields are audited; free-text wellbeing values remain redacted.
      const previous = existing ? Object.fromEntries(Object.keys(parsed.data).map(key => [key, (existing as unknown as Record<string, unknown>)[key]])) : undefined;
      await tx.auditLog.create({ data: createAuditLogData({
        userId: user.id, action: existing ? "student_profile.update" : "student_profile.create",
        entityType: "StudentExtendedProfile", entityId: profile.id,
        oldValues: redactProfileSensitiveValues(previous),
        newValues: redactProfileSensitiveValues(parsed.data),
      }) });
      return { profile, existed: Boolean(existing) };
    });
    if (!saved) return NextResponse.json({ error: "Profile changed. Reload and apply your changes again." }, { status: 409 });
    const { profile, existed } = saved;

  // Determine response projection: sensitive fields only if caller has sensitive.view
  const result = callerCanViewSensitive
    ? { ...profile }
    : stripSensitiveFields({ ...profile } as unknown as Record<string, unknown>);

  return NextResponse.json(result, { status: existed ? 200 : 201 });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002" || code === "P2025") return NextResponse.json({ error: "Profile changed. Reload before saving." }, { status: 409 });
    return NextResponse.json({ error: "Profile could not be saved" }, { status: 503 });
  }
}
