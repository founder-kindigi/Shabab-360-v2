import { formatPKT, fromPKT } from "@/lib/timezone";
import { parseISO } from "date-fns";

export const DEFAULT_CLASS_WEEKDAYS = [0, 6] as const;

export function attendanceDateStart(date: string): Date {
  return fromPKT(parseISO(date));
}

export function dateOnlyWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function parseClassWeekdays(value?: string | null): number[] {
  if (!value) return [...DEFAULT_CLASS_WEEKDAYS];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [...DEFAULT_CLASS_WEEKDAYS];
    const days = parsed.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6);
    return days.length ? [...new Set(days)].sort() : [...DEFAULT_CLASS_WEEKDAYS];
  } catch {
    return [...DEFAULT_CLASS_WEEKDAYS];
  }
}

export function isBatchClassDate(input: {
  date: string;
  startDate: Date;
  endDate: Date | null;
  classWeekdays?: string | null;
  extraClassDates: Date[];
}): boolean {
  const { date, startDate, endDate, classWeekdays, extraClassDates } = input;
  const start = formatPKT(startDate, "yyyy-MM-dd");
  const end = endDate ? formatPKT(endDate, "yyyy-MM-dd") : null;
  if (date < start || (end && date > end)) return false;
  if (extraClassDates.some((item) => formatPKT(item, "yyyy-MM-dd") === date)) return true;
  return parseClassWeekdays(classWeekdays).includes(dateOnlyWeekday(date));
}
