import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT } from "@/lib/timezone";

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const filterGroupId = searchParams.get("groupId") || null;
    const stateFilter = searchParams.get("state") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    // Get park info
    const park = await db.park.findUnique({
      where: { id: parkId },
      include: { city: { select: { name: true } } },
    });

    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }

    // Get all active batches and groups in the park
    const batches = await db.batch.findMany({
      where: { parkId, isActive: true },
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

    const allGroups: { id: string; name: string; batchId: string; batchName: string }[] = [];
    for (const batch of batches) {
      for (const group of batch.groups) {
        allGroups.push({
          id: group.id,
          name: group.name,
          batchId: batch.id,
          batchName: batch.name,
        });
      }
    }

    const allGroupIds = allGroups.map((g) => g.id);

    if (allGroupIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
        totalActive: 0,
        totalInactive: 0,
        newThisMonth: 0,
        weeklyAttendanceRate: 0,
        park: { id: park.id, name: park.name, city: park.city?.name || "Unknown" },
        groups: [],
      });
    }

    // Build participant where clause
    const participantWhere: any = {
      groupId: { in: allGroupIds },
    };

    if (stateFilter === "active") {
      participantWhere.state = "active";
    } else if (stateFilter === "inactive") {
      participantWhere.state = "inactive";
    }

    if (search) {
      participantWhere.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // Count totals (active/inactive) for the header stats
    const totalActive = await db.participant.count({
      where: { groupId: { in: allGroupIds }, state: "active" },
    });
    const totalInactive = await db.participant.count({
      where: { groupId: { in: allGroupIds }, state: "inactive" },
    });

    // Count new this month
    const nowPKT = todayPKT();
    const monthStart = new Date(nowPKT.getFullYear(), nowPKT.getMonth(), 1);
    const newThisMonth = await db.participant.count({
      where: {
        groupId: { in: allGroupIds },
        joinedAt: { gte: monthStart },
      },
    });

    // Calculate weekly attendance rate (last 7 days)
    const sevenDaysAgo = new Date(nowPKT.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekRecords = await db.attendanceRecord.findMany({
      where: {
        event: {
          eventDate: { gte: sevenDaysAgo, lte: endOfTodayPKT() },
          isClosed: true,
          groupId: { in: allGroupIds },
        },
      },
      select: { status: true },
    });
    let weekPresent = 0;
    let weekTotal = weekRecords.length;
    for (const r of weekRecords) {
      if (r.status === "present" || r.status === "late") weekPresent++;
    }
    const weeklyAttendanceRate = weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : 0;

    // Count filtered total for pagination
    const totalFiltered = await db.participant.count({ where: participantWhere });

    // Sort config
    const orderByMap: Record<string, any> = {
      name: { name: sortOrder },
      phone: { phone: sortOrder },
      joinedAt: { joinedAt: sortOrder },
      state: { state: sortOrder },
    };
    const orderBy = orderByMap[sortBy] || { name: sortOrder };

    // Fetch paginated participants
    const participants = await db.participant.findMany({
      where: participantWhere,
      include: {
        guardianLinks: {
          include: {
            guardian: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const participantIds = participants.map((p) => p.id);

    // Get 30-day attendance records
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

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
            event: {
              select: { eventDate: true },
            },
          },
        })
      : [];

    // Build per-participant 30-day stats + last attendance date
    const participantStats = new Map<
      string,
      { present: number; absent: number; late: number; excused: number; total: number; lastDate: string | null }
    >();

    for (const rec of thirtyDayRecords) {
      const existing = participantStats.get(rec.participantId) || {
        present: 0, absent: 0, late: 0, excused: 0, total: 0, lastDate: null,
      };
      existing.total++;
      if (rec.status === "present") existing.present++;
      else if (rec.status === "absent") existing.absent++;
      else if (rec.status === "late") existing.late++;
      else if (rec.status === "excused") existing.excused++;
      const eventDate = rec.event?.eventDate?.toISOString();
      if (eventDate) {
        if (!existing.lastDate || eventDate > existing.lastDate) {
          existing.lastDate = eventDate;
        }
      }
      participantStats.set(rec.participantId, existing);
    }

    // Group name map
    const groupMap = new Map(allGroups.map((g) => [g.id, g]));

    // Build response data
    const data = participants.map((p, idx) => {
      const stats = participantStats.get(p.id) || {
        present: 0, absent: 0, late: 0, excused: 0, total: 0, lastDate: null,
      };
      const rate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;
      const group = groupMap.get(p.groupId);
      const guardianLink = p.guardianLinks.length > 0 ? p.guardianLinks[0] : null;

      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth?.toISOString() || null,
        state: p.state,
        joinedAt: p.joinedAt.toISOString(),
        groupName: group?.name || "Unknown",
        batchName: group?.batchName || "Unknown",
        guardianId: guardianLink?.guardian?.id || null,
        guardianName: guardianLink?.guardian?.name || null,
        guardianPhone: guardianLink?.guardian?.phone || null,
        guardianRelation: guardianLink?.relation || null,
        attendance30Day: {
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
          excused: stats.excused,
          rate,
        },
        lastAttendanceDate: stats.lastDate || null,
        _idx: idx,
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / pageSize),
      },
      totalActive,
      totalInactive,
      newThisMonth,
      weeklyAttendanceRate,
      park: { id: park.id, name: park.name, city: park.city?.name || "Unknown" },
      groups: allGroups.map((g) => ({ id: g.id, name: g.name, batchName: g.batchName })),
    });
  } catch (error) {
    console.error("Park participants error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ==================== POST: Create Participant ====================

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["park_admin", "park_lead", "murabbi"];
  if (!user.role || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, phone, gender, dateOfBirth, groupId } = body;

    if (!name || !groupId) {
      return NextResponse.json({ error: "Name and group are required" }, { status: 400 });
    }

    // Verify the group belongs to the user's park
    const staffMeta = await db.staffMeta.findUnique({
      where: { userId: user.id },
      select: { assignedParkId: true, assignedGroupId: true, role: true },
    });

    if (!staffMeta?.assignedParkId) {
      return NextResponse.json({ error: "No park assigned" }, { status: 403 });
    }

    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { batch: { select: { parkId: true } } },
    });

    if (!group || group.batch.parkId !== staffMeta.assignedParkId) {
      return NextResponse.json({ error: "Invalid group" }, { status: 400 });
    }

    // Create participant
    const participant = await db.participant.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        groupId,
        state: "active",
      },
    });

    return NextResponse.json({ id: participant.id, name: participant.name }, { status: 201 });
  } catch (error) {
    console.error("Create participant error:", error);
    return NextResponse.json(
      { error: "Failed to create participant" },
      { status: 500 }
    );
  }
}