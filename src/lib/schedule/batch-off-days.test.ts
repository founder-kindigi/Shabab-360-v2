import { describe, expect, it } from "vitest";
import { isConfiguredBatchOffDay } from "./batch-off-days";

describe("isConfiguredBatchOffDay", () => {
  it("uses configured Pakistan-time weekdays", () => {
    expect(isConfiguredBatchOffDay({ offWeekdays: [{ weekday: 1 }] }, new Date("2026-08-02T20:00:00.000Z"))).toBe(true);
  });

  it("uses normalized one-off dates regardless of timestamp", () => {
    expect(isConfiguredBatchOffDay({ offDates: [{ offDate: new Date("2026-08-14T00:00:00.000Z") }] }, new Date("2026-08-14T14:00:00.000Z"))).toBe(true);
  });

  it("does not treat an unconfigured date as an off-day", () => {
    expect(isConfiguredBatchOffDay({ offWeekdays: [], offDates: [] }, new Date("2026-08-15T10:00:00.000Z"))).toBe(false);
  });
});
