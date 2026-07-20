import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLogData, sanitizeAuditReason } from "@/lib/audit";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { ROLE_DEFAULT_CAPABILITIES, USER_OVERRIDE_CAPABILITIES, isUserRole } from "@/lib/auth/capabilities";
import { db } from "@/lib/db";

const overrideSchema = z.object({
  capability: z.enum(USER_OVERRIDE_CAPABILITIES),
  effect: z.enum(["allow", "deny"]),
  reason: z.string().trim().min(3).max(300),
  expiresAt: z.string().datetime().nullable().optional(),
});

const revokeSchema = z.object({
  capability: z.enum(USER_OVERRIDE_CAPABILITIES),
  reason: z.string().trim().min(3).max(300),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getUserRole(user: {
  staffMeta: { role: string } | null;
  guardian: { id: string } | null;
  participant: { id: string } | null;
}) {
  if (isUserRole(user.staffMeta?.role)) return user.staffMeta.role;
  if (user.guardian) return "guardian";
  if (user.participant) return "student";
  return null;
}

async function requireSuperAdmin() {
  const authError = await requireRole(["super_admin"]);
  if (authError) return authError;

  return requireCapability("access.user_overrides.manage");
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const now = new Date();
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      isActive: true,
      staffMeta: { select: { role: true } },
      guardian: { select: { id: true } },
      participant: { select: { id: true } },
      capabilityOverrides: {
        where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { id: true, capability: true, effect: true, reason: true, expiresAt: true, isActive: true, revokedAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  const role = user && getUserRole(user);
  if (!user || !role) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const roleOverrides = await db.roleCapabilityOverride.findMany({
    where: { role },
    select: { capability: true, effect: true, updatedAt: true },
  });

  return NextResponse.json({
    userId: user.id,
    role,
    isActive: user.isActive,
    roleDefaults: ROLE_DEFAULT_CAPABILITIES[role],
    roleOverrides,
    userOverrides: user.capabilityOverrides,
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiresAt && expiresAt <= new Date()) {
    return NextResponse.json({ error: { expiresAt: ["Expiry must be in the future"] } }, { status: 400 });
  }

  const { id } = await params;
  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, isActive: true, staffMeta: { select: { role: true } }, guardian: { select: { id: true } }, participant: { select: { id: true } } },
  });
  const role = target && getUserRole(target);
  if (!target || !role) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!target.isActive) return NextResponse.json({ error: "Cannot change access for an inactive user" }, { status: 422 });

  const reason = sanitizeAuditReason(parsed.data.reason) ?? "Access override updated";
  const override = await db.$transaction(async (tx) => {
    const previous = await tx.userCapabilityOverride.findUnique({
      where: { userId_capability: { userId: target.id, capability: parsed.data.capability } },
      select: { effect: true, isActive: true, expiresAt: true },
    });
    const saved = await tx.userCapabilityOverride.upsert({
      where: { userId_capability: { userId: target.id, capability: parsed.data.capability } },
      create: { userId: target.id, capability: parsed.data.capability, effect: parsed.data.effect, reason, expiresAt, isActive: true },
      update: { effect: parsed.data.effect, reason, expiresAt, isActive: true, revokedAt: null },
      select: { id: true, capability: true, effect: true, reason: true, expiresAt: true, isActive: true, revokedAt: true, updatedAt: true },
    });

    await tx.user.update({ where: { id: target.id }, data: { tokenVersion: { increment: 1 } } });
    await tx.auditLog.create({
      data: createAuditLogData({
        userId: auth.user.id,
        action: "access_override_updated",
        entityType: "user_capability_override",
        entityId: saved.id,
        oldValues: previous ?? undefined,
        newValues: { capability: saved.capability, effect: saved.effect, isActive: saved.isActive, expiresAt: saved.expiresAt, sessionInvalidated: true },
        reason,
      }),
    });
    return saved;
  });

  return NextResponse.json({ override });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { id } = await params;
  const reason = sanitizeAuditReason(parsed.data.reason) ?? "Access override revoked";
  const override = await db.$transaction(async (tx) => {
    const previous = await tx.userCapabilityOverride.findUnique({
      where: { userId_capability: { userId: id, capability: parsed.data.capability } },
      select: { id: true, effect: true, isActive: true, expiresAt: true },
    });
    if (!previous?.isActive) return null;

    const saved = await tx.userCapabilityOverride.update({
      where: { id: previous.id },
      data: { isActive: false, revokedAt: new Date() },
      select: { id: true, capability: true, effect: true, isActive: true, revokedAt: true, updatedAt: true },
    });
    await tx.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
    await tx.auditLog.create({
      data: createAuditLogData({
        userId: auth.user.id,
        action: "access_override_revoked",
        entityType: "user_capability_override",
        entityId: saved.id,
        oldValues: previous,
        newValues: { capability: saved.capability, isActive: false, revokedAt: saved.revokedAt, sessionInvalidated: true },
        reason,
      }),
    });
    return saved;
  });

  if (!override) return NextResponse.json({ error: "Active override not found" }, { status: 404 });
  return NextResponse.json({ override });
}
