import { formatPKT } from "@/lib/timezone";
type Participant = { id: string; groupId: string; state: string; joinedAt: Date; dropoutAt: Date | null };
type Event = { id: string; groupId: string; eventDate: Date };
type Record = { eventId: string; participantId: string; status: string };
export function eligibleForSession(participant: Omit<Participant, "id" | "groupId">, date: Date) {
  const day = formatPKT(date, "yyyy-MM-dd");
  if (participant.state === "inactive" || formatPKT(participant.joinedAt, "yyyy-MM-dd") > day) return false;
  return participant.state !== "dropout" || Boolean(participant.dropoutAt && formatPKT(participant.dropoutAt, "yyyy-MM-dd") > day);
}
export function attendanceOpportunities(participants: Participant[], events: Event[], records: Record[]) {
  const marks = new Map(records.map(r => [`${r.eventId}:${r.participantId}`, r.status]));
  const totals = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0, total: 0 };
  for (const event of events) for (const p of participants) {
    if (p.groupId !== event.groupId || !eligibleForSession(p, event.eventDate)) continue;
    totals.total++;
    const status = marks.get(`${event.id}:${p.id}`);
    if (status === "present" || status === "absent" || status === "late" || status === "excused") totals[status]++;
    else totals.unmarked++;
  }
  return { ...totals, attended: totals.present + totals.late, rate: totals.total ? Math.round((totals.present + totals.late) / totals.total * 1000) / 10 : null };
}
