import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, formatPKT, toPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { moneyToNumber } from "@/lib/money";
import { subDays, startOfMonth, endOfMonth } from "date-fns";


type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const capabilityAuth = await requireCapability("dashboard.view");
  if (capabilityAuth instanceof NextResponse) return capabilityAuth;

  try {
    // Find participant linked to this user
    const participant = await db.participant.findFirst({
      where: { userId: user.id },
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
    });

    if (!participant) {
      return NextResponse.json({ participant: null });
    }

    // Fire audit log (fire-and-forget)
    logAudit({
      userId: user.id,
      action: "view",
      entityType: "student_dashboard",
    });

    const groupId = participant.group.id;
    const todayStart = todayPKT();
    const todayEnd = endOfTodayPKT();

    // ── Date ranges ──
    const thirtyDaysAgo = subDays(todayStart, 29);
    const sevenDaysAgo = subDays(todayStart, 6);
    const ninetyDaysAgo = subDays(todayStart, 89);

    // ── Monthly heatmap: get all records for current month ──
    const monthStartPKT = startOfMonth(todayStart);
    const monthEndPKT = endOfMonth(todayStart);

    const recordsThisMonth = await db.attendanceRecord.findMany({
      where: {
        participantId: participant.id,
        event: {
          groupId,
          eventDate: { gte: monthStartPKT, lte: monthEndPKT },
        },
      },
      include: {
        event: {
          select: { eventDate: true },
        },
      },
    });

    // Build a map: dateKey -> status (last status if multiple events per day)
    const monthStatusMap = new Map<string, string>();
    for (const r of recordsThisMonth) {
      const dateKey = formatPKT(new Date(r.event.eventDate), "yyyy-MM-dd");
      // If there are multiple events, prefer present > late > excused > absent
      const existing = monthStatusMap.get(dateKey);
      if (!existing) {
        monthStatusMap.set(dateKey, r.status);
      } else {
        const priority = ["present", "late", "excused", "absent"];
        if (priority.indexOf(r.status) < priority.indexOf(existing)) {
          monthStatusMap.set(dateKey, r.status);
        }
      }
    }

    // Generate array of { day, dayOfWeek, status } for each day of the month
    const daysInMonth = monthEndPKT.getDate();
    const heatmapData: Array<{ day: number; dayOfWeek: number; status: string | null }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(monthStartPKT.getFullYear(), monthStartPKT.getMonth(), d);
      const dateKey = formatPKT(dayDate, "yyyy-MM-dd");
      const status = monthStatusMap.get(dateKey) || null;
      heatmapData.push({
        day: d,
        dayOfWeek: dayDate.getDay(), // 0=Sun
        status,
      });
    }

    // ── Attendance records in last 30 days ──
    const records30 = await db.attendanceRecord.findMany({
      where: {
        participantId: participant.id,
        event: {
          groupId,
          eventDate: { gte: thirtyDaysAgo, lte: todayEnd },
        },
      },
      include: {
        event: {
          select: { id: true, title: true, eventDate: true, isClosed: true, _count: { select: { records: true } } },
        },
      },
      orderBy: { event: { eventDate: "desc" } },
    });

    const present30 = records30.filter((r) => r.status === "present").length;
    const absent30 = records30.filter((r) => r.status === "absent").length;
    const late30 = records30.filter((r) => r.status === "late").length;
    const excused30 = records30.filter((r) => r.status === "excused").length;
    const total30 = records30.length;

    const rate30 = total30 > 0 ? Math.round(((present30 + late30) / total30) * 100) : 0;

    // ── 7-day rate ──
    const records7 = records30.filter((r) => {
      const d = new Date(r.event.eventDate);
      return d >= sevenDaysAgo && d <= todayEnd;
    });
    const present7 = records7.filter((r) => r.status === "present").length;
    const late7 = records7.filter((r) => r.status === "late").length;
    const total7 = records7.length;
    const rate7 = total7 > 0 ? Math.round(((present7 + late7) / total7) * 100) : 0;

    // ── Current streak ──
    const records90 = await db.attendanceRecord.findMany({
      where: {
        participantId: participant.id,
        event: {
          groupId,
          eventDate: { gte: ninetyDaysAgo, lte: todayEnd },
        },
      },
      include: {
        event: { select: { eventDate: true } },
      },
    });

    const dateStatusMap = new Map<string, string[]>();
    for (const r of records90) {
      const zoned = toPKT(new Date(r.event.eventDate));
      const dateKey = formatPKT(zoned, "yyyy-MM-dd");
      const existing = dateStatusMap.get(dateKey) || [];
      existing.push(r.status);
      dateStatusMap.set(dateKey, existing);
    }

    let currentStreak = 0;
    for (let i = 0; i <= 90; i++) {
      const dayDate = subDays(todayStart, i);
      const dateKey = formatPKT(dayDate, "yyyy-MM-dd");
      const statuses = dateStatusMap.get(dateKey);
      if (statuses && statuses.some((s) => s === "present")) {
        currentStreak++;
      } else {
        if (statuses) break;
      }
    }

    let longestStreak = 0;
    let tempStreak = 0;
    const allDates: string[] = [];
    for (let i = 89; i >= 0; i--) {
      const dayDate = subDays(todayStart, i);
      allDates.push(formatPKT(dayDate, "yyyy-MM-dd"));
    }
    for (const dateKey of allDates) {
      const statuses = dateStatusMap.get(dateKey);
      if (statuses && statuses.some((s) => s === "present")) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else if (statuses) {
        tempStreak = 0;
      }
    }

    // ── Today's event ──
    const todayEvents = await db.attendanceEvent.findMany({
      where: {
        groupId,
        eventDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "desc" },
    });

    let todayEvent: {
      id: string;
      title: string;
      status: "Open" | "Closed" | null;
      myStatus: string | null;
      participantCount: number;
      markedCount: number;
      progress: number;
      groupName: string;
    } | null = null;

    if (todayEvents.length > 0) {
      const evt = todayEvents[0];
      const groupParticipantCount = await db.participant.count({
        where: { groupId, state: "active" },
      });

      const myRecord = await db.attendanceRecord.findUnique({
        where: {
          eventId_participantId: {
            eventId: evt.id,
            participantId: participant.id,
          },
        },
      });

      todayEvent = {
        id: evt.id,
        title: evt.title,
        status: evt.isClosed ? "Closed" : "Open",
        myStatus: myRecord?.status || null,
        participantCount: groupParticipantCount,
        markedCount: evt._count.records,
        progress:
          groupParticipantCount > 0
            ? Math.round((evt._count.records / groupParticipantCount) * 100)
            : 0,
        groupName: participant.group.name,
      };
    }

    // ── Upcoming events (next attendance event) ──
    const upcomingEvents = await db.attendanceEvent.findMany({
      where: {
        groupId,
        eventDate: { gt: todayEnd },
        isClosed: false,
      },
      orderBy: { eventDate: "asc" },
      take: 1,
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });

    const upcomingEvent = upcomingEvents.length > 0 ? {
      id: upcomingEvents[0].id,
      title: upcomingEvents[0].title,
      eventDate: upcomingEvents[0].eventDate.toISOString(),
      eventDateFormatted: formatPKT(new Date(upcomingEvents[0].eventDate), "EEE, dd MMM yyyy"),
    } : null;

    // ── Last 10 attendance records ──
    const recentRecords = records30.slice(0, 10).map((r) => ({
      date: formatPKT(new Date(r.event.eventDate), "dd MMM yyyy"),
      dateKey: formatPKT(new Date(r.event.eventDate), "yyyy-MM-dd"),
      status: r.status,
      eventTitle: r.event.title,
      groupName: participant.group.name,
    }));

    // ── 7-day daily trend ──
    const dailyTrend: Array<{ date: string; label: string; rate: number; hasEvent: boolean }> = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = subDays(todayStart, i);
      const dateKey = formatPKT(dayDate, "yyyy-MM-dd");
      const label = formatPKT(dayDate, "EEE");
      const dayRecords = records90.filter((r) => {
        const rk = formatPKT(new Date(r.event.eventDate), "yyyy-MM-dd");
        return rk === dateKey;
      });
      const hasEvent = dayRecords.length > 0;
      const presentCount = dayRecords.filter((r) => r.status === "present" || r.status === "late").length;
      const rate = hasEvent ? Math.round((presentCount / dayRecords.length) * 100) : 0;
      dailyTrend.push({ date: dateKey, label, rate, hasEvent });
    }

    // ── Fee summary with next due date ──
    const batchId = participant.group.batchId;
    const feeEvents = await db.feeEvent.findMany({
      where: { batchId, isActive: true },
      select: { id: true, title: true, amount: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    });
    const feeEventIds = feeEvents.map((f) => f.id);
    const totalExpected = feeEvents.reduce(
      (sum, feeEvent) => sum + moneyToNumber(feeEvent.amount),
      0
    );

    let totalPaid = 0;
    let nextDueDate: string | null = null;

    if (feeEventIds.length > 0) {
      const paymentSum = await db.payment.aggregate({
        where: {
          participantId: participant.id,
          feeEventId: { in: feeEventIds },
        },
        _sum: { amount: true },
      });
      totalPaid = moneyToNumber(paymentSum._sum.amount);

      // Find next unpaid fee event
      const paidEventIds = new Set(
        (await db.payment.findMany({
          where: {
            participantId: participant.id,
            feeEventId: { in: feeEventIds },
          },
          select: { feeEventId: true },
        })).map((p) => p.feeEventId)
      );

      for (const fe of feeEvents) {
        if (!paidEventIds.has(fe.id)) {
          nextDueDate = fe.dueDate ? formatPKT(new Date(fe.dueDate), "dd MMM yyyy") : null;
          break;
        }
      }
    }

    const outstanding = Math.max(totalExpected - totalPaid, 0);

    return NextResponse.json({
      participant: {
        id: participant.id,
        name: participant.name,
        group: participant.group.name,
        batch: participant.group.batch.name,
        park: participant.group.batch.park.name,
        city: participant.group.batch.park.city?.name || null,
        state: participant.state,
        joinedAt: participant.joinedAt,
      },
      metrics: {
        totalEvents30: total30,
        totalEvents7: total7,
        present30,
        absent30,
        late30,
        excused30,
        rate30,
        rate7,
      },
      todayEvent,
      recentRecords,
      streak: {
        current: currentStreak,
        longest: longestStreak,
      },
      dailyTrend,
      todayDate: formatPKT(new Date(), "EEEE, dd MMMM yyyy"),
      feeSummary: {
        totalExpected: Math.round(totalExpected),
        totalPaid: Math.round(totalPaid),
        outstanding: Math.round(outstanding),
        nextDueDate,
      },
      heatmapData,
      upcomingEvent,
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
