import { NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { groupHierarchyInclude, groupResourceScope } from "@/lib/auth/hierarchy";
import { canAccessParticipantProfile } from "@/lib/student-profile/scope";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const capability = await requireCapability("students.profile.view");
  if (capability instanceof NextResponse) return capability;
  try {
    const { id } = await params;
    const participant = await db.participant.findUnique({ where: { id }, include: { group: { include: groupHierarchyInclude } } });
    const scope = groupResourceScope(participant?.group);
    if (!participant || !scope || !await canAccessParticipantProfile(auth.user, id, scope.cityId)) return NextResponse.json({ error: "Profile unavailable in your scope" }, { status: 403 });
    return NextResponse.json({ id, name: participant.name, cityId: scope.cityId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Profile context could not be loaded" }, { status: 503 }); }
}
