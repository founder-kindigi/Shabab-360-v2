import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { toPKT, formatPKT } from "@/lib/timezone";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "guardian") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get("weekOffset") || "0", 10);

    // Find guardian
    const guardian = await db.guardian.findFirst({
      where: { userId: user.id },
    });

    if (!guardian) {
      return NextResponse.json({ children: [], weekStart: "", weekEnd: "", weekLabel: "" });
    }

    // Get guardian's children with group info
    const guardianChildren = await db.guardianChild.findMany({
      where: { guardianId: guardian.id },
      include: {
        participant: {
          include: {
            group: {
              include: {
                batch: {
                  include: {
                    park: { include: { city: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // ── Week calculation (Mon-Sun in PKT) ──
    const nowPKT = toPKT(new Date());
    const dayOfWeek = nowPKT.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const weekMonday = new Date(nowPKT);
    weekMonday.setDate(nowPKT.getDate() + mondayOffset + weekOffset * 7);
    weekMonday.setHours(0, 0, 0, 0);

    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);
    weekSunday.setHours(23, 59, 59, 999);

    // Collect group IDs
    const groupIds = [...new Set(guardianChildren.map((gc) => gc.participant.groupId))];

    // Get events for all groups in the week
    const weekEvents = await db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: weekMonday, lte: weekSunday },
      },
      include: {
        _count: { select: { records: true } },
      },
      orderBy: { eventDate: "asc" },
    });

    // Map events by groupId
    const eventsByGroup = new Map<string, typeof weekEvents>();
    for (const ev of weekEvents) {
      const arr = eventsByGroup.get(ev.groupId) || [];
      arr.push(ev);
      eventsByGroup.set(ev.groupId, arr);
    }

    // Build children data
    const children = guardianChildren.map((gc) => {
      const p = gc.participant;
      const gid = p.groupId;
      const events = (eventsByGroup.get(gid) || []).map((e) => {
        const d = toPKT(new Date(e.eventDate));
        let dow = d.getDay();
        dow = dow === 0 ? 6 : dow - 1;
        return {
          id: e.id,
          title: e.title,
          eventDate: e.eventDate.toISOString(),
          dayOfWeek: dow,
          dateStr: formatPKT(d, "yyyy-MM-dd"),
          timeStr: formatPKT(d, "hh:mm a"),
          isClosed: e.isClosed,
          markedCount: e._count.records,
        };
      });

      return {
        participant: {
          id: p.id,
          name: p.name,
        },
        group: {
          id: p.group?.id || "",
          name: p.group?.name || "Unknown",
          batchName: p.group?.batch?.name || null,
          parkName: p.group?.batch?.park?.name || null,
        },
        events,
      };
    });

    return NextResponse.json({
      children,
      weekStart: weekMonday.toISOString(),
      weekEnd: weekSunday.toISOString(),
      weekLabel: `${formatPKT(weekMonday, "dd MMM")} – ${formatPKT(weekSunday, "dd MMM yyyy")}`,
    });
  } catch (error) {
    console.error("Guardian schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}