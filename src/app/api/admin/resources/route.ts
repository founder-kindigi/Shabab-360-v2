import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createResourceSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().trim().max(500).optional(),
  fileUrl: z.string().url("Invalid file URL"),
  category: z.enum(["curriculum", "activity_guide", "policy", "media"]),
  allowedRoles: z.string().default("all"),
  targetCityId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("settings.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const actorCity = await resolveActorCity();
  if (actorCity && parsed.data.targetCityId && parsed.data.targetCityId !== actorCity) {
    return NextResponse.json({ error: "Forbidden: Cannot target digital resource outside assigned city scope" }, { status: 403 });
  }

  if (parsed.data.targetCityId) {
    const cityExists = await db.city.findUnique({ where: { id: parsed.data.targetCityId } });
    if (!cityExists) {
      return NextResponse.json({ error: "Target city not found" }, { status: 404 });
    }
  }

  const resource = await db.digitalResource.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      fileUrl: parsed.data.fileUrl,
      category: parsed.data.category,
      allowedRoles: parsed.data.allowedRoles,
      targetCityId: parsed.data.targetCityId || null,
      createdById: user.id!,
    },
    include: {
      targetCity: { select: { id: true, name: true, code: true } },
    },
  });

  logAudit({
    userId: user.id!,
    action: "resources.digital_resource.create",
    entityType: "digital_resource",
    entityId: resource.id,
    newValues: {
      title: resource.title,
      category: resource.category,
      fileUrl: resource.fileUrl,
      targetCityId: resource.targetCityId,
    },
  });

  return NextResponse.json(resource, { status: 201 });
}
