import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT } from "@/lib/timezone";
import {
  optionalIdentifier,
  optionalQueryText,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const listQuerySchema = z.object({
  search: optionalQueryText(),
  groupId: optionalIdentifier(),
  batchId: optionalIdentifier(),
});

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const capabilityAuth = await requireCapability("people.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    // Determine park scope from staffMeta
    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
      select: {
        role: true,
        assignedParkId: true,
        assignedGroupId: true,
      },
    });

    let parkId: string | null = null;
    let allowedGroupIds: string[] | null = null;

    if (!staffMeta) {
      return NextResponse.json({ error: "No staff assignment found" }, { status: 403 });
    }

    if (staffMeta.role === "murabbi" && staffMeta.assignedGroupId) {
      const group = await db.group.findUnique({
        where: { id: staffMeta.assignedGroupId },
        include: { batch: { select: { parkId: true } } },
      });
      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
      parkId = group.batch.parkId;
      allowedGroupIds = [group.id];
    } else if (staffMeta.assignedParkId) {
      parkId = staffMeta.assignedParkId;
    }

    if (!parkId) {
      return NextResponse.json({ error: "No park assigned" }, { status: 403 });
    }

    const query = listQuerySchema.safeParse(queryParamsToObject(new URL(request.url).searchParams));
    if (!query.success) {
      return NextResponse.json(queryValidationError(query.error), { status: 400 });
    }
    const { search = "", groupId: filterGroupId, batchId: filterBatchId } = query.data;

    // Get park info
    const park = await db.park.findUnique({
      where: { id: parkId },
      include: { city: { select: { name: true } } },
    });

    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }

    // Get all active batches in the park
    let batchWhere: any = { parkId, isActive: true };
    if (filterBatchId) {
      batchWhere.id = filterBatchId;
    }

    const batches = await db.batch.findMany({
      where: batchWhere,
      include: {
        groups: {
          where: {
            isActive: true,
            ...(filterGroupId ? { id: filterGroupId } : {}),
            ...(allowedGroupIds ? { id: { in: allowedGroupIds } } : {}),
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Collect all group IDs
    const allGroupIds: string[] = [];
    for (const batch of batches) {
      for (const group of batch.groups) {
        allGroupIds.push(group.id);
      }
    }

    if (allGroupIds.length === 0) {
      // Count all participants in park's groups for summary
      const allParkGroups = await db.group.findMany({
        where: { batch: { parkId, isActive: true }, isActive: true },
        select: { id: true },
      });
      const allParkGroupIds = allParkGroups.map(g => g.id);
      const [totalAll, activeAll, inactiveAll, onLeaveAll] = await Promise.all([
        db.participant.count({ where: { groupId: { in: allParkGroupIds } } }),
        db.participant.count({ where: { groupId: { in: allParkGroupIds }, state: "active" } }),
        db.participant.count({ where: { groupId: { in: allParkGroupIds }, state: "inactive" } }),
        db.participant.count({ where: { groupId: { in: allParkGroupIds }, state: "on_leave" } }),
      ]);

      return NextResponse.json({
        park: { id: park.id, name: park.name, city: park.city?.name || "Unknown" },
        batches: [],
        totalParticipants: totalAll,
        activeParticipants: activeAll,
        inactiveParticipants: inactiveAll,
        onLeaveParticipants: onLeaveAll,
        activeGroups: allParkGroupIds.length,
      });
    }

    // Count participants by state for the summary bar (all groups in park, not filtered)
    const allParkGroups = await db.group.findMany({
      where: { batch: { parkId, isActive: true }, isActive: true },
      select: { id: true },
    });
    const allParkGroupIds = allParkGroups.map(g => g.id);
    const [totalCount, activeCount, inactiveCount, onLeaveCount] = await Promise.all([
      db.participant.count({ where: { groupId: { in: allParkGroupIds } } }),
      db.participant.count({ where: { groupId: { in: allParkGroupIds }, state: "active" } }),
      db.participant.count({ where: { groupId: { in: allParkGroupIds }, state: "inactive" } }),
      db.participant.count({ where: { groupId: { in: allParkGroupIds }, state: "on_leave" } }),
    ]);

    // Today's date range in PKT
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();

    // 30 days ago in PKT
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build participant where clause - include active and on_leave
    const participantWhere: any = {
      groupId: { in: allGroupIds },
      state: { in: ["active", "on_leave"] },
    };
    if (search) {
      participantWhere.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // Get all participants with guardian links
    const participants = await db.participant.findMany({
      where: participantWhere,
      include: {
        guardianLinks: {
          include: {
            guardian: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const participantIds = participants.map((p) => p.id);

    // Get 30-day attendance records for all participants
    const thirtyDayRecords = participantIds.length > 0
      ? await db.attendanceRecord.findMany({
          where: {
            participantId: { in: participantIds },
            event: {
              eventDate: { gte: thirtyDaysAgo, lte: todayEnd },
              isClosed: true,
            },
          },
          select: {
            participantId: true,
            status: true,
          },
        })
      : [];

    // Count total closed events per group in the last 30 days
    const thirtyDayEvents = await db.attendanceEvent.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: allGroupIds },
        eventDate: { gte: thirtyDaysAgo, lte: todayEnd },
        isClosed: true,
      },
      _count: true,
    });
    const eventsPerGroup = new Map(thirtyDayEvents.map((e) => [e.groupId, e._count]));

    // Build per-participant 30-day stats
    const participantStats = new Map<
      string,
      { present: number; absent: number; late: number; excused: number; total: number }
    >();

    for (const rec of thirtyDayRecords) {
      const existing = participantStats.get(rec.participantId) || {
        present: 0, absent: 0, late: 0, excused: 0, total: 0,
      };
      existing.total++;
      if (rec.status === "present") existing.present++;
      else if (rec.status === "absent") existing.absent++;
      else if (rec.status === "late") existing.late++;
      else if (rec.status === "excused") existing.excused++;
      participantStats.set(rec.participantId, existing);
    }

    // Get today's attendance events
    const todayEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: allGroupIds },
        eventDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        records: {
          select: { participantId: true, status: true },
        },
      },
    });

    // Build today's status map: participantId -> status
    const todayStatus = new Map<string, string>();
    for (const ev of todayEvents) {
      for (const rec of ev.records) {
        todayStatus.set(rec.participantId, rec.status);
      }
    }

    // Group participants by groupId
    const participantsByGroup = new Map<string, typeof participants>();
    for (const p of participants) {
      const arr = participantsByGroup.get(p.groupId) || [];
      arr.push(p);
      participantsByGroup.set(p.groupId, arr);
    }

    // Build response
    let totalInRoster = 0;
    const activeGroups = allGroupIds.length;

    const batchData = batches.map((batch) => {
      const groupsData = batch.groups.map((group) => {
        const groupParticipants = participantsByGroup.get(group.id) || [];
        totalInRoster += groupParticipants.length;

        let groupRate = 0;

        const participantList = groupParticipants.map((p, idx) => {
          const stats = participantStats.get(p.id) || {
            present: 0, absent: 0, late: 0, excused: 0, total: 0,
          };
          const rate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;
          groupRate += rate;

          const guardian = p.guardianLinks.length > 0 ? p.guardianLinks[0].guardian : null;

          return {
            id: p.id,
            name: p.name,
            phone: p.phone,
            gender: p.gender,
            dateOfBirth: p.dateOfBirth?.toISOString() || null,
            address: p.address || null,
            state: p.state,
            joinedAt: p.joinedAt.toISOString(),
            guardianName: guardian?.name || null,
            guardianPhone: guardian?.phone || null,
            attendance30Day: {
              present: stats.present,
              absent: stats.absent,
              late: stats.late,
              excused: stats.excused,
              rate,
            },
            todayStatus: todayStatus.get(p.id) || null,
            _idx: idx,
          };
        });

        groupRate = groupParticipants.length > 0 ? Math.round(groupRate / groupParticipants.length) : 0;

        return {
          id: group.id,
          name: group.name,
          avgAttendanceRate: groupRate,
          participants: participantList,
        };
      });

      return {
        id: batch.id,
        name: batch.name,
        groups: groupsData,
      };
    });

    return NextResponse.json({
      park: { id: park.id, name: park.name, city: park.city?.name || "Unknown" },
      batches: batchData,
      totalParticipants: totalCount,
      activeParticipants: activeCount,
      inactiveParticipants: inactiveCount,
      onLeaveParticipants: onLeaveCount,
      activeGroups,
    });
  } catch (error) {
    console.error("Park roster error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
