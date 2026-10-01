import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { logAudit, createAuditLogData } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id } = await params;

  try {
    const verified = await verifyCallingManagerOrPoc(user as { id: string; role?: string | null }, id);
    if (verified.error || !verified.campaign) return NextResponse.json({ error: verified.error || "Forbidden" }, { status: verified.status || 403 });
    if (verified.campaign) {
      const campaign = await db.callingCampaign.findUnique({
        where: { id },
        include: {
          city: { select: { id: true, name: true, code: true } },
          pocAssignments: {
            where: { isActive: true },
            include: {
              eventResponsibility: {
                include: {
                  assignedToStaffMeta: { include: { user: { select: { id: true, name: true, email: true } } } },
                },
              },
            },
          },
          templates: { where: { status: "approved" } },
          externalCallers: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });

      if (campaign) {
        return NextResponse.json(campaign);
      }
    }
  } catch {
    return NextResponse.json({ error: "Calling campaign data is temporarily unavailable" }, { status: 503 });
  }

  return NextResponse.json({ error: "Calling campaign not found" }, { status: 404 });
}

const patchSchema = z.object({ name: z.string().trim().min(2).max(200).optional(), description: z.string().max(2000).nullable().optional(), status: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(), startDate: z.string().datetime().optional(), endDate: z.string().datetime().optional() }).strict().refine(value => Object.keys(value).length > 0);
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.poc.manage"); if (auth instanceof NextResponse) return auth;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid campaign update" }, { status: 400 });
  const { id } = await params;
  try {
    return await db.$transaction(async tx => {
      const verified = await verifyCallingManagerOrPoc(auth.user as { id: string; role?: string }, id, tx);
      if (verified.error || !verified.campaign) return NextResponse.json({ error: verified.error || "Forbidden" }, { status: verified.status || 403 });
      if (!verified.isManager) return NextResponse.json({ error: "Campaign changes require management authority" }, { status: 403 });
      const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : verified.campaign.startDate;
      const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : verified.campaign.endDate;
      if (endDate < startDate) return NextResponse.json({ error: "Campaign end must follow start" }, { status: 400 });
      const updated = await tx.callingCampaign.update({ where: { id, updatedAt: verified.campaign.updatedAt }, data: { ...parsed.data, startDate, endDate } });
      await tx.auditLog.create({ data: createAuditLogData({ userId: auth.user.id, action: "calling.campaign.update", entityType: "CallingCampaign", entityId: id, oldValues: { status: verified.campaign.status }, newValues: { fields: Object.keys(parsed.data), status: updated.status } }) });
      return NextResponse.json(updated);
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") return NextResponse.json({ error: "Campaign changed during editing" }, { status: 409 });
    return NextResponse.json({ error: "Calling campaign data is temporarily unavailable" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.poc.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id } = await params;

  try {
    return await db.$transaction(async (tx) => {
      const verified = await verifyCallingManagerOrPoc(user as { id: string; role?: string }, id, tx);
      if (verified.error || !verified.campaign) return NextResponse.json({ error: verified.error || "Forbidden" }, { status: verified.status || 403 });
      if (!verified.isManager) return NextResponse.json({ error: "Campaign deletion requires management authority" }, { status: 403 });
      await tx.callingCampaign.delete({ where: { id } });
      await tx.auditLog.create({ data: createAuditLogData({
        userId: user.id,
        action: "calling.campaign.delete",
        entityType: "CallingCampaign",
        entityId: id,
        reason: "Campaign deleted by admin",
      }) });
      return NextResponse.json({ success: true });
    });
  } catch {
    return NextResponse.json({ error: "Calling campaign data is temporarily unavailable" }, { status: 503 });
  }

}
