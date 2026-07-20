import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireAuth, requireCapability } from "@/lib/auth/authorize";
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

export async function GET() {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const cities = await db.city.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
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
  return NextResponse.json(cities);
}

export async function POST(request: NextRequest) {
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

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
      { status: 409 }
    );
  }

  const city = await db.city.create({ data: parsed.data });
  const auth = await requireAuth();
  if (!(auth instanceof NextResponse)) {
    await logAudit({
      userId: auth.user.id,
      action: "create",
      entityType: "city",
      entityId: city.id,
      newValues: parsed.data,
    });
  }

  return NextResponse.json(city, { status: 201 });
}
