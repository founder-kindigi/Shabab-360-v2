import { formatPKT, toPKT } from "@/lib/timezone";

export interface BatchScheduleSettings {
  offWeekdays?: { weekday: number }[];
  offDates?: { offDate: Date }[];
}

/**
 * Returns whether a date is a configured batch off-day in Pakistan time.
 * This is shared by operational modules; no module keeps its own off-day list.
 */
export function isConfiguredBatchOffDay(
  settings: BatchScheduleSettings | null | undefined,
  date: Date,
): boolean {
  if (!settings) return false;

  const pakistanDate = toPKT(date);
  if (settings.offWeekdays?.some(({ weekday }) => weekday === pakistanDate.getDay())) return true;

  const dateKey = formatPKT(pakistanDate, "yyyy-MM-dd");
  return settings.offDates?.some(({ offDate }) => formatPKT(toPKT(offDate), "yyyy-MM-dd") === dateKey) ?? false;
}
