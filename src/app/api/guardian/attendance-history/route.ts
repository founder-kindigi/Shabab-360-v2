import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayPKT, endOfTodayPKT, fromPKT, formatPKT } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "guardian") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const participantId = searchParams.get("participantId");
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const limitParam = searchParams.get("limit");

  if (!participantId) {
    return NextResponse.json(
      { error: "participantId is required" },
      { status: 400 }
    );
  }

  const limit = Math.min(Math.max(parseInt(limitParam || "30", 10) || 30, 1), 100);

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