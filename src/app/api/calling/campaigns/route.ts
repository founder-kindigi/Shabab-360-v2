import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createCampaignSchema } from "@/lib/validations/calling";

export async function GET(request: NextRequest) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const url = new URL(request.url);
  const requestedCityId = url.searchParams.get("cityId");
  const statusParam = url.searchParams.get("status");

  const resolved = await resolveActorCity(user, requestedCityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json({ error: resolved.error || "City resolution failed" }, { status: resolved.status || 400 });
  }

  const where: any = {
    cityId: resolved.cityId,
  };
  if (statusParam) {
    where.status = statusParam;
  }

  const campaigns = await db.callingCampaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      city: { select: { id: true, name: true, code: true } },
      _count: { select: { assignments: true, pocAssignments: true, templates: true } },
    },
  });

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const auth = await requireCapability("calling.poc.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const resolved = await resolveActorCity(user, data.cityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json({ error: resolved.error || "City resolution failed" }, { status: resolved.status || 400 });
  }

  const campaign = await db.callingCampaign.create({
    data: {
      cityId: resolved.cityId,
      name: data.name,
      description: data.description || null,
      status: "draft",
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  });

  await logAudit({
    userId: user.id,
    action: "calling.campaign.create",
    entityType: "CallingCampaign",
    entityId: campaign.id,
    newValues: { id: campaign.id, cityId: campaign.cityId, name: campaign.name },
  });

  return NextResponse.json(campaign, { status: 201 });
}
