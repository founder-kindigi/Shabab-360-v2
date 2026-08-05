import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const provisionCitySchema = z.object({
  name: z.string().trim().min(2, "City name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "City code must be at least 2 characters").max(10).toUpperCase(),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("organisation.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = provisionCitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existingCode = await db.city.findUnique({
    where: { code: parsed.data.code },
  });
  if (existingCode) {
    return NextResponse.json({ error: "City code already exists in pilot network" }, { status: 409 });
  }

  const city = await db.city.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      isActive: parsed.data.isActive,
    },
  });

  logAudit({
    userId: user.id!,
    action: "pilot.city.provision",
    entityType: "city",
    entityId: city.id,
    newValues: {
      name: city.name,
      code: city.code,
      isActive: city.isActive,
    },
  });

  return NextResponse.json(city, { status: 201 });
}
