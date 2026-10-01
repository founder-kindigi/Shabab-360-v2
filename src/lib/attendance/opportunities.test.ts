import { describe, expect, it } from "vitest";
import { attendanceOpportunities } from "./opportunities";
const p = { id: "p", groupId: "g", state: "active", joinedAt: new Date("2026-01-01"), dropoutAt: null };
const events = [1, 2, 3, 4, 5].map(n => ({ id: `e${n}`, groupId: "g", eventDate: new Date(`2026-09-0${n}T10:00:00+05:00`) }));
describe("eligible attendance opportunities", () => {
  it("uses sessions times eligible participants, including unmarked opportunities", () => {
    const marks = ["present", "late", "absent", "excused"].map((status, i) => ({ eventId: `e${i + 1}`, participantId: "p", status }));
    expect(attendanceOpportunities([p], events, marks)).toEqual({ present: 1, late: 1, absent: 1, excused: 1, unmarked: 1, attended: 2, total: 5, rate: 40 });
  });
  it("two attended sessions cannot yield 200 percent", () => {
    expect(attendanceOpportunities([p], events.slice(0, 2), [1, 2].map(n => ({ eventId: `e${n}`, participantId: "p", status: "present" }))).rate).toBe(100);
  });
  it("respects join/dropout dates in PKT and ignores unrelated records", () => {
    const student = { ...p, joinedAt: new Date("2026-09-02T20:00:00Z"), state: "dropout", dropoutAt: new Date("2026-09-05T00:00:00+05:00") };
    expect(attendanceOpportunities([student], events, [{ eventId: "e1", participantId: "p", status: "present" }])).toMatchObject({ total: 2, present: 0, unmarked: 2 });
  });
  it("returns an honest empty rate and excludes inactive participants", () => {
    expect(attendanceOpportunities([{ ...p, state: "inactive" }], events, [])).toMatchObject({ total: 0, rate: null });
  });
});
