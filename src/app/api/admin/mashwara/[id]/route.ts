import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { resolveMashwaraAccess } from "@/lib/auth/mashwara-scope";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const capabilityAuth = await requireCapability("mashwara.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  const { id } = await params;

  const meeting = await db.mashwaraMeeting.findUnique({
    where: { id },
    select: {
      id: true,
      cityId: true,
      title: true,
      scheduledAt: true,
      location: true,
      status: true,
      minutesSummary: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const access = await resolveMashwaraAccess(auth.user, meeting);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [attendees, decisions, actionItems, shares] = await Promise.all([
    db.mashwaraAttendee.findMany({
      where: { meetingId: id },
      select: {
        id: true,
        attendanceStatus: true,
        notes: true,
        checkedInAt: true,
        staffMeta: {
          select: {
            id: true,
            role: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.mashwaraDecision.findMany({
      where: { meetingId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        decision: true,
        category: true,
        targetTeamId: true,
        assignedToId: true,
        status: true,
        createdAt: true,
      },
    }),
    db.mashwaraActionItem.findMany({
      where: { meetingId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        description: true,
        teamId: true,
        assignedToId: true,
        dueDate: true,
        status: true,
        createdAt: true,
      },
    }),
    db.mashwaraMeetingShare.findMany({
      where: { meetingId: id },
      select: {
        id: true,
        staffMetaId: true,
        grantedAt: true,
        revokedAt: true,
        isRevoked: true,
        grantedBy: { select: { id: true, user: { select: { name: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    ...meeting,
    attendees,
    decisions,
    actionItems,
    shares,
  });
}
