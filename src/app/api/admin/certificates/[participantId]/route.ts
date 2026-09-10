import { eligibleForSession } from "@/lib/attendance/opportunities";
import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireResourceScope, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { requireResolvedGroupScope, groupResourceScope } from "@/lib/auth/hierarchy";
import { formatPKT } from "@/lib/timezone";

const ADMIN_ROLES = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const roleError = await requireRole([...ADMIN_ROLES]);
  if (roleError) return roleError;

  const auth = await requireCapability("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { participantId } = await params;

  // Fetch participant with relations
  const participant = await db.participant.findUnique({
    where: { id: participantId },
    include: {
      group: {
        include: {
          park: { include: { city: true } },
          batch: {
            include: {
              park: {
                include: { city: true },
              },
            },
          },
        },
      },
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: "Participant not found" },
      { status: 404 }
    );
  }

  const batch = participant.group.batch;
  const scopeError = requireResolvedGroupScope(user, { ...participant.group, id: participant.groupId });
  if (scopeError) return scopeError;

  // Fetch attendance events for the group
  const attendanceEvents = await db.attendanceEvent.findMany({
    where: { groupId: participant.groupId, eventDate: { lte: new Date() } },
    select: { id: true, eventDate: true },
  });

  const eligibleEvents = attendanceEvents.filter(event => eligibleForSession(participant, event.eventDate));
  const totalEvents = eligibleEvents.length;

  // Fetch attendance records for this participant
  const presentCount = await db.attendanceRecord.count({
    where: {
      participantId,
      eventId: { in: eligibleEvents.map((e) => e.id) },
      status: { in: ["present", "late"] },
    },
  });

  const attendanceRate =
    totalEvents > 0
      ? Math.round((presentCount / totalEvents) * 100 * 10) / 10
      : null;

  // Completion date = batch end date or today
  const completionDate = batch.endDate
    ? formatPKT(new Date(batch.endDate))
    : null;

  return NextResponse.json({
    participant: participant.name,
    groupId: participant.group.id,
    group: participant.group.name,
    batchId: batch.id,
    batch: batch.name,
    batchStartDate: formatPKT(new Date(batch.startDate)),
    batchEndDate: batch.endDate ? formatPKT(new Date(batch.endDate)) : null,
    park: (participant.group.parkId ? participant.group.park : batch.park)?.name,
    city: (participant.group.parkId ? participant.group.park : batch.park)?.city.name,
    joinDate: formatPKT(new Date(participant.joinedAt)),
    completionDate,
    attendanceRate,
    totalEvents,
    certificateNo: null,
    previewOnly: true,
  });
}
