/**
 * GET /api/admin/content-planner/permissions
 *
 * Lightweight capability signal: resolves content.view and content.manage
 * server-side so the UI never relies on hard-coded role lists for display
 * or management controls. Browser must never decide permissions from role names.
 *
 * Returns:
 *   canView  — effective content.view (for workspace display)
 *   canManage — effective content.manage (for create/edit/archive controls)
 *   isHq     — actor category only when needed for city-selection UX
 */
import { NextResponse } from "next/server";
import { userHasCapability } from "@/lib/auth/capability-access";
import { requireAuth } from "@/lib/auth/authorize";
import { isHqRole } from "@/lib/auth/scope";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const [canView, canManage] = await Promise.all([
    userHasCapability(auth.user, "content.view"),
    userHasCapability(auth.user, "content.manage"),
  ]);

  return NextResponse.json({
    canView,
    canManage,
    isHq: isHqRole(auth.user.role),
  });
}
