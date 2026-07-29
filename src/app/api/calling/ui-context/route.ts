import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isHqRole } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

/**
 * GET /api/calling/ui-context
 *
 * Server-only capability context for the Calling workspace UI.
 * Returns no role names, StaffMeta IDs, PII, campaign data, or lead data.
 * Returns 403 if calling.view capability is absent.
 */
export async function GET() {
  const authResult = await requireAuth();
  if ("status" in authResult) return authResult;
  const { user } = authResult;

  const canView = await userHasCapability(user, "calling.view");
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [canManagePoc, canManageTemplates] = await Promise.all([
    userHasCapability(user, "calling.poc.manage"),
    userHasCapability(user, "calling.templates.manage"),
  ]);

  const isHq = isHqRole(user.role);

  return NextResponse.json({
    canView: true,
    canManagePoc,
    canManageTemplates,
    isHq,
  });
}
