import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, formatPKT, toPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { subDays } from "date-fns";


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
    const thirtyDaysAgo = subDays(todayStart, 29); // 30 days inclusive
    const sevenDaysAgo = subDays(todayStart, 6);   // 7 days inclusive
    const ninetyDaysAgo = subDays(todayStart, 89);  // 90 days inclusive

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

    // 30-day rate: (present + late) / total
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

    // ── Current streak (consecutive days with "present" going backwards from today) ──
    // Build a map of date -> statuses for all records in last 90 days
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

    // Current streak: walk backwards from today
    let currentStreak = 0;
    for (let i = 0; i <= 90; i++) {
      const dayDate = subDays(todayStart, i);
      const dateKey = formatPKT(dayDate, "yyyy-MM-dd");
      const statuses = dateStatusMap.get(dateKey);
      if (statuses && statuses.some((s) => s === "present")) {
        currentStreak++;
      } else {
        // If there was no event on this day, skip it (don't break)
        // Only break if there was an event but no "present"
        if (statuses) break;
      }
    }

    // Longest streak in last 90 days
    let longestStreak = 0;
    let tempStreak = 0;
    // Build sorted array of unique dates from 90 days ago to today
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
        // Had event but not present -> break
        tempStreak = 0;
      }
      // No event -> don't reset
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

      // Find this student's record for today's event
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

    // ── Last 10 attendance records ──
    const recentRecords = records30.slice(0, 10).map((r) => ({
      date: formatPKT(new Date(r.event.eventDate), "dd MMM yyyy"),
      dateKey: formatPKT(new Date(r.event.eventDate), "yyyy-MM-dd"),
      status: r.status,
      eventTitle: r.event.title,
      groupName: participant.group.name,
    }));

    // ── 7-day daily trend for weekly chart ──
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

    // ── Fee summary ──
    const batchId = participant.group.batchId;
    const feeEvents = await db.feeEvent.findMany({
      where: { batchId, isActive: true },
      select: { id: true, amount: true },
    });
    const feeEventIds = feeEvents.map((f) => f.id);
    const totalExpected = feeEvents.reduce((sum, f) => sum + f.amount, 0);

    let totalPaid = 0;
    if (feeEventIds.length > 0) {
      const paymentSum = await db.payment.aggregate({
        where: {
          participantId: participant.id,
          feeEventId: { in: feeEventIds },
        },
        _sum: { amount: true },
      });
      totalPaid = paymentSum._sum.amount || 0;
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
      },
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}