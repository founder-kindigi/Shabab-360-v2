import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { createAuditLogData } from "@/lib/audit";
import { requireMediaAccess, resolveMediaCity } from "@/lib/media/media-auth";
import { createBriefSchema, briefListQuerySchema, sanitizeMediaAuditData } from "@/lib/media/media-schemas";

const READ_CAP = "media.workspace.view" as const;
const WRITE_CAP = "media.briefs.manage" as const;

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const cityResult = await resolveMediaCity(auth.user, url.searchParams.get("cityId"));
  if (!cityResult.authorized) return NextResponse.json({ error: cityResult.error }, { status: cityResult.status });

  const access = await requireMediaAccess(auth.user, READ_CAP, cityResult.cityId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = briefListQuerySchema.safeParse({
    cityId: cityResult.cityId,
    page: url.searchParams.get("page") ?? "1",
    pageSize: url.searchParams.get("pageSize") ?? "20",
    status: url.searchParams.get("status") ?? undefined,
    teamId: url.searchParams.get("teamId") ?? undefined,
    mediaType: url.searchParams.get("mediaType") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    assignedToStaffMetaId: url.searchParams.get("assignedToStaffMetaId") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

  const { page, pageSize, status, teamId, mediaType, priority, assignedToStaffMetaId } = parsed.data;
  const where: any = { cityId: cityResult.cityId, isActive: true };
  if (status) where.status = status;
  if (teamId) where.teamId = teamId;
  if (mediaType) where.mediaType = mediaType;
  if (priority) where.priority = priority;
  if (assignedToStaffMetaId) where.assignedToStaffMetaId = assignedToStaffMetaId;

  const skip = (page - 1) * pageSize;
  const [briefs, total] = await Promise.all([
    db.mediaBrief.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" }, include: { team: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, name: true, email: true } }, assignedToStaff: { select: { id: true, userId: true } }, approvedByStaff: { select: { id: true, userId: true } } } }),
    db.mediaBrief.count({ where }),
  ]);

  return NextResponse.json({ data: briefs, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = createBriefSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { teamId, title, description, mediaType, format, priority, dueAt } = parsed.data;
  const cityResult = await resolveMediaCity(auth.user, parsed.data.cityId);
  if (!cityResult.authorized) return NextResponse.json({ error: cityResult.error }, { status: cityResult.status });
  const effectiveCityId = cityResult.cityId;

  const access2 = await requireMediaAccess(auth.user, WRITE_CAP, effectiveCityId);
  if (!access2.authorized) return NextResponse.json({ error: access2.error }, { status: access2.status });

  const team = await db.collaborationTeam.findFirst({ where: { id: teamId, cityId: effectiveCityId, isActive: true, code: "media" }, select: { id: true } });
  if (!team) return NextResponse.json({ error: "Media team not found in this city" }, { status: 404 });

  if ((title && /https?:\/\//i.test(title)) || (description && /https?:\/\//i.test(description))) {
    return NextResponse.json({ error: "External URLs are not permitted" }, { status: 403 });
  }

  const brief = await db.$transaction(async (tx) => {
    const created = await tx.mediaBrief.create({
      data: { cityId: effectiveCityId, teamId, title, description: description || null, mediaType: mediaType || "graphic", format: format || null, priority: priority || "medium", dueAt: dueAt || null, createdById: auth.user.id!, status: "draft" },
      include: { team: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, name: true, email: true } } },
    });
    await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "media.brief.create", entityType: "MediaBrief", entityId: created.id, newValues: sanitizeMediaAuditData({ id: created.id, cityId: created.cityId, teamId: created.teamId, title: created.title, status: created.status }) }) });
    return created;
  });

  return NextResponse.json(brief, { status: 201 });
}
