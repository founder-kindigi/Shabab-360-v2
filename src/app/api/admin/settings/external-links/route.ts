import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { createAuditLogData } from "@/lib/audit";
import { db } from "@/lib/db";
import { EXTERNAL_LINK_POLICY_ID, getExternalLinkPolicy, normalizeAllowedDomains } from "@/lib/security/external-link-policy";
import { z } from "zod";

const policySchema = z.object({ allowedDomains: z.array(z.string().trim().min(3).max(253)).min(1).max(50), requireInterstitialWarning: z.boolean() }).strict();

export async function GET() {
  const roleError = await requireRole(["super_admin"]); if (roleError) return roleError;
  const auth = await requireCapability("settings.manage");
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getExternalLinkPolicy());
}

export async function PUT(request: NextRequest) {
  const roleError = await requireRole(["super_admin"]); if (roleError) return roleError;
  const auth = await requireCapability("settings.manage"); if (auth instanceof NextResponse) return auth;
  const parsed = policySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  const allowedDomains = normalizeAllowedDomains(parsed.data.allowedDomains);
  if (!allowedDomains.length) return NextResponse.json({ error: "At least one valid domain is required" }, { status: 400 });
  const policy = await db.$transaction(async (tx) => { const updated = await tx.externalLinkPolicy.upsert({ where: { id: EXTERNAL_LINK_POLICY_ID }, create: { id: EXTERNAL_LINK_POLICY_ID, allowedDomains: JSON.stringify(allowedDomains), requireInterstitialWarning: parsed.data.requireInterstitialWarning }, update: { allowedDomains: JSON.stringify(allowedDomains), requireInterstitialWarning: parsed.data.requireInterstitialWarning } }); await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "settings.external_links.update", entityType: "external_link_policy", entityId: EXTERNAL_LINK_POLICY_ID, newValues: { allowedDomainsCount: allowedDomains.length, requireInterstitialWarning: updated.requireInterstitialWarning } }) }); return updated; });
  return NextResponse.json({ allowedDomains, requireInterstitialWarning: policy.requireInterstitialWarning });
}
