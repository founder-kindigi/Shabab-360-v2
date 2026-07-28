import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { verifyCallingManagerOrPoc } from "@/lib/calling/poc-auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { updateCampaignSchema } from "@/lib/validations/calling";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

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
  const user = auth.user as any;

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

  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.startDate !== undefined) updateData.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate !== undefined) updateData.endDate = new Date(parsed.data.endDate);

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
