import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isHqRole } from "@/lib/auth/scope";
import { resolveMashwaraActorCity } from "@/lib/auth/mashwara-scope";

/**
 * GET /api/admin/mashwara/ui-context
 *
 * Returns only the server-resolved capability and scope booleans required by
 * the Mashwara UI. No meeting data, PII, or role names are returned.
 *
 * Response shape:
 *   { canView: boolean, canManage: boolean, isHq: boolean, actorCityId: string | null }
 *
 * The authoritative data APIs (list, detail, shares, decisions) remain the
 * final authority on access. This endpoint only drives UI rendering.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;

  const [canView, canManage] = await Promise.all([
    userHasCapability(user, "mashwara.view"),
    userHasCapability(user, "mashwara.manage"),
  ]);

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isHq = isHqRole(user.role);
  let actorCityId: string | null = null;

  if (!isHq) {
    // For scoped actors, derive the city through the same resolver the data
    // APIs use. This call does NOT pass a requestedCityId, so HQ is never
    // implicitly invoked here.
    const cityResult = await resolveMashwaraActorCity(user);
    if ("cityId" in cityResult) {
      actorCityId = cityResult.cityId;
    } else {
      // City resolution failed (e.g. no active StaffMeta). Return the
      // resolver's deterministic status (normally 403) so the client knows
      // not to attempt any meetings query.
      return NextResponse.json(
        { error: cityResult.error },
        { status: cityResult.status },
      );
    }
  }

  return NextResponse.json({
    canView,
    canManage,
    isHq,
    actorCityId,
  });
}
