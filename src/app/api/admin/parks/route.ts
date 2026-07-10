import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("cityId") || undefined;

  const isHQ = ["super_admin", "program_admin"].includes(user.role || "");

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
  if (user.role === "city_head" && user.assignedCityId) {
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
    ["park_admin", "park_lead", "murabbi"].includes(user.role || "") &&
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