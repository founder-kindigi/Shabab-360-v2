import { NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { formatPKT, toPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import {
  MAX_LIST_OFFSET,
  optionalDateOnly,
  optionalInteger,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { subDays } from "date-fns";
import { z } from "zod";

const historyQuerySchema = z
  .object({
    from: optionalDateOnly(),
    to: optionalDateOnly(),
    limit: optionalInteger(1, 100).default(30),
    offset: optionalInteger(0, MAX_LIST_OFFSET).default(0),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    path: ["to"],
    message: "to must be on or after from",
  });

export async function GET(request: Request) {
  const roleError = await requireRole(["student"]);
  if (roleError) return roleError;

  const auth = await requireCapability("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const parsedQuery = historyQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const { from: fromParam, to: toParam, limit, offset } = parsedQuery.data;

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
    const from = fromParam ? new Date(fromParam) : defaultFrom;
    const to = toParam ? new Date(toParam) : new Date();

    // Fetch records with pagination
    const whereClause = {
      participantId: participant.id,
      event: {
        ...(participant.groupId ? { groupId: participant.groupId } : {}),
        eventDate: { gte: from, lte: to },
      },
    };

    const [records, total] = await Promise.all([
      db.attendanceRecord.findMany({
        where: whereClause,
        select: {
          id: true,
          status: true,
          markedAt: true,
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
      select: {
        status: true,
        event: { select: { eventDate: true } },
      },
    });

    // Monthly summary
    const monthMap = new Map<
      string,
      { month: string; present: number; absent: number; late: number; excused: number; total: number }
    >();

    for (const r of allRecordsInRange) {
      if (!r.event) continue;
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
      records: records
        .filter((r): r is typeof r & { event: { id: string; title: string; eventDate: Date; isClosed: boolean } } => Boolean(r.event))
        .map((r) => ({
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
