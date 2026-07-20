import { NextRequest, NextResponse } from "next/server";
import { requireCapability, requireRole } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, fromPKT, formatPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import {
  MAX_IDENTIFIER_LENGTH,
  optionalDateOnly,
  optionalInteger,
  queryParamsToObject,
  queryValidationError,
} from "@/lib/api/query-params";
import { z } from "zod";

const historyQuerySchema = z
  .object({
    participantId: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH),
    from: optionalDateOnly(),
    to: optionalDateOnly(),
    limit: optionalInteger(1, 100).default(30),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    path: ["to"],
    message: "to must be on or after from",
  });

export async function GET(request: NextRequest) {
  const roleError = await requireRole(["guardian"]);
  if (roleError) return roleError;

  const auth = await requireCapability("reports.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const parsedQuery = historyQuerySchema.safeParse(queryParamsToObject(searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(queryValidationError(parsedQuery.error), { status: 400 });
  }
  const { participantId, from: fromStr, to: toStr, limit } = parsedQuery.data;

  try {
    // Verify the participant belongs to this guardian
    const guardian = await db.guardian.findFirst({
      where: { userId: user.id },
    });

    if (!guardian) {
      return NextResponse.json({ error: "Guardian not found" }, { status: 403 });
    }

    const link = await db.guardianChild.findFirst({
      where: {
        guardianId: guardian.id,
        participantId,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Participant not linked to this guardian" },
        { status: 403 }
      );
    }

    // Fire audit log (fire-and-forget)
    logAudit({
      userId: user.id,
      action: "view",
      entityType: "guardian_attendance_history",
      entityId: participantId,
    });

    // Parse date ranges in PKT
    let dateFrom: Date;
    let dateTo: Date;

    if (fromStr) {
      dateFrom = fromPKT(new Date(fromStr));
    } else {
      dateFrom = new Date(todayPKT().getTime() - 29 * 24 * 60 * 60 * 1000);
    }

    if (toStr) {
      dateTo = fromPKT(new Date(toStr));
      // Set to end of day
      dateTo.setHours(23, 59, 59, 999);
    } else {
      dateTo = endOfTodayPKT();
    }

    // Fetch attendance records with event details
    const records = await db.attendanceRecord.findMany({
      where: {
        participantId,
        event: {
          eventDate: { gte: dateFrom, lte: dateTo },
        },
      },
      include: {
        event: {
          include: {
            group: {
              include: {
                batch: {
                  include: {
                    park: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { event: { eventDate: "desc" } },
      take: limit,
    });

    const totalRecords = await db.attendanceRecord.count({
      where: {
        participantId,
        event: {
          eventDate: { gte: dateFrom, lte: dateTo },
        },
      },
    });

    const formatted = records.map((r) => ({
      id: r.id,
      date: formatPKT(new Date(r.event.eventDate), "dd MMM yyyy"),
      title: r.event.title,
      groupName: r.event.group.name,
      parkName: r.event.group.batch?.park?.name || null,
      status: r.status,
      markedAt: r.markedAt,
    }));

    return NextResponse.json({
      participantId,
      from: formatPKT(dateFrom, "yyyy-MM-dd"),
      to: formatPKT(dateTo, "yyyy-MM-dd"),
      total: totalRecords,
      limit,
      records: formatted,
    });
  } catch (error) {
    console.error("Guardian attendance history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
