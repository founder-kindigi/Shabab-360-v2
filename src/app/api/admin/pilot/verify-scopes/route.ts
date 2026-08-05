import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability, resolveActorCity, requireCityScope, requireParkScope, requireGroupScope } from "@/lib/auth/authorize";
import { canAccessResourceScope, isHqRole } from "@/lib/auth/scope";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("organisation.view");
  if (capAuth instanceof NextResponse) return capAuth;

  const actorCity = await resolveActorCity();

  // Test 1: HQ Role Scope Check
  const hqAccess = isHqRole(user.role);

  // Test 2: City Scope Cross-City Isolation Check
  const sameCityScopeCheck = actorCity ? requireCityScope(user, actorCity) : true;
  const crossCityScopeCheck = actorCity ? requireCityScope(user, "city_other_restricted") : false;

  // Test 3: Park Scope Isolation Check
  const parkScopeCheck = user.assignedParkId ? requireParkScope(user, user.assignedParkId) : true;

  // Test 4: Group Scope Isolation Check
  const groupScopeCheck = user.assignedGroupId ? requireGroupScope(user, user.assignedGroupId) : true;

  const isolationVerified = hqAccess || (sameCityScopeCheck && !crossCityScopeCheck);

  return NextResponse.json({
    status: isolationVerified ? "verified" : "failed",
    actor: {
      id: user.id,
      role: user.role,
      assignedCityId: user.assignedCityId || null,
      assignedParkId: user.assignedParkId || null,
      assignedGroupId: user.assignedGroupId || null,
    },
    verificationChecks: {
      isHqRole: hqAccess,
      sameCityAccess: sameCityScopeCheck,
      crossCityAccessDenied: !crossCityScopeCheck,
      parkScopeAccess: parkScopeCheck,
      groupScopeAccess: groupScopeCheck,
    },
  });
}
