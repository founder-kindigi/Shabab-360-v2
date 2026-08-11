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
 * Normalise an instant to the beginning of its calendar day in Pakistan time.
 * API clients may submit either an ISO instant or a date selected in the UI.
 */
export function startOfPKTDay(date: Date): Date {
  const zoned = toZonedTime(date, PKT);
  return fromZonedTime(startOfDay(zoned), PKT);
}

/**
 * Parse a calendar-only value as a Pakistan date, not a UTC midnight instant.
 * This prevents a selected Saturday from becoming Friday/Sunday on the server.
 */
export function parseDateOnlyPKT(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = fromZonedTime(`${value}T00:00:00`, PKT);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Return the following Pakistan calendar day without relying on server timezone. */
export function nextPKTDay(date: Date): Date {
  const zoned = toZonedTime(date, PKT);
  const next = new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate() + 1);
  return fromZonedTime(next, PKT);
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
