import { NextRequest, NextResponse } from "next/server";
import { requireAuth, resolveActorCity } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { visibleCities } from "@/lib/auth/audience";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const audience = await visibleCities(user);
  if (audience instanceof NextResponse) return audience;
  const url = new URL(request.url);
  const categoryFilter = url.searchParams.get("category");

  const where: Prisma.DigitalResourceWhereInput = {};
  if (categoryFilter) where.category = categoryFilter;

  if (!audience.unrestricted) {
    where.OR = [
      { targetCityId: null },
      { targetCityId: { in: audience.cityIds } },
    ];
  }

  const resources = await db.digitalResource.findMany({
    where,
    include: {
      targetCity: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const userRole = (user.role || "").toLowerCase().trim();

  // Filter resources based on allowedRoles comma-separated list
  const filtered = resources.filter((res) => {
    if (res.allowedRoles === "all") return true;
    const allowed = res.allowedRoles.split(",").map((r) => r.trim().toLowerCase());
    return allowed.includes(userRole) || ["super_admin", "program_admin"].includes(userRole);
  });

  return NextResponse.json(filtered);
}
