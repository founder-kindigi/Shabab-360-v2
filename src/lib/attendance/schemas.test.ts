import { describe, expect, it } from "vitest";
import {
  attendanceIdentifierSchema,
  prepareAttendanceSessionsSchema,
  prepareStaffAttendanceSchema,
} from "./schemas";

describe("attendance identifier validation", () => {
  const uuid = "be979d3b-1da9-43fb-81fa-2a2f4f6c82dd";
  const cuid = "ckpark0000000000000000000";

  it.each([uuid, cuid])("accepts supported identifier %s", (identifier) => {
    expect(attendanceIdentifierSchema.safeParse(identifier).success).toBe(true);
    expect(prepareAttendanceSessionsSchema.safeParse({ date: "2026-08-17", parkId: identifier }).success).toBe(true);
    expect(prepareStaffAttendanceSchema.safeParse({ date: "2026-08-17", parkId: identifier }).success).toBe(true);
  });

  it.each(["not-an-id", "x".repeat(129)])("rejects unsupported identifier %s", (identifier) => {
    expect(attendanceIdentifierSchema.safeParse(identifier).success).toBe(false);
  });
});
