import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime, format } from "date-fns-tz";

export const PKT = "Asia/Karachi";

/**
 * Convert a UTC date to PKT timezone.
 */
export function toPKT(date: Date): Date {
  return toZonedTime(date, PKT);
}

/**
 * Re-export toZonedTime for direct use.
 */
export { toZonedTime };

/**
 * Convert a PKT date to UTC.
 */
export function fromPKT(date: Date): Date {
  return fromZonedTime(date, PKT);
}

/**
 * Get the start of today in PKT.
 */
export function todayPKT(): Date {
  const now = new Date();
  const zoned = toZonedTime(now, PKT);
  const start = startOfDay(zoned);
  return fromZonedTime(start, PKT);
}

/**
 * Get the end of today in PKT.
 */
export function endOfTodayPKT(): Date {
  const now = new Date();
  const zoned = toZonedTime(now, PKT);
  const end = endOfDay(zoned);
  return fromZonedTime(end, PKT);
}

/**
 * Format a date for display in PKT.
 */
export function formatPKT(date: Date, pattern: string = "dd MMM yyyy"): string {
  const zoned = toZonedTime(date, PKT);
  return format(zoned, pattern, { timeZone: PKT });
}