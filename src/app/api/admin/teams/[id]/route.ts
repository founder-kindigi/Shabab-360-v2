import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCapability("organisation.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  const { id } = await params;
  const team = await db.collaborationTeam.findUnique({
    where: { id },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const resolved = await resolveActorCity(user, team.cityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json(
      { error: resolved.error || "City resolution failed" },
      { status: resolved.status || 400 }
    );
  }

  const fullTeam = await db.collaborationTeam.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true, code: true } },
      memberships: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        include: {
          staffMeta: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
              assignedCity: { select: { id: true, name: true } },
              assignedPark: { select: { id: true, name: true } },
              assignedGroup: { select: { id: true, name: true } },
            },
          },
        },
      },
      _count: { select: { memberships: { where: { isActive: true } } } },
    },
  });

  return NextResponse.json(fullTeam);
}
