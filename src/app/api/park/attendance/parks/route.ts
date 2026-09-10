import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { resolveRequestedHierarchy } from "@/lib/auth/hierarchy";
import { db } from "@/lib/db";
export async function GET() {
  const auth = await requireAuth(); if (auth instanceof NextResponse) return auth;
  try {
    const scope = await resolveRequestedHierarchy(auth.user); if (scope instanceof NextResponse) return scope;
    const parks = await db.park.findMany({ where: { isActive: true, ...(scope.cityId ? { cityId: scope.cityId } : {}), ...(scope.parkId ? { id: scope.parkId } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } });
    return NextResponse.json(parks, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Parks could not be loaded" }, { status: 503 }); }
}
