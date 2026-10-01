import { eligibleForSession } from "@/lib/attendance/opportunities";
import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireResourceScope, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { requireResolvedGroupScope, resolveRequestedHierarchy } from "@/lib/auth/hierarchy";
import { formatPKT } from "@/lib/timezone";
import {
  optionalIdentifier,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const certificateQuerySchema = z.object({
  batchId: optionalIdentifier(),
});

const ADMIN_ROLES = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
] as const;

export async function GET(request: NextRequest) {
  const roleError = await requireRole([...ADMIN_ROLES]);
  if (roleError) return roleError;

  const auth = await requireCapability("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const query = certificateQuerySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
  if (!query.success) {
    return NextResponse.json(queryValidationError(query.error), { status: 400 });
  }
  const batchId = query.data.batchId;

  if (!batchId) {
    return NextResponse.json(
      { error: "batchId query parameter is required" },
      { status: 400 }
    );
  }

  // Fetch batch with park/city
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      park: { include: { city: true } },
      groups: {
        where: { isActive: true },
        include: {
          park: { include: { city: true } },
          participants: {
            where: { state: { in: ["active", "graduated"] } },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const scope = await resolveRequestedHierarchy(user, { cityId: batch.cityId ?? batch.park.cityId });
  if (scope instanceof NextResponse) return scope;
  const authorizedGroups = batch.groups.filter((group) => !requireResolvedGroupScope(user, { ...group, batch }));

  // Collect all group IDs and participant IDs
  const allParticipants: Array<{
    id: string;
    name: string;
    groupId: string;
    groupName: string;
    joinedAt: Date;
    state: string;
    dropoutAt: Date | null;
    parkName: string;
    cityName: string;
  }> = [];

  const groupIds: string[] = [];
  for (const group of authorizedGroups) {
    groupIds.push(group.id);
    for (const p of group.participants) {
      allParticipants.push({
        id: p.id,
        name: p.name,
        groupId: group.id,
        groupName: group.name,
        joinedAt: p.joinedAt,
        state: p.state,
        dropoutAt: p.dropoutAt,
        parkName: (group.parkId ? group.park : batch.park)!.name,
        cityName: (group.parkId ? group.park : batch.park)!.city.name,
      });
    }
  }

  // Batch-fetch attendance events and records
  const attendanceEvents = await db.attendanceEvent.findMany({
    where: { groupId: { in: groupIds }, eventDate: { lte: new Date() } },
    select: { id: true, groupId: true, eventDate: true },
  });

  const eventIds = attendanceEvents.map((e) => e.id);
  const attendanceRecords = await db.attendanceRecord.findMany({
    where: {
      eventId: { in: eventIds },
      status: { in: ["present", "late"] },
    },
    select: { eventId: true, participantId: true },
  });

  // Group present records by participant
  const presentByParticipant = new Map<string, Set<string>>();
  for (const r of attendanceRecords) {
    const set = presentByParticipant.get(r.participantId) || new Set();
    set.add(r.eventId);
    presentByParticipant.set(r.participantId, set);
  }

  const completionDate = batch.endDate
    ? formatPKT(new Date(batch.endDate))
    : null;

  const certificates = allParticipants.map((p) => {
    const groupEvents = attendanceEvents.filter(event => event.groupId === p.groupId && eligibleForSession(p, event.eventDate)).map(event => event.id);
    const totalEvents = groupEvents.length;
    const presentEvents = presentByParticipant.get(p.id);
    const presentCount = presentEvents
      ? [...presentEvents].filter((eid) => groupEvents.includes(eid)).length
      : 0;
    const attendanceRate =
      totalEvents > 0
        ? Math.round((presentCount / totalEvents) * 100 * 10) / 10
        : null;


    return {
      participantId: p.id,
      participant: p.name,
      group: p.groupName,
      batch: batch.name,
      batchStartDate: formatPKT(new Date(batch.startDate)),
      batchEndDate: batch.endDate ? formatPKT(new Date(batch.endDate)) : null,
      park: p.parkName,
      city: p.cityName,
      joinDate: formatPKT(new Date(p.joinedAt)),
      completionDate,
      attendanceRate,
      totalEvents,
      certificateNo: null,
    previewOnly: true,
    };
  });

  return NextResponse.json({
    batchId: batch.id,
    batch: batch.name,
    parks: [...new Set(certificates.map(c => c.park))],
    city: batch.park.city.name,
    totalParticipants: certificates.length,
    certificates,
  });
}
