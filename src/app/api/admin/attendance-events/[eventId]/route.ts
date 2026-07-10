import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type SessionUser = {
  id?: string;
  role?: string;
  assignedCityId?: string | null;
  assignedParkId?: string | null;
  assignedGroupId?: string | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const event = await db.attendanceEvent.findUnique({
      where: { id: eventId },
      include: {
        group: {
          include: {
            batch: { include: { park: { include: { city: true } } } },
          },
        },
        closer: { include: { user: { select: { name: true } } } },
        records: {
          include: {
            participant: true,
            marker: { include: { user: { select: { name: true } } } },
          },
          orderBy: { participant: { name: "asc" } },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const statusCounts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of event.records) {
      if (r.status in statusCounts) {
        (statusCounts as Record<string, number>)[r.status]++;
      }
    }

    const participantCount = await db.participant.count({
      where: { groupId: event.groupId, state: "active" },
    });

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        groupName: event.group.name,
        batchName: event.group.batch.name,
        parkName: event.group.batch.park.name,
        cityName: event.group.batch.park.city?.name || "Unknown",
        eventDate: event.eventDate.toISOString(),
        isClosed: event.isClosed,
        participantCount,
        markedCount: event.records.length,
        closedAt: event.closedAt?.toISOString() || null,
        closedByName: event.closer?.user.name || null,
        ...statusCounts,
      },
      records: event.records.map((r) => ({
        id: r.id,
        participantName: r.participant.name,
        status: r.status,
        markedAt: r.markedAt.toISOString(),
        markedByName: r.marker?.user.name || null,
      })),
    });
  } catch (error) {
    console.error("Admin event detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}