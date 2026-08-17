import { db } from "@/lib/db";

export async function listAttendanceSessions({
  date,
  eventDate,
  groupIds,
  parkId,
  status,
}: {
  date: string;
  eventDate: Date;
  groupIds: string[];
  parkId: string;
  status?: "open" | "closed";
}) {
  const nextDate = new Date(eventDate.getTime() + 86_400_000);
  const [events, participantCounts] = await Promise.all([
    db.attendanceEvent.findMany({
      where: {
        groupId: { in: groupIds },
        eventDate: { gte: eventDate, lt: nextDate },
        ...(status === "open" ? { isClosed: false } : {}),
        ...(status === "closed" ? { isClosed: true } : {}),
      },
      include: {
        group: { select: { name: true } },
        records: { select: { status: true } },
      },
      orderBy: { eventDate: "desc" },
    }),
    db.participant.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds }, state: "active" },
      _count: true,
    }),
  ]);

  const closedByIds = [...new Set(events.flatMap((event) => event.closedBy ? [event.closedBy] : []))];
  const closedByStaff = closedByIds.length
    ? await db.staffMeta.findMany({
        where: { id: { in: closedByIds } },
        select: { id: true, user: { select: { name: true } } },
      })
    : [];
  const participantCountByGroup = new Map(participantCounts.map((item) => [item.groupId, item._count]));
  const closedByName = new Map(closedByStaff.map((staff) => [staff.id, staff.user.name]));

  return {
    date,
    parkId,
    events: events.map((event) => {
      const participantCount = participantCountByGroup.get(event.groupId) ?? 0;
      const statusCounts = event.records.reduce<Record<string, number>>((counts, record) => {
        counts[record.status] = (counts[record.status] ?? 0) + 1;
        return counts;
      }, {});
      const markedCount = event.records.length;

      return {
        id: event.id,
        title: event.title,
        groupId: event.groupId,
        groupName: event.group.name,
        eventDate: event.eventDate.toISOString(),
        isClosed: event.isClosed,
        participantCount,
        markedCount,
        presentCount: statusCounts.present ?? 0,
        absentCount: statusCounts.absent ?? 0,
        lateCount: statusCounts.late ?? 0,
        excusedCount: statusCounts.excused ?? 0,
        progress: participantCount ? Math.round((markedCount / participantCount) * 100) : 0,
        closedAt: event.closedAt?.toISOString() ?? null,
        closedByName: event.closedBy ? closedByName.get(event.closedBy) ?? null : null,
      };
    }),
  };
}
