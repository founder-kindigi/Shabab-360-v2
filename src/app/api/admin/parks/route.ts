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

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const capabilityAuth = await requireCapability("organisation.manage");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { searchParams } = new URL(request.url);
  const parsedQuery = listQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const { cityId } = parsedQuery.data;

  const userRole = (user.role || "").toLowerCase().trim();
  const isHQ = ["super_admin", "program_admin"].includes(userRole);

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
