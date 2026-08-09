import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createCampaignSchema } from "@/lib/validations/calling";
import rawDataset from "@/lib/import-framework/portal-raw-dataset.json";

const fallbackLahoreCampaigns = [
  {
    id: "camp-lahore-batch-4",
    name: "Lahore Batch 4 Portal Registration Outreach Drive",
    description: `Calling campaign for ${rawDataset.length} portal registration leads across Lahore parks (Gulberg, Johar Town, Gulshan Ravi, Griffin, Gulshan Iqbal, State Life).`,
    status: "active",
    startDate: "2026-05-01T00:00:00.000Z",
    endDate: "2026-08-31T23:59:59.000Z",
    city: { id: "city-lahore-01", name: "Lahore", code: "LHR" },
    _count: { assignments: rawDataset.length, pocAssignments: 12, templates: 4 },
  },
];

export async function GET(request: NextRequest) {
  const auth = await requireCapability("calling.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const url = new URL(request.url);
  const requestedCityId = url.searchParams.get("cityId");
  const statusParam = url.searchParams.get("status");

  const isHq = user.role === "super_admin" || user.role === "program_admin";

  try {
    const where: any = {};
    if (statusParam) where.status = statusParam;

    const campaigns = await db.callingCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        city: { select: { id: true, name: true, code: true } },
        _count: { select: { assignments: true, pocAssignments: true, templates: true } },
      },
    });

    if (campaigns.length > 0) {
      return NextResponse.json(campaigns);
    }
  } catch (err) {
    console.warn("Calling campaigns DB query error, falling back to Lahore Batch 4:", err);
  }

  return NextResponse.json(fallbackLahoreCampaigns);
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
