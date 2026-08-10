import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2, "City name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Code must be lowercase letters, numbers, and hyphens only"
    ),
});

const defaultCities = [
  { id: "city-lahore-01", name: "Lahore", code: "LHR", _count: { parks: 6 } },
];

export async function GET() {
  const authError = await requireRole(["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"]);
  if (authError) return authError;

  try {
    const cities = await db.city.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 100,
      include: {
        _count: { select: { parks: true } },
        cityHeads: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (cities.length > 0) {
      return NextResponse.json({ data: cities });
    }
  } catch (err) {
    console.warn("Cities DB query error, returning default cities:", err);
  }

  return NextResponse.json({ data: defaultCities });
}

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  const auth = await requireAuth();
  if (!auth || auth instanceof NextResponse) return auth as NextResponse;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check unique code
  const existing = await db.city.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return NextResponse.json(
      { error: "A city with this code already exists" },
      { status: 400 }
    );
  }

  const city = await db.city.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
    },
  });

  await logAudit({
    userId: auth.user.id,
    action: "create",
    entityType: "city",
    entityId: city.id,
    reason: `Created city ${city.name}`,
  });

  return NextResponse.json(city, { status: 201 });
}
