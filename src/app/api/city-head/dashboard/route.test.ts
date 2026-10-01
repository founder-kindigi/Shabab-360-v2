import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  logAudit: vi.fn(),
  db: {
    city: { findUnique: vi.fn(), findFirst: vi.fn() },
    park: { findMany: vi.fn() },
    batch: { findMany: vi.fn() },
    group: { count: vi.fn(), findMany: vi.fn() },
    participant: { count: vi.fn(), groupBy: vi.fn() },
    staffMeta: { count: vi.fn(), findMany: vi.fn() },
    attendanceEvent: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    feeEvent: { findMany: vi.fn() },
    payment: { aggregate: vi.fn() },
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

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { GET } from "./route";

describe("GET /api/city-head/dashboard", () => {
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

  it("denies non-city_head roles", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "park_lead", assignedCityId: "city-1" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("denies city_head with missing assignedCityId", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "city_head", assignedCityId: null },
    });
    mocks.requireCapability.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("No city assigned");
  });

  it("returns city dashboard data for authorized city head", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);

    mocks.db.city.findUnique.mockResolvedValue({ id: "city-lhr", name: "Lahore", code: "LHR" });
    mocks.db.park.findMany.mockResolvedValue([{ id: "park-1", name: "Iqbal Park" }]);
    mocks.db.group.count.mockResolvedValue(2);
    mocks.db.participant.count.mockResolvedValue(50);
    mocks.db.staffMeta.count.mockResolvedValue(5);
    mocks.db.group.findMany.mockResolvedValue([
      { id: "g-1", name: "Group 1", batchId: "b-1" },
      { id: "g-2", name: "Group 2", batchId: "b-1" },
    ]);
    mocks.db.batch.findMany.mockResolvedValue([{ id: "b-1", name: "Batch 4", parkId: "park-1" }]);
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([
      { groupId: "g-1", _count: 25 },
      { groupId: "g-2", _count: 25 },
    ]);
    mocks.db.staffMeta.findMany.mockResolvedValue([{ userId: "ch-1" }]);
    mocks.db.auditLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        action: "login",
        entityType: "city",
        entityId: "city-lhr",
        createdAt: new Date(),
        user: { name: "City Head", email: "ch@example.com" },
      },
    ]);
    mocks.db.feeEvent.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city.name).toBe("Lahore");
    expect(data.metrics.parkCount).toBe(1);
    expect(data.metrics.batchCount).toBe(1);
    expect(data.metrics.groupCount).toBe(2);
    expect(data.metrics.totalParticipants).toBe(50);
  });

  it("derives city staff via assignedCityId, assignedParkId in parkIds, and assignedGroupId in groupIds", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);

    mocks.db.city.findUnique.mockResolvedValue({ id: "city-lhr", name: "Lahore", code: "LHR" });
    mocks.db.park.findMany.mockResolvedValue([{ id: "park-lhr-1", name: "Iqbal Park" }]);
    mocks.db.group.count.mockResolvedValue(1);
    mocks.db.participant.count.mockResolvedValue(20);
    mocks.db.staffMeta.count.mockResolvedValue(3);
    mocks.db.group.findMany.mockResolvedValue([
      { id: "group-lhr-1", name: "Group 1", batchId: "b-1" },
    ]);
    mocks.db.batch.findMany.mockResolvedValue([{ id: "b-1", name: "Batch 4", parkId: "park-lhr-1" }]);
    mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([
      { groupId: "group-lhr-1", _count: 20 },
    ]);

    // Return Park Admin and Murabbi staff assigned within the city
    mocks.db.staffMeta.findMany.mockResolvedValue([
      { userId: "ch-1" },
      { userId: "pa-lhr-1" },
      { userId: "m-lhr-1" },
    ]);

    mocks.db.auditLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        action: "mark_attendance",
        entityType: "group",
        entityId: "group-lhr-1",
        createdAt: new Date(),
        user: { name: "Lahore Murabbi", email: "m1@example.com" },
      },
    ]);
    mocks.db.feeEvent.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);

    // Verify staffMeta.findMany was called with 3-assignment OR query constrained to city parkIds and groupIds
    expect(mocks.db.staffMeta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { assignedCityId: "city-lhr" },
            { assignedParkId: { in: ["park-lhr-1"] } },
            { assignedGroupId: { in: ["group-lhr-1"] } },
          ],
        },
      })
    );

    // Verify recent activity output contains the staff audit record
    expect(data.recentActivity).toHaveLength(1);
    expect(data.recentActivity[0].userName).toBe("Lahore Murabbi");
  });

  it("scopes city groups by the group's own park, with the batch park only as a null-park fallback", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    stubCityDashboard({ parks: [{ id: "park-a", name: "Park A" }] });

    await GET();

    // A group whose own park sits outside the city can never match this filter,
    // while a legacy group with no park still resolves through its batch park.
    const cityGroupWhere = {
      OR: [
        { parkId: { in: ["park-a"] } },
        { parkId: null, batch: { parkId: { in: ["park-a"] } } },
      ],
    };
    expect(mocks.db.group.count).toHaveBeenCalledWith({ where: { ...cityGroupWhere, isActive: true } });
    expect(mocks.db.group.findMany).toHaveBeenCalledWith({
      where: { ...cityGroupWhere, isActive: true },
      select: { id: true, name: true, batchId: true },
    });
    expect(mocks.db.participant.count).toHaveBeenCalledWith({
      where: { group: cityGroupWhere, state: "active" },
    });
  });

  it("reports truthful zeroes when the city has no parks", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    stubCityDashboard({ parks: [] });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metrics).toEqual({
      parkCount: 0,
      batchCount: 0,
      groupCount: 0,
      totalParticipants: 0,
      totalStaff: 0,
      attendanceRate7Day: 0,
      todayAttendanceRate: 0,
    });
    expect(data.todayEvents).toEqual([]);
    expect(data.parkBreakdown).toEqual([]);
    expect(data.batches).toEqual([]);
    expect(data.attendance7Day).toEqual({
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      attended: 0,
      marked: 0,
      eligible: 0,
      rate: null,
    });
    expect(data.trend14Day).toHaveLength(14);
    expect(data.trend14Day.every((day: { present: number; late: number; absent: number }) =>
      day.present === 0 && day.late === 0 && day.absent === 0
    )).toBe(true);
    expect(data.feesOverview).toEqual({ totalCollectedThisMonth: 0, totalPendingFees: 0 });
  });

  it("reports the truthful 7-day attendance aggregate from persisted marks", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    stubCityDashboard({ parks: [{ id: "park-1", name: "Iqbal Park" }] });
    mocks.db.group.findMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batchId: "b-1" }]);
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 4 }]);
    mocks.db.attendanceEvent.findMany.mockResolvedValue([closedEvent(["present", "late", "absent", "excused"])]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    // Attended is present plus late, eligible is the active-participant opportunity
    // count, and a rate is only produced when there is an eligible mark.
    expect(data.attendance7Day).toEqual({
      present: 1,
      late: 1,
      absent: 1,
      excused: 1,
      attended: 2,
      marked: 4,
      eligible: 4,
      rate: 50,
    });
  });

  it("returns the name of every active batch in the city rather than assuming one", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    stubCityDashboard({ parks: [{ id: "park-1", name: "Iqbal Park" }] });
    mocks.db.batch.findMany.mockResolvedValue([
      { id: "b-4", name: "Batch 4", parkId: "park-1" },
      { id: "b-5", name: "Batch 5", parkId: "park-1" },
    ]);

    const data = await (await GET()).json();

    expect(data.batches).toEqual([
      { id: "b-4", name: "Batch 4" },
      { id: "b-5", name: "Batch 5" },
    ]);
    expect(data.metrics.batchCount).toBe(2);
  });

  it("scopes per-park murabbi counts and attendance to that park's own groups", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ch-1", role: "city_head", assignedCityId: "city-lhr" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    stubCityDashboard({ parks: [{ id: "park-a", name: "Park A" }] });
    mocks.db.batch.findMany.mockResolvedValue([{ id: "batch-a", name: "Batch A", parkId: "park-a" }]);
    mocks.db.group.findMany.mockResolvedValue([{ id: "group-a", name: "Group A", batchId: "batch-a" }]);
    mocks.db.staffMeta.count.mockResolvedValue(7);
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "group-a", _count: 6 }]);
    mocks.db.attendanceEvent.findMany.mockResolvedValue([
      { ...closedEvent(["present", "present", "late"]), groupId: "group-a" },
    ]);

    const data = await (await GET()).json();

    // Park rows are read only from the assigned city's parks and their own groups.
    expect(mocks.db.park.findMany).toHaveBeenCalledWith({
      where: { cityId: "city-lhr", isActive: true },
      orderBy: { name: "asc" },
    });
    expect(mocks.db.group.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ parkId: "park-a" }, { parkId: null, batchId: { in: ["batch-a"] } }],
        isActive: true,
      },
      select: { id: true },
    });
    expect(mocks.db.staffMeta.count).toHaveBeenCalledWith({
      where: { assignedGroupId: { in: ["group-a"] }, isActive: true },
    });
    expect(data.parkBreakdown).toEqual([
      {
        id: "park-a",
        name: "Park A",
        participants: 0,
        groups: 1,
        sevenDayRate: 50,
        murabbiCount: 7,
        attendance: {
          present: 2,
          late: 1,
          absent: 0,
          excused: 0,
          attended: 3,
          marked: 3,
          eligible: 6,
          rate: 50,
        },
      },
    ]);
  });

  it("serves an approved Program Head cross-city dashboard for the selected city", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "ph-1", role: "program_admin", assignedCityId: null },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.db.city.findFirst.mockResolvedValue({ id: "city-khi", name: "Karachi", code: "KHI" });
    stubCityDashboard({ parks: [] });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.db.city.findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    expect(mocks.db.park.findMany).toHaveBeenCalledWith({
      where: { cityId: "city-khi", isActive: true },
      orderBy: { name: "asc" },
    });
  });
});

function closedEvent(records: string[]) {
  return {
    id: "ev-1",
    groupId: "g-1",
    eventDate: new Date("2026-09-13T05:00:00.000Z"),
    isClosed: true,
    title: "Sunday Session",
    closedBy: null,
    closedAt: null,
    _count: { records: records.length },
    records: records.map((status) => ({ status })),
  };
}

function stubCityDashboard({ parks }: { parks: Array<{ id: string; name: string }> }) {
  mocks.db.city.findUnique.mockResolvedValue({ id: "city-lhr", name: "Lahore", code: "LHR" });
  mocks.db.park.findMany.mockResolvedValue(parks);
  mocks.db.group.count.mockResolvedValue(0);
  mocks.db.participant.count.mockResolvedValue(0);
  mocks.db.staffMeta.count.mockResolvedValue(0);
  mocks.db.group.findMany.mockResolvedValue([]);
  mocks.db.batch.findMany.mockResolvedValue([]);
  mocks.db.attendanceEvent.findMany.mockResolvedValue([]);
  mocks.db.participant.groupBy.mockResolvedValue([]);
  mocks.db.staffMeta.findMany.mockResolvedValue([]);
  mocks.db.auditLog.findMany.mockResolvedValue([]);
  mocks.db.feeEvent.findMany.mockResolvedValue([]);
}
