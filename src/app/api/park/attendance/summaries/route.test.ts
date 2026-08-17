import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  staffFindUnique: vi.fn(),
  parkFindUnique: vi.fn(),
  groupFindMany: vi.fn(),
  eventFindMany: vi.fn(),
  recordFindMany: vi.fn(),
  staffRecordFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {
  staffMeta: { findUnique: mocks.staffFindUnique },
  park: { findUnique: mocks.parkFindUnique },
  group: { findMany: mocks.groupFindMany },
  attendanceEvent: { findMany: mocks.eventFindMany },
  attendanceRecord: { findMany: mocks.recordFindMany },
  staffAttendanceRecord: { findMany: mocks.staffRecordFindMany },
} }));

import { GET } from "./route";

const parkId = "ckggggggggggggggggggggggg";
const request = (query = "") => new Request(`http://localhost/api/park/attendance/summaries${query}`);

describe("attendance operational summaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: { id: "user-1", role: "park_lead", assignedParkId: parkId } });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.staffFindUnique.mockResolvedValue({ assignedParkId: parkId, assignedGroupId: null, assignedGroup: null });
    mocks.parkFindUnique.mockResolvedValue({ id: parkId, name: "Gulberg", cityId: "city-1" });
    mocks.groupFindMany.mockResolvedValue([]);
    mocks.eventFindMany.mockResolvedValue([]);
    mocks.recordFindMany.mockResolvedValue([]);
    mocks.staffRecordFindMany.mockResolvedValue([]);
  });

  it("denies before data reads when attendance capability is missing", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await GET(request())).status).toBe(403);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a date range longer than one year", async () => {
    expect((await GET(request("?from=2025-01-01&to=2026-08-01"))).status).toBe(400);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
  });

  it("fails closed for a foreign park scope", async () => {
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await GET(request())).status).toBe(403);
    expect(mocks.groupFindMany).not.toHaveBeenCalled();
  });

  it("returns student, group, and Murabbi summaries without contact PII", async () => {
    mocks.groupFindMany.mockResolvedValue([{
      id: "group-1",
      name: "Group 1",
      batch: { name: "Batch 4", settings: { warningConsecutiveWeeks: 2, dropoutConsecutiveWeeks: 3 } },
      murabbis: [{ id: "staff-1", user: { name: "Murabbi One" } }],
      participants: [{ id: "student-1", name: "Student One", state: "active", dropoutAt: null, dropoutSource: null }],
    }]);
    mocks.eventFindMany.mockResolvedValue([
      { id: "event-1", groupId: "group-1", eventDate: new Date("2026-08-01") },
      { id: "event-2", groupId: "group-1", eventDate: new Date("2026-08-02") },
    ]);
    mocks.recordFindMany.mockResolvedValue([
      { eventId: "event-1", participantId: "student-1", status: "present" },
      { eventId: "event-2", participantId: "student-1", status: "late" },
    ]);
    mocks.staffRecordFindMany.mockResolvedValue([{ staffMetaId: "staff-1", status: "present" }]);
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.overview).toMatchObject({ groups: 1, students: 1, attendanceRate: 100 });
    expect(body.groupStats[0]).toMatchObject({ groupName: "Group 1", attendanceRate: 100 });
    expect(body.murabbis[0]).toMatchObject({ name: "Murabbi One", staffAttendanceRate: 100 });
    expect(body.students[0]).toMatchObject({ name: "Student One", attendanceRate: 100 });
    expect(JSON.stringify(body)).not.toContain("phone");
    expect(mocks.staffFindUnique).not.toHaveBeenCalled();
    expect(mocks.recordFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { event: expect.objectContaining({ groupId: { in: ["group-1"] }, isClosed: true }) },
    }));
  });
});
