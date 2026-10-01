import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createBadgeSchema = z.object({
  code: z.string().trim().min(3, "Badge code must be at least 3 characters").max(50),
  name: z.string().trim().min(2, "Badge name must be at least 2 characters").max(100),
  description: z.string().trim().min(5, "Description must be at least 5 characters").max(500),
  iconUrl: z.string().url("Invalid icon URL").optional(),
  category: z.enum(["attendance", "achievement", "leadership", "special"]),
  requiredPoints: z.number().int().min(0, "Required points cannot be negative").default(0),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const categoryFilter = url.searchParams.get("category");

  const where: any = {};
  if (categoryFilter) where.category = categoryFilter;

  const badges = await db.badge.findMany({
    where,
    orderBy: { requiredPoints: "asc" },
  });

  return NextResponse.json(badges);
}

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

  const parsed = createBadgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existingCode = await db.badge.findUnique({
    where: { code: parsed.data.code },
  });
  if (existingCode) {
    return NextResponse.json({ error: "Badge code already exists" }, { status: 409 });
  }

  const badge = await db.badge.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description,
      iconUrl: parsed.data.iconUrl || null,
      category: parsed.data.category,
      requiredPoints: parsed.data.requiredPoints,
    },
  });

  logAudit({
    userId: user.id!,
    action: "gamification.badge.create",
    entityType: "badge",
    entityId: badge.id,
    newValues: {
      code: badge.code,
      name: badge.name,
      category: badge.category,
      requiredPoints: badge.requiredPoints,
    },
  });

  return NextResponse.json(badge, { status: 201 });
}
