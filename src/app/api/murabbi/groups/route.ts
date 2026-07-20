import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit";
import { formatPKT } from "@/lib/timezone";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
  assignedGroupId?: string | null;
};

export async function GET() {
  const roleError = await requireRole(["murabbi"]);
  if (roleError) return roleError;

  const auth = await requireCapability("people.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user as SessionUser;

  try {
    // Fire audit log
    logAudit({
      userId: user.id,
      action: "view",
      entityType: "murabbi_groups",
    });

    // Get the murabbi's StaffMeta to find assigned groups
    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
      select: { assignedGroupId: true },
    });

    // Build a list of group IDs to fetch
    const groupIds: string[] = [];
    if (staffMeta?.assignedGroupId) {
      groupIds.push(staffMeta.assignedGroupId);
    }

    if (groupIds.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    // Fetch groups with batch → park → city hierarchy
    const groups = await db.group.findMany({
      where: { id: { in: groupIds }, isActive: true },
      include: {
        batch: {
          include: {
            park: {
              include: { city: true },
            },
          },
        },
        participants: {
          where: { state: "active" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { participants: true, attendanceEvents: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // For each group, fetch the latest attendance event and its stats
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const latestEvent = await db.attendanceEvent.findFirst({
          where: { groupId: group.id },
          orderBy: { eventDate: "desc" },
          include: {
            _count: { select: { records: true } },
            records: { select: { status: true } },
          },
        });

        // Calculate attendance rate from the latest event
        let lastAttendanceDate: string | null = null;
        let lastAttendanceRate: number | null = null;
        let lastEventId: string | null = null;
        let lastEventClosed: boolean = false;

        if (latestEvent) {
          lastAttendanceDate = formatPKT(new Date(latestEvent.eventDate), "dd MMM yyyy");
          lastEventId = latestEvent.id;
          lastEventClosed = latestEvent.isClosed;

          const totalParticipants = group.participants.length;
          const presentCount = latestEvent.records.filter(
            (r) => r.status === "present" || r.status === "late"
          ).length;
          lastAttendanceRate =
            totalParticipants > 0
              ? Math.round((presentCount / totalParticipants) * 100)
              : 0;
        }

        return {
          id: group.id,
          name: group.name,
          batchName: group.batch.name,
          parkName: group.batch.park.name,
          cityName: group.batch.park.city?.name || "Unknown",
          participantCount: group._count.participants,
          participants: group.participants,
          lastAttendanceDate,
          lastAttendanceRate,
          lastEventId,
          lastEventClosed,
          totalEvents: group._count.attendanceEvents,
        };
      })
    );

    return NextResponse.json({ groups: enrichedGroups });
  } catch (error) {
    console.error("Murabbi groups error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
