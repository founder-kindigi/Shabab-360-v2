import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createTemplateSchema } from "@/lib/validations/calling";

export async function GET(request: NextRequest) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  const url = new URL(request.url);
  const requestedCityId = url.searchParams.get("cityId");
  const campaignIdParam = url.searchParams.get("campaignId");
  const statusParam = url.searchParams.get("status");

  const resolved = await resolveActorCity(user, requestedCityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json({ error: resolved.error || "City resolution failed" }, { status: resolved.status || 400 });
  }

  const where: any = {
    cityId: resolved.cityId,
  };
  if (campaignIdParam) where.campaignId = campaignIdParam;
  if (statusParam) where.status = statusParam;

  const templates = await db.callingTemplate.findMany({
    where,
    orderBy: [{ title: "asc" }, { version: "desc" }],
    include: {
      city: { select: { id: true, name: true, code: true } },
      campaign: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const auth = await requireCapability("calling.templates.manage");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  let targetCityId: string;

  if (data.campaignId) {
    const campaign = await db.callingCampaign.findUnique({
      where: { id: data.campaignId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Target campaign not found" }, { status: 400 });
    }
    // Enforce city match between campaign and template
    if (data.cityId && data.cityId !== campaign.cityId) {
      return NextResponse.json(
        { error: "Template city must match campaign city" },
        { status: 400 }
      );
    }
    const resolved = await resolveActorCity(user, campaign.cityId);
    if (resolved.error || !resolved.cityId) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    targetCityId = campaign.cityId;
  } else {
    const resolved = await resolveActorCity(user, data.cityId);
    if (resolved.error || !resolved.cityId) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    targetCityId = resolved.cityId;
  }

  const latestVersion = await db.callingTemplate.findFirst({
    where: { cityId: targetCityId, title: data.title },
    orderBy: { version: "desc" },
  });

  const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

  const template = await db.callingTemplate.create({
    data: {
      cityId: targetCityId,
      campaignId: data.campaignId || null,
      title: data.title,
      body: data.body,
      status: "draft",
      version: nextVersion,
    },
  });

  await logAudit({
    userId: user.id,
    action: "calling.template.create",
    entityType: "CallingTemplate",
    entityId: template.id,
    newValues: { id: template.id, title: template.title, version: template.version },
  });

  return NextResponse.json(template, { status: 201 });
}
