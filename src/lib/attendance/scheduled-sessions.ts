import { formatPKT, toPKT } from "@/lib/timezone";
import { isConfiguredBatchOffDay, type BatchScheduleSettings } from "@/lib/schedule/batch-off-days";

export interface AttendanceSchedule {
  startDate: Date;
  endDate: Date | null;
  settings?: BatchScheduleSettings | null;
}

/**
 * Regular classes run on Saturday and Sunday. Batch dates and the shared off-day
 * policy are the source of truth, so operational modules cannot drift apart.
 */
export function isScheduledAttendanceSession(
  date: Date,
  schedule: AttendanceSchedule,
): boolean {
  const dateKey = formatPKT(date, "yyyy-MM-dd");
  const startKey = formatPKT(schedule.startDate, "yyyy-MM-dd");
  const endKey = schedule.endDate ? formatPKT(schedule.endDate, "yyyy-MM-dd") : null;
  const weekday = toPKT(date).getDay();

  if (dateKey < startKey || (endKey && dateKey > endKey)) return false;
  if (weekday !== 0 && weekday !== 6) return false;
  return !isConfiguredBatchOffDay(schedule.settings, date);
}
