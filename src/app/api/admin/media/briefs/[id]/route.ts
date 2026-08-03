import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isHqRole } from "@/lib/auth/scope";
import { requireMediaAccess, resolveMediaCity, hasActiveMediaMembership, hasActiveMediaMembershipByStaffMetaId } from "@/lib/media/media-auth";
import { updateBriefSchema, isValidBriefTransition, sanitizeMediaAuditData, assetMetadataHasExternalUrl } from "@/lib/media/media-schemas";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const brief = await db.mediaBrief.findUnique({ where: { id }, include: { city: { select: { id: true, name: true } }, team: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, name: true, email: true } }, assignedToStaff: { select: { id: true, userId: true } }, approvedByStaff: { select: { id: true, userId: true } } } });
  if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  const cityResult = await resolveMediaCity(auth.user, brief.cityId);
  if (!cityResult.authorized) return NextResponse.json({ error: cityResult.error }, { status: cityResult.status });
  if (cityResult.cityId !== brief.cityId) return NextResponse.json({ error: "Forbidden: brief belongs to a different city" }, { status: 403 });
  const access = await requireMediaAccess(auth.user, "media.workspace.view", brief.cityId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });
  return NextResponse.json(brief);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = updateBriefSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });

  const existing = await db.mediaBrief.findUnique({ where: { id }, select: { id: true, cityId: true, version: true, status: true, title: true, description: true, approvalState: true, assignedToStaffMetaId: true } });
  if (!existing) return NextResponse.json({ error: "Brief not found" }, { status: 404 });

  const cityResult = await resolveMediaCity(auth.user, existing.cityId);
  if (!cityResult.authorized) return NextResponse.json({ error: cityResult.error }, { status: cityResult.status });
  if (cityResult.cityId !== existing.cityId) return NextResponse.json({ error: "Forbidden: brief belongs to a different city" }, { status: 403 });

  if (parsed.data.version <= 0 || parsed.data.version !== existing.version) {
    return NextResponse.json({ error: "Brief has been modified by another user. Refresh and retry." }, { status: 409 });
  }

  const newStatus = parsed.data.status;
  const requestedAssignee = parsed.data.assignedToStaffMetaId;
  const requestedAssetMeta = parsed.data.assetMetadata;

  const [hasBriefsManage, hasWorkspaceManage, hasWorkspaceView] = await Promise.all([
    userHasCapability(auth.user, "media.briefs.manage"),
    userHasCapability(auth.user, "media.workspace.manage"),
    userHasCapability(auth.user, "media.workspace.view"),
  ]);
  // HQ is still bound to the brief's selected city above, but does not need a
  // personal collaboration membership to supervise that city's workspace.
  const isMember = isHqRole(auth.user.role) || await hasActiveMediaMembership(auth.user, existing.cityId);
  const canManage = hasWorkspaceManage && isMember;
  const canBriefsManage = hasBriefsManage && isMember;
  const canView = hasWorkspaceView && isMember;

  const actorStaffMeta = await db.staffMeta.findUnique({ where: { userId: auth.user.id! }, select: { id: true } });
  const isOwnAssignment = actorStaffMeta !== null && actorStaffMeta.id === existing.assignedToStaffMetaId;

  const hasMutableFields = parsed.data.title !== undefined || parsed.data.description !== undefined || parsed.data.mediaType !== undefined || parsed.data.format !== undefined || parsed.data.priority !== undefined || parsed.data.dueAt !== undefined || parsed.data.contentBlockId !== undefined;

  if (newStatus) {
    if (!isValidBriefTransition(existing.status, newStatus)) return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${newStatus}` }, { status: 409 });
    const isInitial = existing.status === "draft" && (newStatus === "open" || newStatus === "cancelled");
    const isSelf = existing.status === "in_progress" && newStatus === "ready_for_review";
    const isRevise = existing.status === "revision_requested" && newStatus === "in_progress";
    if (!canManage && !(isInitial && canBriefsManage) && !((isSelf || isRevise) && canView && isOwnAssignment)) {
      return NextResponse.json({ error: "Forbidden: insufficient capability for this transition" }, { status: 403 });
    }
  }
  if (hasMutableFields && !canBriefsManage && !canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (requestedAssignee !== undefined && !canManage) return NextResponse.json({ error: "Forbidden: only workspace.manage may assign" }, { status: 403 });
  if (requestedAssetMeta !== undefined && !canManage) return NextResponse.json({ error: "Forbidden: only workspace.manage may set asset metadata" }, { status: 403 });

  if ((parsed.data.title && /https?:\/\//i.test(parsed.data.title)) || (parsed.data.description && /https?:\/\//i.test(parsed.data.description))) {
    return NextResponse.json({ error: "External URLs are not permitted" }, { status: 403 });
  }
  if (requestedAssetMeta && assetMetadataHasExternalUrl(requestedAssetMeta)) {
    return NextResponse.json({ error: "External URLs are not permitted in asset metadata" }, { status: 403 });
  }

  if (requestedAssignee !== undefined && requestedAssignee !== null) {
    const staff = await db.staffMeta.findUnique({ where: { id: requestedAssignee }, select: { id: true, isActive: true, assignedCityId: true, assignedPark: { select: { cityId: true } }, assignedGroup: { select: { batch: { select: { cityId: true } }, park: { select: { cityId: true } } } } } });
    if (!staff) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
    if (!staff.isActive) return NextResponse.json({ error: "Assignee is not active" }, { status: 400 });
    let cid = staff.assignedCityId;
    if (!cid && staff.assignedPark?.cityId) cid = staff.assignedPark.cityId;
    if (!cid && staff.assignedGroup?.batch?.cityId) cid = staff.assignedGroup.batch.cityId;
    if (!cid && staff.assignedGroup?.park?.cityId) cid = staff.assignedGroup.park.cityId;
    if (!cid || cid !== existing.cityId) return NextResponse.json({ error: "Assignee must be in the same city" }, { status: 403 });
    if (!(await hasActiveMediaMembershipByStaffMetaId(requestedAssignee, existing.cityId))) return NextResponse.json({ error: "Assignee is not an active Media team member" }, { status: 403 });
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.mediaType !== undefined) updateData.mediaType = parsed.data.mediaType;
  if (parsed.data.format !== undefined) updateData.format = parsed.data.format;
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
  if (parsed.data.dueAt !== undefined) updateData.dueAt = parsed.data.dueAt;
  if (requestedAssignee !== undefined) updateData.assignedToStaffMetaId = requestedAssignee;
  if (requestedAssetMeta !== undefined) updateData.assetMetadata = JSON.stringify(requestedAssetMeta);

  if (newStatus) {
    updateData.status = newStatus;
    if (newStatus === "cancelled" && parsed.data.cancellationReason) updateData.cancellationReason = parsed.data.cancellationReason;
    if (newStatus === "ready_for_review") updateData.approvalState = "pending";
    if (newStatus === "approved") { updateData.approvalState = "approved"; updateData.approvedAt = new Date(); if (actorStaffMeta) updateData.approvedByStaffMetaId = actorStaffMeta.id; }
    if (newStatus === "revision_requested") { updateData.approvalState = "rejected"; if (parsed.data.rejectionReason) updateData.rejectionReason = parsed.data.rejectionReason; }
  }

  const oldValues = sanitizeMediaAuditData({ status: existing.status, title: existing.title, version: existing.version });
  let updated;
  try {
    updated = await db.$transaction(async (tx) => {
      if ((await tx.mediaBrief.updateMany({ where: { id, version: existing.version }, data: { ...updateData, version: { increment: 1 } } })).count === 0) throw new Error("STALE_VERSION");
      const ub = await tx.mediaBrief.findUnique({ where: { id }, include: { team: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, name: true, email: true } }, assignedToStaff: { select: { id: true, userId: true } }, approvedByStaff: { select: { id: true, userId: true } } } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "media.brief.update", entityType: "MediaBrief", entityId: id, oldValues, newValues: sanitizeMediaAuditData({ status: ub!.status, title: ub!.title, version: ub!.version }) }) });
      return ub!;
    });
  } catch (err: any) {
    if (err?.message === "STALE_VERSION") return NextResponse.json({ error: "Brief has been modified by another user. Refresh and retry." }, { status: 409 });
    throw err;
  }
  return NextResponse.json(updated);
}
