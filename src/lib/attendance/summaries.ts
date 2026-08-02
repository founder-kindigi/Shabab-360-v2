import { db } from "@/lib/db";
import { getISOWeek, getISOWeekYear } from "date-fns";

export interface DateAndPaginationParams {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface StudentSummaryParams extends DateAndPaginationParams {
  participantId?: string;
  groupId?: string;
  parkId?: string;
  cityId?: string;
}

export interface MurabbiSummaryParams extends DateAndPaginationParams {
  staffId?: string;
  parkId?: string;
  cityId?: string;
}

export interface ClassStatsParams extends DateAndPaginationParams {
  groupId?: string;
  parkId?: string;
  cityId?: string;
}

/**
 * Creates a roster snapshot of active participants for an event.
 */
export async function createRosterSnapshot(eventId: string) {
  const event = await db.attendanceEvent.findUnique({
    where: { id: eventId },
    select: { id: true, groupId: true },
  });

  if (!event) return { count: 0 };

  const activeParticipants = await db.participant.findMany({
    where: { groupId: event.groupId, state: "active" },
    select: { id: true, groupId: true },
  });

  if (activeParticipants.length === 0) return { count: 0 };

  const snapshots = activeParticipants.map((p) => ({
    eventId,
    participantId: p.id,
    groupId: p.groupId,
    snapshotState: "active",
  }));

  // Create roster snapshots ignoring duplicates
  let count = 0;
  for (const s of snapshots) {
    await db.attendanceRosterSnapshot.upsert({
      where: {
        eventId_participantId: {
          eventId: s.eventId,
          participantId: s.participantId,
        },
      },
      create: s,
      update: { groupId: s.groupId, snapshotState: s.snapshotState },
    });
    count++;
  }

  return { count };
}

/**
 * Marks or updates a staff attendance record. Uses StaffAttendanceRecord.
 */
export async function markStaffAttendanceRecord(params: {
  eventId: string;
  staffId: string;
  status: string;
  markedBy?: string;
  editReason?: string;
}) {
  const { eventId, staffId, status, markedBy, editReason } = params;

  const record = await db.staffAttendanceRecord.upsert({
    where: {
      eventId_staffId: { eventId, staffId },
    },
    create: {
      eventId,
      staffId,
      status,
      markedBy,
      editReason,
    },
    update: {
      status,
      markedBy,
      editReason,
      markedAt: new Date(),
    },
  });

  return record;
}

/**
 * Student Summary: aggregates student attendance from normalized AttendanceRecord rows.
 */
export async function getStudentSummary(params: StudentSummaryParams) {
  const { participantId, groupId, parkId, cityId, from, to, limit = 50, offset = 0 } = params;

  const whereParticipant: any = {};
  if (participantId) whereParticipant.id = participantId;
  if (groupId) whereParticipant.groupId = groupId;
  if (parkId || cityId) {
    whereParticipant.group = {
      batch: {
        ...(parkId ? { parkId } : {}),
        ...(cityId ? { park: { cityId } } : {}),
      },
    };
  }

  const [participants, totalCount] = await Promise.all([
    db.participant.findMany({
      where: whereParticipant,
      select: {
        id: true,
        name: true,
        state: true,
        dropoutAt: true,
        dropoutReason: true,
        dropoutSource: true,
        groupId: true,
        group: {
          select: {
            name: true,
            batch: {
              select: {
                name: true,
                park: {
                  select: { name: true, city: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: { name: "asc" },
    }),
    db.participant.count({ where: whereParticipant }),
  ]);

  const participantIds = participants.map((p) => p.id);

  const recordsWhere: any = {
    participantId: { in: participantIds },
    event: { isClosed: true },
  };
  if (from || to) {
    recordsWhere.event = {
      isClosed: true,
      eventDate: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    };
  }

  const attendanceRecords = participantIds.length > 0
    ? await db.attendanceRecord.findMany({
        where: recordsWhere,
        select: {
          participantId: true,
          status: true,
          event: { select: { eventDate: true } },
        },
      })
    : [];

  const recordMap = new Map<string, {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    lastAttendanceAt: Date | null;
    missedWeekKeys: Set<string>;
    attendedWeekKeys: Set<string>;
  }>();
  for (const r of attendanceRecords) {
    const stats = recordMap.get(r.participantId) || {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
      lastAttendanceAt: null,
      missedWeekKeys: new Set<string>(),
      attendedWeekKeys: new Set<string>(),
    };
    stats.total++;
    if (r.status === "present") stats.present++;
    else if (r.status === "absent") stats.absent++;
    else if (r.status === "late") stats.late++;
    else if (r.status === "excused") stats.excused++;
    const eventDate = r.event.eventDate;
    const weekKey = `${getISOWeekYear(eventDate)}-${getISOWeek(eventDate)}`;
    if (r.status === "present" || r.status === "late") {
      stats.attendedWeekKeys.add(weekKey);
      if (!stats.lastAttendanceAt || eventDate > stats.lastAttendanceAt) {
        stats.lastAttendanceAt = eventDate;
      }
    } else if (r.status === "absent") {
      stats.missedWeekKeys.add(weekKey);
    }
    recordMap.set(r.participantId, stats);
  }

  const items = participants.map((p) => {
    const stats = recordMap.get(p.id) || {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
      lastAttendanceAt: null,
      missedWeekKeys: new Set<string>(),
      attendedWeekKeys: new Set<string>(),
    };
    const attended = stats.present + stats.late;
    const rate = stats.total > 0 ? Math.round((attended / stats.total) * 100) : 0;

    return {
      participantId: p.id,
      name: p.name,
      state: p.state,
      dropoutAt: p.dropoutAt,
      dropoutReason: p.dropoutReason,
      dropoutSource: p.dropoutSource,
      groupName: p.group?.name || "Unassigned",
      batchName: p.group?.batch.name || null,
      parkName: p.group?.batch.park.name || null,
      cityName: p.group?.batch.park.city?.name || null,
      totalEvents: stats.total,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      excused: stats.excused,
      attendanceRate: rate,
      lastAttendanceAt: stats.lastAttendanceAt,
      missedWeekStreak: [...stats.missedWeekKeys].filter(
        (weekKey) => !stats.attendedWeekKeys.has(weekKey),
      ).length,
    };
  });

  return {
    items,
    total: totalCount,
    limit,
    offset,
  };
}

/**
 * Murabbi Summary: calculates staff attendance stats using StaffAttendanceRecord.
 * NEVER uses participant attendance rows.
 */
export async function getMurabbiSummary(params: MurabbiSummaryParams) {
  const { staffId, parkId, cityId, from, to, limit = 50, offset = 0 } = params;

  const whereStaff: any = {
    role: { in: ["murabbi", "park_lead", "park_admin"] },
  };

  if (staffId) whereStaff.id = staffId;
  if (parkId) whereStaff.assignedParkId = parkId;
  if (cityId) whereStaff.assignedCityId = cityId;

  const [staffList, totalCount] = await Promise.all([
    db.staffMeta.findMany({
      where: whereStaff,
      select: {
        id: true,
        role: true,
        isActive: true,
        user: { select: { name: true, email: true } },
        assignedPark: { select: { name: true, city: { select: { name: true } } } },
        assignedGroup: {
          select: {
            name: true,
            batch: { select: { park: { select: { name: true, city: { select: { name: true } } } } } },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: { user: { name: "asc" } },
    }),
    db.staffMeta.count({ where: whereStaff }),
  ]);

  const staffIds = staffList.map((s) => s.id);

  const staffRecordsWhere: any = {
    staffId: { in: staffIds },
  };

  if (from || to) {
    staffRecordsWhere.event = {
      eventDate: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    };
  }

  const staffRecords = staffIds.length > 0
    ? await db.staffAttendanceRecord.findMany({
        where: staffRecordsWhere,
        select: {
          staffId: true,
          status: true,
        },
      })
    : [];

  const staffStatsMap = new Map<string, { present: number; absent: number; late: number; excused: number; total: number }>();
  for (const sr of staffRecords) {
    const stats = staffStatsMap.get(sr.staffId) || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    stats.total++;
    if (sr.status === "present") stats.present++;
    else if (sr.status === "absent") stats.absent++;
    else if (sr.status === "late") stats.late++;
    else if (sr.status === "excused") stats.excused++;
    staffStatsMap.set(sr.staffId, stats);
  }

  const items = staffList.map((s) => {
    const stats = staffStatsMap.get(s.id) || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    const attended = stats.present + stats.late;
    const rate = stats.total > 0 ? Math.round((attended / stats.total) * 100) : 0;

    return {
      staffId: s.id,
      name: s.user.name || "Unknown",
      email: s.user.email,
      role: s.role,
      isActive: s.isActive,
      groupName: s.assignedGroup?.name || null,
      parkName: s.assignedPark?.name || s.assignedGroup?.batch.park.name || null,
      cityName: s.assignedPark?.city?.name || s.assignedGroup?.batch.park.city?.name || null,
      totalSessions: stats.total,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      excused: stats.excused,
      attendanceRate: rate,
    };
  });

  return {
    items,
    total: totalCount,
    limit,
    offset,
  };
}

/**
 * Class Stats: aggregates group/class statistics using roster snapshots.
 */
export async function getClassStats(params: ClassStatsParams) {
  const { groupId, parkId, cityId, from, to, limit = 50, offset = 0 } = params;

  const whereGroup: any = {};
  if (groupId) whereGroup.id = groupId;
  if (parkId || cityId) {
    whereGroup.batch = {
      ...(parkId ? { parkId } : {}),
      ...(cityId ? { park: { cityId } } : {}),
    };
  }

  const [groups, totalCount] = await Promise.all([
    db.group.findMany({
      where: whereGroup,
      select: {
        id: true,
        name: true,
        batch: {
          select: {
            name: true,
            park: { select: { name: true, city: { select: { name: true } } } },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: { name: "asc" },
    }),
    db.group.count({ where: whereGroup }),
  ]);

  const groupIds = groups.map((g) => g.id);

  const eventsWhere: any = {
    groupId: { in: groupIds },
    isClosed: true,
  };
  if (from || to) {
    eventsWhere.eventDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const events = groupIds.length > 0
    ? await db.attendanceEvent.findMany({
        where: eventsWhere,
        include: {
          records: { select: { status: true } },
          rosterSnapshots: { select: { id: true } },
        },
      })
    : [];

  const groupStatsMap = new Map<string, { totalEvents: number; totalSnapshots: number; totalPresent: number; totalAbsent: number; totalLate: number; totalExcused: number }>();

  for (const ev of events) {
    const stats = groupStatsMap.get(ev.groupId) || {
      totalEvents: 0,
      totalSnapshots: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0,
    };

    stats.totalEvents++;
    stats.totalSnapshots += ev.rosterSnapshots.length;

    for (const r of ev.records) {
      if (r.status === "present") stats.totalPresent++;
      else if (r.status === "absent") stats.totalAbsent++;
      else if (r.status === "late") stats.totalLate++;
      else if (r.status === "excused") stats.totalExcused++;
    }

    groupStatsMap.set(ev.groupId, stats);
  }

  const items = groups.map((g) => {
    const stats = groupStatsMap.get(g.id) || {
      totalEvents: 0,
      totalSnapshots: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0,
    };

    const totalMarked = stats.totalPresent + stats.totalAbsent + stats.totalLate + stats.totalExcused;
    const attended = stats.totalPresent + stats.totalLate;
    const averageRate = totalMarked > 0 ? Math.round((attended / totalMarked) * 100) : 0;

    return {
      groupId: g.id,
      groupName: g.name,
      batchName: g.batch.name,
      parkName: g.batch.park.name,
      cityName: g.batch.park.city?.name || null,
      totalEvents: stats.totalEvents,
      snapshotRosterTotal: stats.totalSnapshots,
      markedCount: totalMarked,
      unmarkedCount: Math.max(0, stats.totalSnapshots - totalMarked),
      totalPresent: stats.totalPresent,
      totalAbsent: stats.totalAbsent,
      totalLate: stats.totalLate,
      totalExcused: stats.totalExcused,
      averageAttendanceRate: averageRate,
    };
  });

  return {
    items,
    total: totalCount,
    limit,
    offset,
  };
}
