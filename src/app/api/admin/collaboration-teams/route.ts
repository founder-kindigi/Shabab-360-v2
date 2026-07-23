import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await requireCapability("teams.memberships.manage");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { searchParams } = new URL(request.url);
  const providedCityId = searchParams.get("cityId");
  const statusParam = searchParams.get("status");

  const resolved = await resolveActorCity(auth.user, providedCityId);
  if (!resolved.success) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const whereClause: { cityId: string; isActive?: boolean } = {
    cityId: resolved.cityId,
  };

  if (statusParam === "active") {
    whereClause.isActive = true;
  }

  const teams = await db.collaborationTeam.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          memberships: {
            where: { isActive: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: teams });
}
