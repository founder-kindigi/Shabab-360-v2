import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { activeCallingPrincipal } from "@/lib/calling/assignment-access";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const url = new URL(request.url);
  const parsed = z.object({
    status: z.enum(["all", "pending", "in_progress", "completed"]).default("all"),
    callerId: z.string().trim().min(1).max(200).optional(),
    page: z.string().regex(/^[1-9]\d{0,4}$/).default("1"),
    pageSize: z.string().regex(/^[1-9]\d{0,2}$/).default("100").refine(v => Number(v) <= 100),
  }).strict().safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid lead filters" }, { status: 400 });
  const { status: statusParam, callerId: callerParam } = parsed.data;

  try {
    const principal = await activeCallingPrincipal(auth.user, id);
    if (!principal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const where: any = { campaignId: id, isActive: true, application: { cityId: principal.campaign.cityId } };
    if (!principal.manager) {
      if (principal.externalId) where.callerExternalId = principal.externalId;
      else if (principal.staffId) where.callerStaffMetaId = principal.staffId;
      else return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (callerParam && callerParam !== "all" && callerParam !== principal.staffId && callerParam !== principal.externalId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (statusParam && statusParam !== "all") where.status = statusParam;
    if (principal.manager && callerParam && callerParam !== "all") where.callerStaffMetaId = callerParam;

    const assignments = await db.callingAssignment.findMany({
      where,
      include: {
        application: {
          select: { applicantName: true, guardianPhone: true, status: true },
        },
        staffCaller: { select: { id: true, user: { select: { name: true } } } },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { outcome: true, notes: true, createdAt: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: Number(parsed.data.pageSize),
      skip: (Number(parsed.data.page) - 1) * Number(parsed.data.pageSize),
    });

    if (assignments.length > 0) {
      const formatted = assignments.map((a) => ({
        id: a.id,
        applicationId: a.applicationId,
        callerStaffMetaId: a.callerStaffMetaId,
        callerName: a.staffCaller?.user?.name || "Assigned Murabbi",
        callerExternalId: a.callerExternalId,
        status: a.status,
        outcome: a.interactions[0]?.outcome || null,
        notes: a.interactions[0]?.notes || null,
        calledAt: a.interactions[0]?.createdAt ? new Date(a.interactions[0].createdAt).toISOString() : null,
        application: a.application,
      }));
      return NextResponse.json(formatted);
    }
    return NextResponse.json([]);
  } catch {
    return NextResponse.json({ error: "Calling leads are temporarily unavailable" }, { status: 503 });
  }
}
