import { describe, expect, it } from "vitest";
import { isScheduledAttendanceSession } from "./scheduled-sessions";

const schedule = {
  startDate: new Date("2026-08-01T00:00:00.000Z"),
  endDate: new Date("2026-08-31T23:59:59.000Z"),
  settings: { offWeekdays: [], offDates: [] },
};

describe("isScheduledAttendanceSession", () => {
  it("allows Saturdays and Sundays inside the batch period", () => {
    expect(isScheduledAttendanceSession(new Date("2026-08-01T08:00:00.000Z"), schedule)).toBe(true);
    expect(isScheduledAttendanceSession(new Date("2026-08-02T08:00:00.000Z"), schedule)).toBe(true);
  });

  it("rejects weekdays and dates outside the batch period", () => {
    expect(isScheduledAttendanceSession(new Date("2026-08-03T08:00:00.000Z"), schedule)).toBe(false);
    expect(isScheduledAttendanceSession(new Date("2026-09-05T08:00:00.000Z"), schedule)).toBe(false);
  });

  it("honours shared configured off dates and weekdays", () => {
    expect(isScheduledAttendanceSession(new Date("2026-08-01T08:00:00.000Z"), {
      ...schedule,
      settings: { offWeekdays: [], offDates: [{ offDate: new Date("2026-08-01T00:00:00.000Z") }] },
    })).toBe(false);
    expect(isScheduledAttendanceSession(new Date("2026-08-02T08:00:00.000Z"), {
      ...schedule,
      settings: { offWeekdays: [{ weekday: 0 }], offDates: [] },
    })).toBe(false);
  });
});
