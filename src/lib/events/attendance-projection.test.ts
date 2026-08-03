import { describe, expect, it } from "vitest";
import { buildEventAttendanceProjection } from "./attendance-projection";

describe("buildEventAttendanceProjection", () => {
  it("projects each registered student to their own group session", () => {
    const result = buildEventAttendanceProjection([
      { participantId: "p-1", groupId: "g-1", status: "present" },
      { participantId: "p-2", groupId: "g-2", status: "late" },
    ], [{ id: "a-1", groupId: "g-1" }, { id: "a-2", groupId: "g-2" }]);
    expect(result).toEqual({ projections: [
      { participantId: "p-1", attendanceEventId: "a-1", status: "present" },
      { participantId: "p-2", attendanceEventId: "a-2", status: "late" },
    ], issues: [] });
  });

  it("refuses duplicate, unassigned, and unmatched-session projections", () => {
    const result = buildEventAttendanceProjection([
      { participantId: "p-1", groupId: "g-1", status: "present" },
      { participantId: "p-1", groupId: "g-1", status: "present" },
      { participantId: "p-2", groupId: null, status: "present" },
      { participantId: "p-3", groupId: "g-3", status: "present" },
    ], [{ id: "a-1", groupId: "g-1" }]);
    expect(result.projections).toHaveLength(1);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "duplicate_registration", "unassigned_participant", "missing_regular_session",
    ]);
  });
});
