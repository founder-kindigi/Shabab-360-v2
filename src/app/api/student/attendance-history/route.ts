import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPKT, toPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { subDays, parseISO } from "date-fns";

type SessionUser = {
  id?: string;
  role?: string;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = Math.min(Math.max(parseInt(limitParam || "30", 10), 1), 100);
  const offset = Math.max(parseInt(offsetParam || "0", 10), 0);

  try {
    // Find participant
    const participant = await db.participant.findFirst({
      where: { userId: user.id },
      select: { id: true, groupId: true },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Fire audit log (fire-and-forget)
    logAudit({
      userId: user.id,
      action: "view",
      entityType: "student_attendance_history",
    });

    // Build date range filter
    const defaultFrom = subDays(new Date(), 29);
    const from = fromParam ? parseISO(fromParam) : defaultFrom;
    const to = toParam ? parseISO(toParam) : new Date();

    // Fetch records with pagination
    const whereClause = {
      participantId: participant.id,
      event: {
        groupId: participant.groupId,
        eventDate: { gte: from, lte: to },
      },
    };

    const [records, total] = await Promise.all([
      db.attendanceRecord.findMany({
        where: whereClause,
        include: {
          event: {
            select: { id: true, title: true, eventDate: true, isClosed: true },
          },
        },
        orderBy: { event: { eventDate: "desc" } },
        skip: offset,
        take: limit,
      }),
      db.attendanceRecord.count({ where: whereClause }),
    ]);

    // Fetch all records in the date range for monthly summary (without pagination)
    const allRecordsInRange = await db.attendanceRecord.findMany({
      where: whereClause,
      include: {
        event: { select: { eventDate: true } },
      },
    });

    // Monthly summary
    const monthMap = new Map<
      string,
      { month: string; present: number; absent: number; late: number; excused: number; total: number }
    >();

    for (const r of allRecordsInRange) {
      const monthKey = formatPKT(new Date(r.event.eventDate), "yyyy-MM");
      const monthLabel = formatPKT(new Date(r.event.eventDate), "MMMM yyyy");
      const existing = monthMap.get(monthKey) || {
        month: monthLabel,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      };
      existing.total++;
      if (r.status === "present") existing.present++;
      else if (r.status === "absent") existing.absent++;
      else if (r.status === "late") existing.late++;
      else if (r.status === "excused") existing.excused++;
      monthMap.set(monthKey, existing);
    }

    // Sort months descending
    const monthlySummary = Array.from(monthMap.values()).sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        date: formatPKT(new Date(r.event.eventDate), "dd MMM yyyy"),
        dateKey: formatPKT(new Date(r.event.eventDate), "yyyy-MM-dd"),
        status: r.status,
        eventTitle: r.event.title,
        eventId: r.event.id,
        isClosed: r.event.isClosed,
        markedAt: r.markedAt,
      })),
      total,
      limit,
      offset,
      monthlySummary,
    });
  } catch (error) {
    console.error("Student attendance history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}