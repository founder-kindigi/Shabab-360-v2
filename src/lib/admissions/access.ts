import { NextResponse } from "next/server";
import { requireResourceScope, type SessionUser } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
export async function admissionAccess(user: SessionUser, application: { cityId: string | null; preferredParkId: string | null }, prisma: any = db) {
  if (application.preferredParkId) {
    const park = await prisma.park.findUnique({ where: { id: application.preferredParkId } });
    if (!park || park.cityId !== application.cityId) return NextResponse.json({ error: "Invalid admission destination" }, { status: 403 });
  }
  return requireResourceScope(user, { cityId: application.cityId, parkId: application.preferredParkId });
}
