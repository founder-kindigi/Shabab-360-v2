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
 * Format a date for display in PKT with full fallback safety.
 */
export function formatPKT(date?: Date | string | number | null, pattern: string = "dd MMM yyyy"): string {
  if (!date) return "—";
  let d: Date;
  if (typeof date === "string" || typeof date === "number") {
    // If DD/MM/YYYY format string
    if (typeof date === "string" && date.includes("/")) {
      const parts = date.split(" ");
      const dateParts = parts[0].split("/");
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        const time = parts[1] || "00:00:00";
        d = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}`);
      } else {
        d = new Date(date);
      }
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return "—";

  try {
    const zoned = toZonedTime(d, PKT);
    return format(zoned, pattern, { timeZone: PKT });
  } catch {
    return "—";
  }
}