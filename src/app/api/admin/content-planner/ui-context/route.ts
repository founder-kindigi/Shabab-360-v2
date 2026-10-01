import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isHqRole } from "@/lib/auth/scope";
import { deriveContentPlannerCityScope } from "@/lib/content-planner/scope";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const [canView, canManage] = await Promise.all([
    userHasCapability(auth.user, "content.view"),
    userHasCapability(auth.user, "content.manage"),
  ]);

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isHq = isHqRole(auth.user.role);
  const cityScope = isHq ? null : await deriveContentPlannerCityScope(auth.user);

  if (!isHq && (!cityScope || cityScope.length !== 1)) {
    return NextResponse.json(
      { error: "Active city scope is unavailable" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    canView: true,
    canManage,
    isHq,
    actorCityId: isHq ? null : cityScope![0],
  });
}
