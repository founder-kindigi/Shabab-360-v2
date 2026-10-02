import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const listQuerySchema = z.object({
  cityId: optionalIdentifier(),
});

const createParkSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(500).nullable().optional(),
  cityId: optionalIdentifier(),
}).strict();

function isHq(role?: string | null) {
  return role === "super_admin" || role === "program_admin";
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("organisation.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const parsedQuery = listQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const { cityId } = parsedQuery.data;

  const userRole = (user.role || "").toLowerCase().trim();
  const isHQ = isHq(userRole);

  if (isHQ) {
    const where: any = { isActive: true };
    if (cityId) where.cityId = cityId;
    const parks = await db.park.findMany({
      where,
      include: {
        city: { select: { id: true, name: true } },
        _count: { select: { batches: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(parks);
  }

  // City head: only parks in their city
  if (userRole === "city_head" && user.assignedCityId) {
    const parks = await db.park.findMany({
      where: { cityId: user.assignedCityId, isActive: true },
      include: {
        city: { select: { id: true, name: true } },
        _count: { select: { batches: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(parks);
  }

  // Park staff: only their assigned park
  if (
    ["park_admin", "park_lead", "murabbi"].includes(userRole) &&
    user.assignedParkId
  ) {
    const park = await db.park.findUnique({
      where: { id: user.assignedParkId, isActive: true },
      include: {
        city: { select: { id: true, name: true } },
        _count: { select: { batches: true } },
      },
    });
    return NextResponse.json(park ? [park] : []);
  }

  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const body = await request.json().catch(() => null);
  const parsed = createParkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const role = (auth.user.role || "").toLowerCase().trim();
  let cityId: string | null = null;
  if (isHq(role)) {
    cityId = parsed.data.cityId ?? null;
    if (!cityId) return NextResponse.json({ error: "cityId is required for HQ" }, { status: 400 });
  } else if (role === "city_head" && auth.user.assignedCityId) {
    cityId = auth.user.assignedCityId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const city = await db.city.findUnique({
    where: { id: cityId },
    select: { id: true, isActive: true },
  });
  if (!city || !city.isActive) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const duplicate = await db.park.findFirst({
    where: { cityId, name: parsed.data.name },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "A park with this name already exists in this city" }, { status: 409 });
  }

  try {
    const park = await db.$transaction(async (tx) => {
      const created = await tx.park.create({
        data: { name: parsed.data.name, address: parsed.data.address ?? null, cityId },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          action: "create",
          entityType: "park",
          entityId: created.id,
          newValues: JSON.stringify({ name: created.name, cityId: created.cityId }),
        },
      });
      return created;
    });
    return NextResponse.json(park, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A park with this name already exists in this city" }, { status: 409 });
    }
    return NextResponse.json({ error: "Park could not be saved" }, { status: 503 });
  }
}
