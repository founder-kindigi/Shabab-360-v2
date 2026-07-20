import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLogData, sanitizeAuditReason } from "@/lib/audit";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { ACCESS_CAPABILITIES, ROLE_DEFAULT_CAPABILITIES, type AccessCapability } from "@/lib/auth/capabilities";
import { db } from "@/lib/db";

const ROLES = ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi", "guardian", "student"] as const;
const changeSchema = z.object({ role: z.enum(ROLES), capability: z.enum(ACCESS_CAPABILITIES), effect: z.enum(["allow", "deny"]), reason: z.string().trim().min(3).max(300) });
const revokeSchema = changeSchema.pick({ role: true, capability: true, reason: true });

function isProtectedChange(role: string, capability: string) {
  return role === "super_admin" || (role !== "super_admin" && capability.startsWith("access."));
}

function roleUserWhere(role: (typeof ROLES)[number]) {
  if (role === "guardian") return { isActive: true, guardian: { isNot: null } };
  if (role === "student") return { isActive: true, participant: { isNot: null } };
  return { isActive: true, staffMeta: { is: { role } } };
}

async function requireSuperAdmin(capability: AccessCapability) {
  const authError = await requireRole(["super_admin"]);
  if (authError) return authError;
  return requireCapability(capability);
}

export async function GET() {
  const auth = await requireSuperAdmin("access.role_defaults.manage");
  if (auth instanceof NextResponse) return auth;
  const overrides = await db.roleCapabilityOverride.findMany({ select: { id: true, role: true, capability: true, effect: true, reason: true, updatedAt: true }, orderBy: [{ role: "asc" }, { capability: "asc" }] });
  return NextResponse.json({ defaults: ROLE_DEFAULT_CAPABILITIES, overrides });
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperAdmin("access.role_defaults.manage");
  if (auth instanceof NextResponse) return auth;
  const parsed = changeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  if (isProtectedChange(parsed.data.role, parsed.data.capability)) return NextResponse.json({ error: "This role capability is immutable" }, { status: 422 });

  const reason = sanitizeAuditReason(parsed.data.reason) ?? "Role capability updated";
  const override = await db.$transaction(async (tx) => {
    const previous = await tx.roleCapabilityOverride.findUnique({ where: { role_capability: { role: parsed.data.role, capability: parsed.data.capability } }, select: { effect: true } });
    const saved = await tx.roleCapabilityOverride.upsert({
      where: { role_capability: { role: parsed.data.role, capability: parsed.data.capability } },
      create: { ...parsed.data, reason }, update: { effect: parsed.data.effect, reason },
      select: { id: true, role: true, capability: true, effect: true, reason: true, updatedAt: true },
    });
    await tx.user.updateMany({ where: roleUserWhere(parsed.data.role), data: { tokenVersion: { increment: 1 } } });
    await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "role_capability_updated", entityType: "role_capability_override", entityId: saved.id, oldValues: previous ?? undefined, newValues: { role: saved.role, capability: saved.capability, effect: saved.effect, sessionsInvalidated: true }, reason }) });
    return saved;
  });
  return NextResponse.json({ override });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin("access.role_defaults.manage");
  if (auth instanceof NextResponse) return auth;
  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  if (isProtectedChange(parsed.data.role, parsed.data.capability)) return NextResponse.json({ error: "This role capability is immutable" }, { status: 422 });

  const reason = sanitizeAuditReason(parsed.data.reason) ?? "Role capability reverted";
  const override = await db.$transaction(async (tx) => {
    const previous = await tx.roleCapabilityOverride.findUnique({ where: { role_capability: { role: parsed.data.role, capability: parsed.data.capability } }, select: { id: true, effect: true } });
    if (!previous) return null;
    await tx.roleCapabilityOverride.delete({ where: { id: previous.id } });
    await tx.user.updateMany({ where: roleUserWhere(parsed.data.role), data: { tokenVersion: { increment: 1 } } });
    await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "role_capability_reverted", entityType: "role_capability_override", entityId: previous.id, oldValues: { role: parsed.data.role, capability: parsed.data.capability, effect: previous.effect }, newValues: { revertedToDefault: true, sessionsInvalidated: true }, reason }) });
    return previous;
  });
  if (!override) return NextResponse.json({ error: "Role override not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
