import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { getExternalLinkPolicy, validateAllowedExternalUrl } from "@/lib/security/external-link-policy";
import { z } from "zod";

const createSchema = z.object({ label: z.string().trim().min(1).max(120), url: z.string().trim().url().max(2048) }).strict();

async function access(user: { id: string }, teamId: string, cityId: string) {
  const scope = await resolveActorCity(user as any, cityId);
  if (scope.error || scope.cityId !== cityId) return { status: 403 as const };
  const [canManage, membership] = await Promise.all([
    userHasCapability(user as any, "organisation.manage"),
    db.staffTeamMembership.findFirst({ where: { teamId, isActive: true, endedAt: null, staffMeta: { userId: user.id, isActive: true } }, select: { staffMetaId: true } }),
  ]);
  return { canManage, membership };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(); if (auth instanceof NextResponse) return auth;
  if (!auth.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = { id: auth.user.id };
  const { id } = await params;
  const team = await db.collaborationTeam.findUnique({ where: { id }, select: { cityId: true } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const permitted = await access(actor, id, team.cityId);
  if ("status" in permitted || (!permitted.canManage && !permitted.membership)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [links, policy] = await Promise.all([
    db.teamDocumentLink.findMany({ where: { teamId: id }, orderBy: { createdAt: "desc" }, select: { id: true, label: true, url: true, createdAt: true } }),
    getExternalLinkPolicy(),
  ]);
  return NextResponse.json({ data: links, requireInterstitialWarning: policy.requireInterstitialWarning });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(); if (auth instanceof NextResponse) return auth;
  if (!auth.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = { id: auth.user.id };
  const { id } = await params;
  const team = await db.collaborationTeam.findUnique({ where: { id }, select: { cityId: true, isActive: true } });
  if (!team || !team.isActive) return NextResponse.json({ error: "Active team not found" }, { status: 404 });
  const permitted = await access(actor, id, team.cityId);
  if ("status" in permitted || !permitted.canManage || !permitted.membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const membership = permitted.membership;
  const body = await request.json().catch(() => null); const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  const policy = await getExternalLinkPolicy(); const checked = validateAllowedExternalUrl(parsed.data.url, policy.allowedDomains);
  if (!checked.allowed || !checked.url) return NextResponse.json({ error: "Document URL is not an approved HTTPS domain" }, { status: 403 });
  const link = await db.$transaction(async (tx) => { const created = await tx.teamDocumentLink.create({ data: { teamId: id, createdByStaffMetaId: membership.staffMetaId, label: parsed.data.label, url: checked.url } }); await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "team.document_link.create", entityType: "team_document_link", entityId: created.id, newValues: { teamId: id, label: created.label, domain: checked.host } }) }); return created; });
  return NextResponse.json(link, { status: 201 });
}
