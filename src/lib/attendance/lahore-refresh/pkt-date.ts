import { parseISO } from "date-fns";
import { fromPKT } from "../../timezone";
import { REFRESH_DATE_PATTERN } from "./constants";

/**
 * The single persisted-instant conversion for every workbook-derived date.
 *
 * It returns exactly the instant the attendance API uses for a session day:
 * `fromPKT(parseISO("YYYY-MM-DD"))` (see `attendanceDateStart` in
 * `src/lib/attendance/schedule.ts`). UTC midnight would be five hours offset and
 * would make an imported session look like a different event than a freshly
 * prepared one.
 */
export function pktDayStart(date: string): Date {
  if (!REFRESH_DATE_PATTERN.test(date)) {
    throw new Error("Workbook date must use YYYY-MM-DD");
  }
  return fromPKT(parseISO(date));
}

/** Epoch milliseconds for a workbook date, as Prisma stores SQLite DateTime. */
export function pktDayStartEpoch(date: string): number {
  return pktDayStart(date).getTime();
}

/** Last millisecond of the Pakistan-time day, for "not after this date" checks. */
export function pktDayEndEpoch(date: string): number {
  return pktDayStart(date).getTime() + 86_400_000 - 1;
}
