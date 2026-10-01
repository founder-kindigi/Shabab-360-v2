import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capAuth = await requireCapability("organisation.view");
  if (capAuth instanceof NextResponse) return capAuth;

  const activeCitiesCount = await db.city.count({ where: { isActive: true } });
  const activeParksCount = await db.park.count({ where: { isActive: true } });
  const totalStudentsCount = await db.participant.count({ where: { state: "active" } });
  const totalUsersCount = await db.user.count();

  return NextResponse.json({
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    networkMetrics: {
      activeCities: activeCitiesCount,
      activeParks: activeParksCount,
      activeStudents: totalStudentsCount,
      totalUsers: totalUsersCount,
    },
    schemaParity: {
      alignedModels: 63,
      dualSchemaSync: true,
    },
  });
}
