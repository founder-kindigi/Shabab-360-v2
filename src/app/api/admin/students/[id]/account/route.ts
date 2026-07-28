import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireCapability,
  requireResourceScope,
  requireRole,
} from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { SENSITIVE_RESPONSE_HEADERS } from "@/lib/security/sensitive-response";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

const provisionAccountSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const roleError = await requireRole(["super_admin", "program_admin"]);
  if (roleError) return roleError;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("students.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const parsed = provisionAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id } = await params;
  const participant = await db.participant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      state: true,
      userId: true,
      group: {
        select: {
          id: true,
          batch: { select: { park: { select: { id: true, cityId: true } } } },
        },
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const scopeError = requireResourceScope(auth.user, {
    cityId: participant.group.batch.park.cityId,
    parkId: participant.group.batch.park.id,
    groupId: participant.group.id,
  });
  if (scopeError) return scopeError;

  if (participant.state !== "active") {
    return NextResponse.json({ error: "Only active students can receive a login" }, { status: 409 });
  }
  if (participant.userId) {
    return NextResponse.json({ error: "This student already has a login" }, { status: 409 });
  }

  const existingUser = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return NextResponse.json({ error: { email: ["A user with this email already exists"] } }, { status: 409 });
  }

  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await db.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        name: participant.name,
        phone: participant.phone,
        mustResetPwd: true,
        isActive: true,
      },
      select: { id: true, email: true, name: true, mustResetPwd: true, isActive: true },
    });

    await tx.participant.update({
      where: { id: participant.id },
      data: { userId: createdUser.id },
    });

    return createdUser;
  });

  await logAudit({
    userId: auth.user.id,
    action: "provision_student_login",
    entityType: "participant",
    entityId: participant.id,
    newValues: { loginProvisioned: true },
  });

  return NextResponse.json(
    { user, temporaryPassword },
    { status: 201, headers: SENSITIVE_RESPONSE_HEADERS }
  );
}
