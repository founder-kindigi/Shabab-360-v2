import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, formatPKT, toPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { moneyToNumber } from "@/lib/money";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
};

type GuardianDashboardChild = {
  id: string;
  name: string;
  groupName: string | null;
  batchName: string | null;
  parkName: string | null;
  cityName: string | null;
  groupId: string;
  todayStatus: string | null;
  sparkline7Day: number[];
  attendance: {
    totalEvents30: number;
    present30: number;
    absent30: number;
    late30: number;
    excused30: number;
    rate30: number;
    rate7: number;
    last5: Array<{ date: string; status: string; title: string }>;
  };
  fees: {
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    upcomingFees: number;
    overdueFees: number;
  };
};

type GuardianDashboardTodayEvent = {
  id: string;
  title: string;
  isClosed: boolean;
  groupName: string;
  parkName: string | null;
  markedCount: number;
  participantCount: number;
  progress: number;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "guardian") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const capabilityAuth = await requireCapability("dashboard.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    // Fire audit log (fire-and-forget)
    logAudit({
      userId: user.id,
      action: "view",
      entityType: "guardian_dashboard",
    });

    // Find guardian record linked to this user
    const guardian = await db.guardian.findFirst({
      where: { userId: user.id },
    });

    if (!guardian) {
      return NextResponse.json({
        guardian: null,
        children: [],
        todayEvents: [],
        unreadAnnouncements: 0,
      });
    }

    // Get guardian's children with full participant data and hierarchy
    const guardianChildren = await db.guardianChild.findMany({
      where: { guardianId: guardian.id },
      include: {
        participant: {
          include: {
            group: {
              include: {
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
        },
      },
    });

    // PKT date boundaries
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();
    const nowPKT = toPKT(new Date());
    const thirtyDaysAgo = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    // Collect all group IDs for today's events query
    const groupIds = [
      ...new Set(
        guardianChildren
          .map((gc) => gc.participant.groupId)
          .filter(Boolean)
      ),
    ];

    // Build children data with attendance stats
    const children: GuardianDashboardChild[] = [];

    for (const gc of guardianChildren) {
      const p = gc.participant;
      const groupId = p.groupId;

      // 30-day attendance records
      const records30 = await db.attendanceRecord.findMany({
        where: {
          participantId: p.id,
          event: {
            eventDate: { gte: thirtyDaysAgo, lte: todayEnd },
          },
        },
        include: {
          event: {
            select: { title: true, eventDate: true },
          },
        },
        orderBy: { event: { eventDate: "desc" } },
      });

      // Get all unique events for this participant in 30 days
      const eventIds30 = [
        ...new Set(records30.map((r) => r.eventId)),
      ];
      const totalEvents30 = eventIds30.length;

      // Count statuses
      const present30 = records30.filter((r) => r.status === "present").length;
      const absent30 = records30.filter((r) => r.status === "absent").length;
      const late30 = records30.filter((r) => r.status === "late").length;
      const excused30 = records30.filter((r) => r.status === "excused").length;

      // 30-day rate: present (including late) / total events
      const rate30 =
        totalEvents30 > 0
          ? Math.round(((present30 + late30) / totalEvents30) * 100)
          : 0;

      // 7-day attendance records
      const records7 = records30.filter((r) => {
        const eventDate = new Date(r.event.eventDate);
        return eventDate >= sevenDaysAgo && eventDate <= todayEnd;
      });
      const eventIds7 = [...new Set(records7.map((r) => r.eventId))];
      const totalEvents7 = eventIds7.length;
      const present7 = records7.filter((r) => r.status === "present").length;
      const late7 = records7.filter((r) => r.status === "late").length;
      const rate7 =
        totalEvents7 > 0
          ? Math.round(((present7 + late7) / totalEvents7) * 100)
          : 0;

      // Last 5 attendance records
      const last5 = records30.slice(0, 5).map((r) => ({
        date: formatPKT(new Date(r.event.eventDate), "dd MMM yyyy"),
        status: r.status,
        title: r.event.title,
      }));

      // 7-day sparkline data (per-day rates for last 7 days)
      const sparkline7Day: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        const dayRecords = records30.filter((r) => {
          const ed = new Date(r.event.eventDate);
          return ed >= dayDate && ed <= dayEnd;
        });
        const dayEvents = [...new Set(dayRecords.map((r) => r.eventId))];
        const dayPresent = dayRecords.filter((r) => r.status === "present" || r.status === "late").length;
        sparkline7Day.push(dayEvents.length > 0 ? Math.round((dayPresent / dayEvents.length) * 100) : 0);
      }

      // Today's attendance status for this child
      const todayRecords = records30.filter((r) => {
        const ed = new Date(r.event.eventDate);
        return ed >= todayStart && ed <= todayEnd;
      });
      // Prefer present > late > excused > absent if multiple events
      const statusPriority = ["present", "late", "excused", "absent"];
      let todayStatus: string | null = null;
      for (const tr of todayRecords) {
        if (!todayStatus || statusPriority.indexOf(tr.status) < statusPriority.indexOf(todayStatus)) {
          todayStatus = tr.status;
        }
      }

      // Fee status for this child
      const nowPKTDate = nowPKT;
      const childFeeEvents = await db.feeEvent.findMany({
        where: {
          batchId: p.group?.batchId || "",
          isActive: true,
        },
        select: { id: true, title: true, amount: true, dueDate: true },
      });

      const childFeeEventIds = childFeeEvents.map((f) => f.id);
      let totalExpected = childFeeEvents.reduce(
        (sum, feeEvent) => sum + moneyToNumber(feeEvent.amount),
        0
      );
      let totalPaid = 0;
      let upcomingFees = 0;
      let overdueFees = 0;

      if (childFeeEventIds.length > 0) {
        const payments = await db.payment.findMany({
          where: {
            participantId: p.id,
            feeEventId: { in: childFeeEventIds },
          },
          select: { feeEventId: true, amount: true },
        });
        totalPaid = payments.reduce(
          (sum, payment) => sum + moneyToNumber(payment.amount),
          0
        );

        // Check per-fee-event status
        const paidEventIds = new Set(payments.map((pay) => pay.feeEventId));
        for (const fe of childFeeEvents) {
          if (paidEventIds.has(fe.id)) continue; // already paid
          if (fe.dueDate && new Date(fe.dueDate) < nowPKTDate) {
            overdueFees++;
          } else {
            upcomingFees++;
          }
        }
      }

      const outstanding = Math.max(totalExpected - totalPaid, 0);

      children.push({
        id: p.id,
        name: p.name,
        groupName: p.group?.name || null,
        batchName: p.group?.batch?.name || null,
        parkName: p.group?.batch?.park?.name || null,
        cityName: p.group?.batch?.park?.city?.name || null,
        groupId,
        todayStatus,
        sparkline7Day,
        attendance: {
          totalEvents30,
          present30,
          absent30,
          late30,
          excused30,
          rate30,
          rate7,
          last5,
        },
        fees: {
          totalExpected: Math.round(totalExpected),
          totalPaid: Math.round(totalPaid),
          outstanding: Math.round(outstanding),
          upcomingFees,
          overdueFees,
        },
      });
    }

    // Today's events for all children's groups
    const todayEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        _count: { select: { records: true } },
        group: {
          select: { name: true, batch: { select: { park: { select: { name: true } } } } },
        },
      },
      orderBy: { eventDate: "desc" },
    });

    // Get participant counts per group for progress calculation
    const todayEventsFormatted: GuardianDashboardTodayEvent[] = [];
    for (const evt of todayEvents) {
      const totalParticipants = await db.participant.count({
        where: { groupId: evt.groupId, state: "active" },
      });
      const marked = evt._count.records;
      todayEventsFormatted.push({
        id: evt.id,
        title: evt.title,
        isClosed: evt.isClosed,
        groupName: evt.group.name,
        parkName: evt.group.batch?.park?.name || null,
        markedCount: marked,
        participantCount: totalParticipants,
        progress:
          totalParticipants > 0
            ? Math.round((marked / totalParticipants) * 100)
            : 0,
      });
    }

    // Unread announcements (last 7 days, targeting guardian role)
    const sevenDaysAgoAnnounce = new Date(
      nowPKT.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    const unreadAnnouncements = await db.announcement.count({
      where: {
        createdAt: { gte: sevenDaysAgoAnnounce },
        targetRoles: { contains: "guardian" },
      },
    });

    return NextResponse.json({
      guardian: {
        name: guardian.name,
        phone: guardian.phone,
      },
      children,
      todayEvents: todayEventsFormatted,
      unreadAnnouncements,
      todayDate: formatPKT(new Date(), "dd MMM yyyy"),
      feesSummary: {
        totalPaidThisMonth: Math.round(
          children.reduce((sum, c) => sum + (c.fees?.totalPaid || 0), 0)
        ),
        totalOutstanding: Math.round(
          children.reduce((sum, c) => sum + (c.fees?.outstanding || 0), 0)
        ),
      },
      recentAnnouncements: await db.announcement.findMany({
        where: {
          targetRoles: { contains: "guardian" },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
        },
      }).then((anns) =>
        anns.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content?.slice(0, 120) || "",
          createdAt: a.createdAt.toISOString(),
        }))
      ),
    });
  } catch (error) {
    console.error("Guardian dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
