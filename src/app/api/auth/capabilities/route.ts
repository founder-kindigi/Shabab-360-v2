import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { ACCESS_CAPABILITIES, isUserRole, resolveEffectiveCapability } from "@/lib/auth/capabilities";
import { db } from "@/lib/db";
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  if (!isUserRole(auth.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [roles, users] = await Promise.all([
      db.roleCapabilityOverride.findMany({ where: { role: auth.user.role } }),
      db.userCapabilityOverride.findMany({ where: { userId: auth.user.id } }),
    ]);
    const capabilities = ACCESS_CAPABILITIES.filter((capability) => resolveEffectiveCapability(auth.user.role as any, capability, roles.find((r) => r.capability === capability)?.effect, users.find((u) => u.capability === capability), new Date()));
    return NextResponse.json({ userId: auth.user.id, capabilities }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Permissions unavailable" }, { status: 503 }); }
}
