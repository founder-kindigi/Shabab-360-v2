import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isHqRole } from "@/lib/auth/scope";

/**
 * GET /api/admin/events/ui-context
 *
 * Returns capability booleans derived server-side.
 * Keeps GET /api/admin/events envelope untouched and page.tsx sync.
 */
export async function GET() {
  const auth = await requireCapability("events.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const canManage = await userHasCapability(user, "events.manage");
  const isHq = isHqRole(user.role);

  return NextResponse.json({ canManage, isHq });
}
