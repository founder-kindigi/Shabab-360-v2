import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { formatPKT } from "@/lib/timezone";

const ADMIN_ROLES = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
];

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Admin-only access
  if (!user.role || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");

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

  // Scope check
  const isHQ = ["super_admin", "program_admin"].includes(user.role);
  if (!isHQ) {
    if (
      user.role === "city_head" &&
      user.assignedCityId &&
      batch.park.city.id !== user.assignedCityId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      ["park_admin", "park_lead"].includes(user.role || "") &&
      user.assignedParkId &&
      batch.park.id !== user.assignedParkId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Collect all group IDs and participant IDs
  const allParticipants: Array<{
    id: string;
    name: string;
    groupId: string;
    groupName: string;
    joinedAt: Date;
  }> = [];

  const groupIds: string[] = [];
  for (const group of batch.groups) {
    groupIds.push(group.id);
    for (const p of group.participants) {
      allParticipants.push({
        id: p.id,
        name: p.name,
        groupId: group.id,
        groupName: group.name,
        joinedAt: p.joinedAt,
      });
    }
  }

  // Batch-fetch attendance events and records
  const attendanceEvents = await db.attendanceEvent.findMany({
    where: { groupId: { in: groupIds } },
    select: { id: true, groupId: true },
  });

  const eventIds = attendanceEvents.map((e) => e.id);
  const attendanceRecords = await db.attendanceRecord.findMany({
    where: {
      eventId: { in: eventIds },
      status: { in: ["present", "late"] },
    },
    select: { eventId: true, participantId: true },
  });

  // Group events by group
  const eventsByGroup = new Map<string, string[]>();
  for (const e of attendanceEvents) {
    const list = eventsByGroup.get(e.groupId) || [];
    list.push(e.id);
    eventsByGroup.set(e.groupId, list);
  }

  // Group present records by participant
  const presentByParticipant = new Map<string, Set<string>>();
  for (const r of attendanceRecords) {
    const set = presentByParticipant.get(r.participantId) || new Set();
    set.add(r.eventId);
    presentByParticipant.set(r.participantId, set);
  }

  const year = new Date().getFullYear();
  const batchCode = batch.name.replace(/\s+/g, "").toUpperCase().slice(0, 6);

  const completionDate = batch.endDate
    ? formatPKT(new Date(batch.endDate))
    : formatPKT(new Date());

  const certificates = allParticipants.map((p, idx) => {
    const groupEvents = eventsByGroup.get(p.groupId) || [];
    const totalEvents = groupEvents.length;
    const presentEvents = presentByParticipant.get(p.id);
    const presentCount = presentEvents
      ? [...presentEvents].filter((eid) => groupEvents.includes(eid)).length
      : 0;
    const attendanceRate =
      totalEvents > 0
        ? Math.round((presentCount / totalEvents) * 100 * 10) / 10
        : 0;

    const participantSuffix = p.id.slice(-6).toUpperCase();
    const certificateNo = `SHABAB-${year}-${batchCode}-${participantSuffix}`;

    return {
      participantId: p.id,
      participant: p.name,
      group: p.groupName,
      batch: batch.name,
      batchStartDate: formatPKT(new Date(batch.startDate)),
      batchEndDate: batch.endDate ? formatPKT(new Date(batch.endDate)) : null,
      park: batch.park.name,
      city: batch.park.city.name,
      joinDate: formatPKT(new Date(p.joinedAt)),
      completionDate,
      attendanceRate,
      totalEvents,
      certificateNo,
    };
  });

  return NextResponse.json({
    batchId: batch.id,
    batch: batch.name,
    park: batch.park.name,
    city: batch.park.city.name,
    totalParticipants: certificates.length,
    certificates,
  });
}