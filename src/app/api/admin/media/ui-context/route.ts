import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { requireMediaAccess, resolveMediaCity } from "@/lib/media/media-auth";

const HQ_ROLES = new Set(["super_admin", "program_admin"]);

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const isHq = HQ_ROLES.has(auth.user.role ?? "");
  const requestedCityId = request.nextUrl.searchParams.get("cityId");

  if (isHq && !requestedCityId) {
    const cities = await db.city.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
    return NextResponse.json({ canView: false, canCreate: false, isHq: true, cityId: null, cities, mediaTeam: null });
  }

  const cityResult = await resolveMediaCity(auth.user, requestedCityId);
  if (!cityResult.authorized) return NextResponse.json({ error: cityResult.error }, { status: cityResult.status });
  const [view, create, team] = await Promise.all([
    requireMediaAccess(auth.user, "media.workspace.view", cityResult.cityId),
    requireMediaAccess(auth.user, "media.briefs.manage", cityResult.cityId),
    db.collaborationTeam.findFirst({ where: { cityId: cityResult.cityId, isActive: true, OR: [{ code: "MEDIA" }, { code: "media" }, { name: "Media" }] }, select: { id: true, name: true } }),
  ]);
  if (!view.authorized) return NextResponse.json({ error: view.error }, { status: view.status });
  return NextResponse.json({ canView: true, canCreate: create.authorized, isHq, cityId: cityResult.cityId, cities: isHq ? [{ id: cityResult.cityId, name: "Selected city" }] : [], mediaTeam: team });
}
