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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    // Get park info
    const park = await db.park.findUnique({
      where: { id: parkId },
      include: { city: { select: { name: true } } },
    });

    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }

    // Get all active groups in the park
    const groups = await db.group.findMany({
      where: {
        batch: { parkId, isActive: true },
        isActive: true,
        ...(allowedGroupIds ? { id: { in: allowedGroupIds } } : {}),
      },
      include: {
        batch: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    const allGroupIds = groups.map((g) => g.id);
    const groupMap = new Map(groups.map((g) => [g.id, { name: g.name, batchName: g.batch.name }]));

    if (allGroupIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
        park: { id: park.id, name: park.name, city: park.city?.name || "Unknown" },
      });
    }

    // Get all participants in these groups with their guardian links
    const participants = await db.participant.findMany({
      where: { groupId: { in: allGroupIds } },
      include: {
        guardianLinks: {
          include: {
            guardian: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Build a map: guardianId -> { guardian, children[] }
    const guardianMap = new Map<string, {
      id: string;
      name: string;
      phone: string;
      cnic: string | null;
      address: string | null;
      children: {
        participantId: string;
        participantName: string;
        groupName: string;
        batchName: string;
        relation: string | null;
        state: string;
        participantId_att: string;
      }[];
    }>();

    for (const p of participants) {
      const groupInfo = groupMap.get(p.groupId);
      for (const link of p.guardianLinks) {
        const g = link.guardian;
        if (!g) continue;
        const existing = guardianMap.get(g.id);
        const childInfo = {
          participantId: p.id,
          participantName: p.name,
          groupName: groupInfo?.name || "Unknown",
          batchName: groupInfo?.batchName || "Unknown",
          relation: link.relation || null,
          state: p.state,
          participantId_att: p.id,
        };
        if (existing) {
          existing.children.push(childInfo);
        } else {
          guardianMap.set(g.id, {
            id: g.id,
            name: g.name,
            phone: g.phone,
            cnic: g.cnic,
            address: g.address,
            children: [childInfo],
          });
        }
      }
    }

    // Convert to array and apply search filter
    let guardians = Array.from(guardianMap.values());

    if (search) {
      const s = search.toLowerCase();
      guardians = guardians.filter(
        (g) =>
          g.name.toLowerCase().includes(s) ||
          g.phone.includes(s) ||
          g.cnic?.includes(s) === true
      );
    }

    // Sort by name
    guardians.sort((a, b) => a.name.localeCompare(b.name));

    // Get total for pagination
    const total = guardians.length;

    // Paginate
    const paginatedGuardians = guardians.slice((page - 1) * pageSize, page * pageSize);

    // Get 30-day attendance stats for all children of the paginated guardians
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Collect all participant IDs from paginated guardians' children
    const allChildParticipantIds: string[] = [];
    for (const g of paginatedGuardians) {
      for (const c of g.children) {
        allChildParticipantIds.push(c.participantId_att);
      }
    }

    // Fetch attendance records for these participants
    const thirtyDayRecords = allChildParticipantIds.length > 0
      ? await db.attendanceRecord.findMany({
          where: {
            participantId: { in: allChildParticipantIds },
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

    // Build per-participant stats
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

    // Build final response with attendance rates
    const data = paginatedGuardians.map((g) => {
      const childrenWithRates = g.children.map((c) => {
        const stats = participantStats.get(c.participantId_att) || {
          present: 0, absent: 0, late: 0, excused: 0, total: 0,
        };
        const rate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;
        return {
          participantId: c.participantId,
          name: c.participantName,
          groupName: c.groupName,
          batchName: c.batchName,
          relation: c.relation,
          state: c.state,
          attendance30Day: {
            present: stats.present,
            absent: stats.absent,
            late: stats.late,
            excused: stats.excused,
            rate,
          },
        };
      });

      return {
        id: g.id,
        name: g.name,
        phone: g.phone,
        cnic: g.cnic,
        address: g.address,
        childrenCount: childrenWithRates.length,
        children: childrenWithRates,
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      park: { id: park.id, name: park.name, city: park.city?.name || "Unknown" },
    });
  } catch (error) {
    console.error("Park guardians error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}