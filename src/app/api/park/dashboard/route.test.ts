import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  db: {
    group: { findUnique: vi.fn(), findMany: vi.fn() },
    batch: { findMany: vi.fn() },
    park: { findUnique: vi.fn(), findFirst: vi.fn() },
    attendanceEvent: { findMany: vi.fn(), groupBy: vi.fn() },
    participant: { groupBy: vi.fn(), findMany: vi.fn() },
    staffMeta: { findMany: vi.fn() },
    attendanceRecord: { findMany: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { GET } from "./route";

const BATCH = { id: "b-1", name: "Batch 4", startDate: new Date("2026-05-23T00:00:00.000Z"), endDate: new Date("2027-01-31T00:00:00.000Z") };

describe("GET /api/park/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("denies unauthorized roles", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "viewer", assignedCityId: "city-1" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("denies a City Head without city assignment before selecting a park", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "city-head", role: "city_head" } });
    mocks.requireCapability.mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
    expect(mocks.db.park.findFirst).not.toHaveBeenCalled();
  });

  it.each(["park_lead", "city_head"])("%s gets own-scope events with 0 marks in needsAttention", async (role) => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "pl-1", role, ...(role === "city_head" ? { assignedCityId: "city-1" } : { assignedParkId: "park-1" }) },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.park.findFirst.mockResolvedValue({ id: "park-1", cityId: "city-1" });

    mocks.db.batch.findMany.mockResolvedValue([BATCH]);
    mocks.db.group.findMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batchId: "b-1" }]);
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "State Life Park", city: { name: "Lahore" } });

    const mockDate = new Date();
    mocks.db.attendanceEvent.findMany.mockImplementation(async (query?: any) => {
      // If query is for unclosed yesterday events, return empty
      if (query?.where?.eventDate?.lt) return [];
      return [
        {
          id: "e-1",
          title: "Session 1",
          groupId: "g-1",
          eventDate: mockDate,
          isClosed: false,
          closedBy: null,
          closedAt: null,
          group: { name: "Group 1" },
          _count: { records: 0 },
          records: [],
        },
      ];
    });
    mocks.db.attendanceEvent.groupBy.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 20 }]);
    mocks.db.participant.findMany.mockResolvedValue([]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    if (role === "city_head") expect(mocks.db.park.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { cityId: "city-1", isActive: true } }));
    const lowAtt = data.needsAttention.find((item: any) => item.type === "low_attendance");
    expect(lowAtt).toBeDefined();
    expect(lowAtt.groupName).toBe("Group 1");
    expect(lowAtt.rate).toBe(0);
  });

  it("stays safe and excludes an unassigned participant returned by the ORM", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "pl-1", role: "park_lead", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.batch.findMany.mockResolvedValue([BATCH]);
    mocks.db.group.findMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batchId: "b-1" }]);
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "State Life Park", city: { name: "Lahore" } });
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.attendanceEvent.groupBy.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 20 }]);
    mocks.db.participant.findMany.mockResolvedValue([
      { id: "p-assigned", groupId: "g-1" },
      { id: "p-unassigned", groupId: null },
    ]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.db.participant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ groupId: { in: ["g-1"] } }) })
    );
    expect(data.warningsCount).toBe(0);
    expect(data.recentSummary.totalParticipants).toBe(20);
  });

  it("a Park Lead gets only the assigned park, its real batch and no park fallback", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "pl-1", role: "park_lead", assignedParkId: "park-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.batch.findMany.mockResolvedValue([BATCH]);
    mocks.db.group.findMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batchId: "b-1" }]);
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "State Life Park", city: { name: "Lahore" } });
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 7 }]);
    mocks.db.participant.findMany.mockResolvedValue([]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);

    const data = await (await GET()).json();

    expect(mocks.db.park.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.park.findUnique).toHaveBeenCalledWith({ where: { id: "park-1" }, include: { city: true } });
    expect(data.park).toEqual({ id: "park-1", name: "State Life Park", cityName: "Lahore" });
    expect(data.batch).toEqual({ id: "b-1", name: "Batch 4", startDate: "2026-05-23", endDate: "2027-01-31" });
    expect(data.recentSummary.totalParticipants).toBe(7);
    expect(typeof data.todayDate).toBe("string");
  });

  it("finds the Park Lead's batch through groups when the legacy direct batch link is absent", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "pl-1", role: "park_lead", assignedParkId: "park-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.batch.findMany.mockResolvedValue([]);
    mocks.db.group.findMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batchId: "b-1", batch: BATCH }]);
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "State Life Park", city: { name: "Lahore" } });
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 7 }]);
    mocks.db.participant.findMany.mockResolvedValue([]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);

    const data = await (await GET()).json();

    expect(data.batch).toEqual({ id: "b-1", name: "Batch 4", startDate: "2026-05-23", endDate: "2027-01-31" });
  });

  it("an assigned Murabbi gets exactly its own park, group and batch", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "m-1", role: "murabbi", assignedParkId: "park-1", assignedGroupId: "g-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.group.findUnique.mockResolvedValue({
      id: "g-1",
      parkId: "park-1",
      park: { id: "park-1", cityId: "city-1" },
      batch: { ...BATCH, cityId: "city-1", park: { cityId: "city-1" } },
    });
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "Gulberg Park", city: { name: "Lahore" } });
    mocks.db.park.findFirst.mockResolvedValue({ id: "other-park", cityId: "city-1" });
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 9 }]);
    mocks.db.participant.findMany.mockResolvedValue([]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);

    const data = await (await GET()).json();

    expect(mocks.db.park.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.park.findUnique).toHaveBeenCalledWith({ where: { id: "park-1" }, include: { city: true } });
    expect(data.park).toEqual({ id: "park-1", name: "Gulberg Park", cityName: "Lahore" });
    expect(data.batch).toEqual({ id: "b-1", name: "Batch 4", startDate: "2026-05-23", endDate: "2027-01-31" });
    expect(data.recentSummary.totalParticipants).toBe(9);
    expect(data.recentSummary.activeGroups).toBe(1);
    expect(mocks.db.group.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["g-1"] }, isActive: true } }));
  });

  it("reports a date-accurate today attendance percentage, not the weekly rate", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "pl-1", role: "park_lead", assignedParkId: "park-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.batch.findMany.mockResolvedValue([BATCH]);
    mocks.db.group.findMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batchId: "b-1" }]);
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "State Life Park", city: { name: "Lahore" } });
    mocks.db.attendanceEvent.findMany.mockImplementation(async (query?: any) => {
      if (query?.where?.eventDate?.lt) return [];
      // Every closed-session read stays empty, so a seven-day value cannot be
      // mistaken for today's.
      if (query?.where?.isClosed === true) return [];
      return [{
        id: "e-1", title: "Today", groupId: "g-1", eventDate: new Date(), isClosed: false,
        closedBy: null, closedAt: null, group: { name: "Group 1" },
        _count: { records: 4 },
        records: [{ status: "present" }, { status: "present" }, { status: "late" }, { status: "absent" }],
      }];
    });
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 10 }]);
    mocks.db.participant.findMany.mockResolvedValue([]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);

    const data = await (await GET()).json();

    expect(data.recentSummary.last7DaysAttendanceRate).toBe(0);
    expect(data.todayAttendance).toEqual({
      present: 2, late: 1, absent: 1, excused: 0,
      marked: 4, eligible: 10, total: 4, rate: 40,
    });
  });

  it("keeps today's group rate at zero but returns the latest recorded group session for park cards", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "pl-1", role: "park_lead", assignedParkId: "park-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.batch.findMany.mockResolvedValue([BATCH]);
    mocks.db.group.findMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batchId: "b-1" }]);
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "State Life Park", city: { name: "Lahore" } });
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 10 }]);
    mocks.db.participant.findMany.mockResolvedValue([]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);
    mocks.db.attendanceEvent.findMany.mockImplementation(async (query?: any) => {
      if (query?.where?.records?.some) {
        return [{
          id: "historic-session", groupId: "g-1", eventDate: new Date("2026-09-13T05:00:00.000Z"),
          records: [
            { status: "present" }, { status: "present" }, { status: "present" }, { status: "present" },
            { status: "present" }, { status: "present" }, { status: "present" }, { status: "absent" },
          ],
        }];
      }
      return [];
    });

    const data = await (await GET()).json();

    expect(data.groupBreakdown).toEqual([expect.objectContaining({
      id: "g-1",
      todayProgress: 0,
      latestSessionDate: "2026-09-13",
      latestMarkedCount: 8,
      latestProgress: 80,
    })]);
  });

  it("an unassigned Murabbi gets a scoped empty result for its park, never a group", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "m-2", role: "murabbi", assignedParkId: "park-1", assignedGroupId: null } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "Gulberg Park", city: { name: "Lahore" } });
    mocks.db.group.findMany.mockResolvedValue([]);
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([]);
    mocks.db.participant.findMany.mockResolvedValue([]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.db.group.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.group.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [] }, isActive: true } }));
    expect(data.park).toEqual({ id: "park-1", name: "Gulberg Park", cityName: "Lahore" });
    expect(data.batch).toBeNull();
    expect(data.groupBreakdown).toEqual([]);
    expect(data.events).toEqual([]);
    expect(data.todayAttendance).toEqual({ present: 0, late: 0, absent: 0, excused: 0, marked: 0, eligible: 0, total: 0, rate: 0 });
    expect(data.recentSummary.totalParticipants).toBe(0);
    expect(data.recentSummary.activeGroups).toBe(0);
  });

  it("denies a Muawin the operational dashboard before any park read", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "mu-1", role: "muawin", assignedParkId: "park-1" } });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.db.park.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.park.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.group.findMany).not.toHaveBeenCalled();
  });
});
