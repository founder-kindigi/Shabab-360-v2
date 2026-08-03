import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { requireMediaAccess, resolveMediaCity } from "@/lib/media/media-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const cityResult = await resolveMediaCity(auth.user, request.nextUrl.searchParams.get("cityId"));
  if (!cityResult.authorized) return NextResponse.json({ error: cityResult.error }, { status: cityResult.status });
  const access = await requireMediaAccess(auth.user, "media.workspace.manage", cityResult.cityId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  const team = await db.collaborationTeam.findFirst({
    where: { cityId: cityResult.cityId, isActive: true, code: { in: ["MEDIA", "media"] } },
    include: {
      memberships: {
        where: { isActive: true, endedAt: null, staffMeta: { isActive: true, user: { isActive: true } } },
        orderBy: { createdAt: "asc" },
        include: { staffMeta: { select: { id: true, user: { select: { name: true } } } } },
      },
    },
  });
  if (!team) return NextResponse.json({ error: "Active Media team not found in this city" }, { status: 404 });

  return NextResponse.json({
    data: team.memberships.map((membership) => ({
      id: membership.staffMeta.id,
      name: membership.staffMeta.user?.name || "Media team member",
    })),
  });
}
