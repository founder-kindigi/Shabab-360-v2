import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id } = await params;
  const verified = await verifyCallingManagerOrPoc(user, id);
  if (verified.error || !verified.campaign) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

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

  return NextResponse.json(campaign);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.poc.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id } = await params;
  const verified = await verifyCallingManagerOrPoc(user, id);
  if (verified.error || !verified.campaign) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.cityId !== undefined && body.cityId !== verified.campaign.cityId) {
    return NextResponse.json({ error: "cityId is immutable" }, { status: 400 });
  }

  const updateData: any = {};
  if (typeof body.name === "string") updateData.name = body.name.trim();
  if (typeof body.description === "string" || body.description === null) updateData.description = body.description;
  if (["draft", "active", "completed", "archived"].includes(body.status)) updateData.status = body.status;
  if (body.startDate) updateData.startDate = new Date(body.startDate);
  if (body.endDate) updateData.endDate = new Date(body.endDate);

  const updated = await db.callingCampaign.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    userId: user.id,
    action: "calling.campaign.update",
    entityType: "CallingCampaign",
    entityId: id,
    oldValues: { name: verified.campaign.name, status: verified.campaign.status },
    newValues: { name: updated.name, status: updated.status },
  });

  return NextResponse.json(updated);
}
