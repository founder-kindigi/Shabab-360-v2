import { NextResponse } from "next/server";
import { ATTENDANCE_ROLES, requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { isHqRole } from "@/lib/auth/scope";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const role = (user.role || "").toLowerCase().trim();

  if (!ATTENDANCE_ROLES.includes(role as (typeof ATTENDANCE_ROLES)[number])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isHqRole(role)) {
    const parks = await db.park.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(parks);
  }

  if (role === "city_head") {
    if (!user.assignedCityId) return NextResponse.json({ error: "Assigned city required" }, { status: 403 });
    const parks = await db.park.findMany({
      where: { cityId: user.assignedCityId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(parks);
  }

  if (role === "murabbi") {
    if (!user.assignedGroupId) return NextResponse.json({ error: "Assigned group required" }, { status: 403 });
    const group = await db.group.findUnique({
      where: { id: user.assignedGroupId, isActive: true },
      select: { batch: { select: { park: { select: { id: true, name: true } } } } },
    });
    return NextResponse.json(group ? [group.batch.park] : []);
  }

  if (!user.assignedParkId) return NextResponse.json({ error: "Assigned park required" }, { status: 403 });
  const park = await db.park.findUnique({
    where: { id: user.assignedParkId, isActive: true },
    select: { id: true, name: true },
  });
  return NextResponse.json(park ? [park] : []);
}
