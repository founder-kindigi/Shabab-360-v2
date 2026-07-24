import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { db } from "@/lib/db";
import { teamListQuerySchema } from "@/lib/validations/team";

export async function GET(request: NextRequest) {
  const auth = await requireCapability("organisation.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as any;

  const url = new URL(request.url);
  const rawParams = {
    cityId: url.searchParams.get("cityId") || undefined,
    status: url.searchParams.get("status") || "active",
  };

  const parsed = teamListQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const resolved = await resolveActorCity(user, parsed.data.cityId);
  if (resolved.error || !resolved.cityId) {
    return NextResponse.json(
      { error: resolved.error || "City resolution failed" },
      { status: resolved.status || 400 }
    );
  }

  const where: any = {
    cityId: resolved.cityId,
  };
  if (parsed.data.status !== "all") {
    where.isActive = parsed.data.status === "active";
  }

  const teams = await db.collaborationTeam.findMany({
    where,
    orderBy: [{ city: { name: "asc" } }, { name: "asc" }],
    include: {
      city: { select: { id: true, name: true, code: true } },
      _count: { select: { memberships: { where: { isActive: true } } } },
    },
  });

  return NextResponse.json(teams);
}
