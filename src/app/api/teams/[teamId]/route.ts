import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { isStaffActiveTeamMember } from "@/lib/auth/team-scope";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireCapability("teams.workspace.view");
  if (auth instanceof Response || auth instanceof NextResponse) return auth as NextResponse;

  const { teamId } = await params;

  const staffMeta = await db.staffMeta.findUnique({
    where: { userId: auth.user.id },
  });
  if (!staffMeta || !(await isStaffActiveTeamMember(staffMeta.id, teamId))) {
    return NextResponse.json({ error: "Active team membership required" }, { status: 403 });
  }

  const team = await db.collaborationTeam.findUnique({
    where: { id: teamId },
    include: {
      _count: {
        select: {
          memberships: { where: { isActive: true } },
          chatMessages: { where: { isDeleted: false } },
          documentLinks: { where: { isActive: true } },
        },
      },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ data: team });
}
