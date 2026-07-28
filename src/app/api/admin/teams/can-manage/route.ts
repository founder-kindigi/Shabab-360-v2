/**
 * GET /api/admin/teams/can-manage
 *
 * Lightweight capability signal: resolves teams.memberships.manage server-side
 * so the UI never relies on hard-coded role lists for management controls.
 *
 * The server processses the full override chain (role defaults, role overrides,
 * user overrides), returning exactly what the route gate would enforce.
 */
import { NextResponse } from "next/server";
import { userHasCapability } from "@/lib/auth/capability-access";
import { requireAuth } from "@/lib/auth/authorize";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const canManage = await userHasCapability(auth.user, "teams.memberships.manage");

  return NextResponse.json({ canManage });
}
