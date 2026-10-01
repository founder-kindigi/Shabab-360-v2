import { describe, expect, it } from "vitest";
import { dateOnlyWeekday, isBatchClassDate, parseClassWeekdays } from "./schedule";

describe("attendance schedule", () => {
  const startDate = new Date("2026-08-01T00:00:00.000Z");
  const endDate = new Date("2026-08-31T00:00:00.000Z");

  it("defaults to Saturday and Sunday", () => {
    expect(parseClassWeekdays(null)).toEqual([0, 6]);
    expect(dateOnlyWeekday("2026-08-01")).toBe(6);
    expect(dateOnlyWeekday("2026-08-02")).toBe(0);
  });

  it("accepts configured weekdays within batch dates", () => {
    expect(isBatchClassDate({ date: "2026-08-03", startDate, endDate, classWeekdays: "[1]", extraClassDates: [] })).toBe(true);
    expect(isBatchClassDate({ date: "2026-08-04", startDate, endDate, classWeekdays: "[1]", extraClassDates: [] })).toBe(false);
  });

  it("accepts exceptional class dates", () => {
    expect(isBatchClassDate({
      date: "2026-08-05",
      startDate,
      endDate,
      classWeekdays: "[0,6]",
      extraClassDates: [new Date("2026-08-04T19:00:00.000Z")],
    })).toBe(true);
  });

  it("rejects dates outside the batch window", () => {
    expect(isBatchClassDate({ date: "2026-09-05", startDate, endDate, classWeekdays: "[6]", extraClassDates: [] })).toBe(false);
  });
});
