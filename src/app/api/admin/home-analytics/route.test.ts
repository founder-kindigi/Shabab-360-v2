import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveRequestedHierarchy: vi.fn(),
  groupResourceScope: vi.fn(),
  groupFindMany: vi.fn(),
  participantFindMany: vi.fn(),
  attendanceEventFindMany: vi.fn(),
  attendanceRecordFindMany: vi.fn(),
  parkFindMany: vi.fn(),
  staffAttendanceEventFindMany: vi.fn(),
  batchFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/auth/hierarchy", () => ({
  resolveRequestedHierarchy: mocks.resolveRequestedHierarchy,
  hierarchyGroupWhere: () => ({}),
  groupHierarchyInclude: {},
  groupResourceScope: mocks.groupResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    group: { findMany: mocks.groupFindMany },
    participant: { findMany: mocks.participantFindMany },
    attendanceEvent: { findMany: mocks.attendanceEventFindMany },
    attendanceRecord: { findMany: mocks.attendanceRecordFindMany },
    park: { findMany: mocks.parkFindMany },
    staffAttendanceEvent: { findMany: mocks.staffAttendanceEventFindMany },
    batch: { findMany: mocks.batchFindMany },
  },
}));

import { GET } from "./route";

const hqUser = { id: "hq-1", role: "super_admin" };
const request = () => new Request("http://localhost/api/admin/home-analytics?from=2026-01-01&to=2026-01-02");

describe("GET /api/admin/home-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.resolveRequestedHierarchy.mockResolvedValue({ kind: "hq", cityId: null, parkId: null, groupId: null });
    mocks.groupFindMany.mockResolvedValue([
      {
        id: "group-1",
        name: "Group 1",
        parkId: "park-1",
        park: { id: "park-1", cityId: "city-1" },
        batch: { id: "batch-1", parkId: "park-1", park: { id: "park-1", cityId: "city-1" } },
        murabbis: [{ id: "m-1", user: { name: "Murabbi One" } }],
      },
    ]);
    mocks.groupResourceScope.mockReturnValue({ cityId: "city-1", parkId: "park-1", groupId: "group-1" });
    mocks.participantFindMany.mockResolvedValue([
      { id: "p-assigned", groupId: "group-1", state: "active", joinedAt: new Date("2025-01-01T00:00:00.000Z"), dropoutAt: null },
      { id: "p-unassigned", groupId: null, state: "active", joinedAt: new Date("2025-01-01T00:00:00.000Z"), dropoutAt: null },
    ]);
    mocks.attendanceEventFindMany.mockResolvedValue([
      { id: "e-1", groupId: "group-1", eventDate: new Date("2026-01-01T10:00:00.000Z") },
    ]);
    mocks.attendanceRecordFindMany.mockResolvedValue([
      { eventId: "e-1", participantId: "p-assigned", status: "present" },
    ]);
    mocks.parkFindMany.mockResolvedValue([{ id: "park-1", name: "Park One" }]);
    mocks.staffAttendanceEventFindMany.mockResolvedValue([]);
    mocks.batchFindMany.mockResolvedValue([]);
  });

  it("excludes an unassigned participant from reporting totals", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.students).toBe(1);
    expect(body.totalStudents).toBe(1);
    expect(body.parkAttendance[0].studentCount).toBe(1);
    expect(body.parkAttendance[0].totalStudents).toBe(1);
    expect(body.byMurabbi).toHaveLength(1);
    expect(body.byMurabbi[0].total).toBe(1);
    expect(body.byMurabbi[0].attended).toBe(1);
  });

  it("counts a reactivated participant only before dropout and from the rejoin date onward", async () => {
    mocks.participantFindMany.mockResolvedValue([
      {
        id: "p-returning", groupId: "group-1", state: "active",
        joinedAt: new Date("2025-01-01T00:00:00.000Z"),
        dropoutAt: new Date("2026-03-02T00:00:00.000Z"),
        reactivatedAt: new Date("2026-03-05T00:00:00.000Z"),
      },
    ]);
    mocks.attendanceEventFindMany.mockResolvedValue([
      { id: "e1", groupId: "group-1", eventDate: new Date("2026-03-01T10:00:00.000Z") },
      { id: "e2", groupId: "group-1", eventDate: new Date("2026-03-02T10:00:00.000Z") },
      { id: "e3", groupId: "group-1", eventDate: new Date("2026-03-03T10:00:00.000Z") },
      { id: "e4", groupId: "group-1", eventDate: new Date("2026-03-04T10:00:00.000Z") },
      { id: "e5", groupId: "group-1", eventDate: new Date("2026-03-05T10:00:00.000Z") },
      { id: "e6", groupId: "group-1", eventDate: new Date("2026-03-06T10:00:00.000Z") },
    ]);
    mocks.attendanceRecordFindMany.mockResolvedValue([
      { eventId: "e1", participantId: "p-returning", status: "present" },
      { eventId: "e2", participantId: "p-returning", status: "present" },
      { eventId: "e5", participantId: "p-returning", status: "present" },
      { eventId: "e6", participantId: "p-returning", status: "present" },
    ]);

    const response = await GET(new Request("http://localhost/api/admin/home-analytics?from=2026-03-01&to=2026-03-06"));
    const body = await response.json();

    expect(response.status).toBe(200);
    // The projection must request the rejoin date, or the helper treats it as absent.
    expect(mocks.participantFindMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ reactivatedAt: true }),
    }));
    // e1 is before dropout; e2-e4 fall in the interruption; e5 and e6 are on/after rejoin.
    expect(body.attendance).toMatchObject({ total: 3, present: 3, attended: 3, rate: 100 });
    expect(body.byMurabbi[0]).toMatchObject({ total: 3, present: 3 });
    expect(body.parkAttendance[0]).toMatchObject({ total: 3 });
  });

  describe("bounded daily series and latest session", () => {
    const windowed = (from: string, to: string) => new Request(`http://localhost/api/admin/home-analytics?from=${from}&to=${to}`);

    beforeEach(() => {
      mocks.groupFindMany.mockResolvedValue([
        {
          id: "group-1", name: "Group 1", parkId: "park-1",
          park: { id: "park-1", cityId: "city-1" },
          batch: { id: "batch-1", parkId: "park-1", park: { id: "park-1", cityId: "city-1" } },
          murabbis: [{ id: "m-1", user: { name: "Murabbi One" } }],
        },
        {
          id: "group-2", name: "Group 2", parkId: "park-2",
          park: { id: "park-2", cityId: "city-1" },
          batch: { id: "batch-1", parkId: "park-1", park: { id: "park-1", cityId: "city-1" } },
          murabbis: [{ id: "m-2", user: { name: "Murabbi Two" } }],
        },
      ]);
      mocks.groupResourceScope.mockImplementation((group: { id: string; parkId: string }) => ({
        cityId: "city-1", parkId: group.parkId, groupId: group.id,
      }));
      mocks.participantFindMany.mockResolvedValue([
        { id: "p1", groupId: "group-1", state: "active", joinedAt: new Date("2025-01-01T00:00:00.000Z"), dropoutAt: null, reactivatedAt: null },
        { id: "p2", groupId: "group-2", state: "active", joinedAt: new Date("2025-01-01T00:00:00.000Z"), dropoutAt: null, reactivatedAt: null },
      ]);
      // Two real session days for park-1 only; park-2 has no session.
      mocks.attendanceEventFindMany.mockResolvedValue([
        { id: "e1", groupId: "group-1", eventDate: new Date("2026-09-10T10:00:00.000Z") },
        { id: "e2", groupId: "group-1", eventDate: new Date("2026-09-13T10:00:00.000Z") },
      ]);
      mocks.attendanceRecordFindMany.mockResolvedValue([
        { eventId: "e1", participantId: "p1", status: "present" },
        { eventId: "e2", participantId: "p1", status: "late" },
      ]);
      mocks.parkFindMany.mockResolvedValue([
        { id: "park-1", name: "Park One" },
        { id: "park-2", name: "Park Two" },
      ]);
    });

    it("returns only real session days, ascending, and never a zero-filled no-session day", async () => {
      const response = await GET(windowed("2026-09-01", "2026-09-30"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.from).toBe("2026-09-01");
      expect(body.to).toBe("2026-09-30");
      expect(body.daily.map((entry: { date: string }) => entry.date)).toEqual(["2026-09-10", "2026-09-13"]);
      expect(body.daily[0]).toMatchObject({ present: 1, late: 0, absent: 0, attended: 1, total: 1, rate: 100 });
      expect(body.daily[1]).toMatchObject({ present: 0, late: 1, attended: 1, total: 1, rate: 100 });
    });

    it("reports each park's latest real session and null when a park has none", async () => {
      const response = await GET(windowed("2026-09-01", "2026-09-30"));
      const body = await response.json();

      expect(body.parkAttendance[0]).toMatchObject({ name: "Park One", latestSession: { date: "2026-09-13", attended: 1, total: 1, rate: 100 } });
      expect(body.parkAttendance[1]).toMatchObject({ name: "Park Two", latestSession: null });
      const murabbiOne = body.byMurabbi.find((entry: { name: string }) => entry.name === "Murabbi One");
      const murabbiTwo = body.byMurabbi.find((entry: { name: string }) => entry.name === "Murabbi Two");
      expect(murabbiOne.latestSession).toMatchObject({ date: "2026-09-13" });
      expect(murabbiTwo.latestSession).toBeNull();
    });

    it("rejects malformed, unordered or over-long date ranges before reading data", async () => {
      expect((await GET(new Request("http://localhost/api/admin/home-analytics?from=not-a-date&to=2026-09-30"))).status).toBe(400);
      expect((await GET(windowed("2026-09-30", "2026-09-01"))).status).toBe(400);
      expect((await GET(windowed("2025-01-01", "2026-09-30"))).status).toBe(400);
      expect(mocks.groupFindMany).not.toHaveBeenCalled();
    });

    it("denies a caller without the reporting capability before any data read", async () => {
      mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

      const response = await GET(windowed("2026-09-01", "2026-09-30"));

      expect(response.status).toBe(403);
      expect(mocks.groupFindMany).not.toHaveBeenCalled();
    });

    it("denies a caller whose requested scope is not authorized", async () => {
      mocks.resolveRequestedHierarchy.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

      const response = await GET(windowed("2026-09-01", "2026-09-30"));

      expect(response.status).toBe(403);
      expect(mocks.groupFindMany).not.toHaveBeenCalled();
    });
  });

  describe("derived Batch trend period", () => {
    const request = () => new Request("http://localhost/api/admin/home-analytics");

    beforeEach(() => {
      mocks.batchFindMany.mockResolvedValue([
        {
          id: "batch-4", name: "Batch 4",
          startDate: new Date("2026-05-23T00:00:00.000Z"),
          endDate: new Date("2027-01-31T00:00:00.000Z"),
        },
      ]);
      mocks.groupFindMany.mockResolvedValue([
        {
          id: "group-1", name: "Group 1", parkId: "park-1",
          park: { id: "park-1", cityId: "city-1" },
          batch: { id: "batch-4", parkId: "park-1", park: { id: "park-1", cityId: "city-1" } },
          murabbis: [{ id: "m-1", user: { name: "Murabbi One" } }],
        },
        {
          id: "group-2", name: "Group 2", parkId: "park-2",
          park: { id: "park-2", cityId: "city-1" },
          batch: { id: "batch-4", parkId: "park-1", park: { id: "park-1", cityId: "city-1" } },
          murabbis: [{ id: "m-2", user: { name: "Murabbi Two" } }],
        },
      ]);
      mocks.groupResourceScope.mockImplementation((group: { id: string; parkId: string }) => ({
        cityId: "city-1", parkId: group.parkId, groupId: group.id,
      }));
      mocks.participantFindMany.mockResolvedValue([
        { id: "p1", groupId: "group-1", state: "active", joinedAt: new Date("2025-01-01T00:00:00.000Z"), dropoutAt: null, reactivatedAt: null },
        { id: "p2", groupId: "group-2", state: "active", joinedAt: new Date("2025-01-01T00:00:00.000Z"), dropoutAt: null, reactivatedAt: null },
      ]);
      mocks.parkFindMany.mockResolvedValue([
        { id: "park-1", name: "Park One" },
        { id: "park-2", name: "Park Two" },
      ]);
    });

    it("uses the active Batch start date and the latest session with attendance data", async () => {
      const future = new Date(Date.now() + 5 * 86400000);
      mocks.attendanceEventFindMany.mockResolvedValue([
        { id: "e-jun", groupId: "group-1", eventDate: new Date("2026-06-01T10:00:00.000Z") },
        { id: "e-sep", groupId: "group-1", eventDate: new Date("2026-09-13T10:00:00.000Z") },
        // A past scheduled date with no recorded mark must not become the period end.
        { id: "e-scheduled", groupId: "group-1", eventDate: new Date("2026-09-16T10:00:00.000Z") },
        { id: "e-future", groupId: "group-1", eventDate: future },
      ]);
      mocks.attendanceRecordFindMany.mockResolvedValue([
        { eventId: "e-jun", participantId: "p1", status: "present" },
        { eventId: "e-sep", participantId: "p1", status: "absent" },
        { eventId: "e-future", participantId: "p1", status: "present" },
      ]);

      const body = await (await GET(request())).json();

      expect(body.batch).toMatchObject({ name: "Batch 4", startDate: "2026-05-23", endDate: "2027-01-31" });
      expect(body.periodStart).toBe("2026-05-23");
      expect(body.periodEnd).toBe("2026-09-13");
      expect(body.from).toBe("2026-05-23");
      expect(body.to).toBe("2026-09-13");
      expect(body.hasCompletedSession).toBe(true);
      // The start is the Batch start, not a rolling 30-day window.
      expect(body.periodStart < "2026-08-18").toBe(true);
      expect(body.daily.map((entry: { date: string }) => entry.date)).toEqual(["2026-06-01", "2026-09-13"]);
      expect(mocks.batchFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }));
    });

    it("returns an active Batch start older than 366 days unchanged", async () => {
      mocks.batchFindMany.mockResolvedValue([
        {
          id: "batch-1", name: "Batch 1",
          startDate: new Date("2024-01-15T00:00:00.000Z"),
          endDate: new Date("2024-12-31T00:00:00.000Z"),
        },
      ]);
      mocks.attendanceEventFindMany.mockResolvedValue([
        { id: "old", groupId: "group-1", eventDate: new Date("2024-02-10T10:00:00.000Z") },
        { id: "recent", groupId: "group-1", eventDate: new Date("2026-09-13T10:00:00.000Z") },
      ]);
      mocks.attendanceRecordFindMany.mockResolvedValue([
        { eventId: "old", participantId: "p1", status: "present" },
        { eventId: "recent", participantId: "p1", status: "present" },
      ]);

      const body = await (await GET(request())).json();

      // No rolling window and no clamp: the stated Batch start is returned as-is.
      expect(body.batch).toMatchObject({ name: "Batch 1", startDate: "2024-01-15" });
      expect(body.periodStart).toBe("2024-01-15");
      expect(body.from).toBe("2024-01-15");
      expect(body.multiBatch).toBe(false);
      expect(body.daily.map((entry: { date: string }) => entry.date)).toEqual(["2024-02-10", "2026-09-13"]);
      expect(body.periodEnd).toBe("2026-09-13");
    });

    it("reports a multi-Batch state without naming or dating a single Batch", async () => {
      mocks.batchFindMany.mockResolvedValue([
        { id: "batch-a", name: "Batch Alpha", startDate: new Date("2025-01-06T00:00:00.000Z"), endDate: new Date("2025-12-31T00:00:00.000Z") },
        { id: "batch-b", name: "Batch Beta", startDate: new Date("2026-05-23T00:00:00.000Z"), endDate: new Date("2027-01-31T00:00:00.000Z") },
      ]);
      mocks.attendanceEventFindMany.mockResolvedValue([
        { id: "a", groupId: "group-1", eventDate: new Date("2025-02-01T10:00:00.000Z") },
        { id: "b", groupId: "group-2", eventDate: new Date("2026-09-13T10:00:00.000Z") },
      ]);
      mocks.attendanceRecordFindMany.mockResolvedValue([
        { eventId: "a", participantId: "p1", status: "present" },
        { eventId: "b", participantId: "p2", status: "present" },
      ]);

      const body = await (await GET(request())).json();

      expect(body.multiBatch).toBe(true);
      expect(body.batches.map((batch: { name: string }) => batch.name)).toEqual(["Batch Alpha", "Batch Beta"]);
      // No arbitrary Batch name and no false single-Batch period.
      expect(body.batch).toBeNull();
      expect(body.periodStart).toBeNull();
      expect(body.periodEnd).toBeNull();
      expect(body.daily).toEqual([]);
      expect(body.hasCompletedSession).toBe(true);
      // Aggregate figures still cover every scoped session.
      expect(body.attendance).toMatchObject({ attended: 2, total: 2 });
    });

    it("returns a truthful empty result when no session has attendance data", async () => {
      mocks.attendanceEventFindMany.mockResolvedValue([
        { id: "e-scheduled", groupId: "group-1", eventDate: new Date("2026-09-16T10:00:00.000Z") },
      ]);
      mocks.attendanceRecordFindMany.mockResolvedValue([]);

      const body = await (await GET(request())).json();

      expect(body.hasCompletedSession).toBe(false);
      expect(body.periodEnd).toBeNull();
      expect(body.daily).toEqual([]);
      expect(body.attendance).toMatchObject({ attended: 0, total: 0, rate: null });
      expect(body.parkAttendance.every((park: { latestSession: unknown }) => park.latestSession === null)).toBe(true);
    });

    it("keeps each park's real eligible denominator when session histories differ", async () => {
      mocks.attendanceEventFindMany.mockResolvedValue([
        { id: "a1", groupId: "group-1", eventDate: new Date("2026-06-01T10:00:00.000Z") },
        { id: "a2", groupId: "group-1", eventDate: new Date("2026-09-13T10:00:00.000Z") },
        { id: "b1", groupId: "group-2", eventDate: new Date("2026-09-13T10:00:00.000Z") },
      ]);
      mocks.attendanceRecordFindMany.mockResolvedValue([
        { eventId: "a1", participantId: "p1", status: "present" },
        { eventId: "a2", participantId: "p1", status: "absent" },
        { eventId: "b1", participantId: "p2", status: "present" },
      ]);

      const body = await (await GET(request())).json();
      const parkOne = body.parkAttendance.find((park: { name: string }) => park.name === "Park One");
      const parkTwo = body.parkAttendance.find((park: { name: string }) => park.name === "Park Two");

      // Park One ran two sessions for one participant; Park Two ran one.
      expect(parkOne).toMatchObject({ attended: 1, total: 2, rate: 50 });
      expect(parkTwo).toMatchObject({ attended: 1, total: 1, rate: 100 });
      expect(body.attendance).toMatchObject({ attended: 2, total: 3 });
      expect(parkOne.total).not.toBe(parkTwo.total);
    });

    it("still denies an unauthorized scope before resolving a Batch", async () => {
      mocks.resolveRequestedHierarchy.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

      const response = await GET(request());

      expect(response.status).toBe(403);
      expect(mocks.batchFindMany).not.toHaveBeenCalled();
    });

    it("still denies a caller without the reporting capability", async () => {
      mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

      const response = await GET(request());

      expect(response.status).toBe(403);
      expect(mocks.groupFindMany).not.toHaveBeenCalled();
      expect(mocks.batchFindMany).not.toHaveBeenCalled();
    });

    it("keeps city, park and group filters in the hierarchy scope", async () => {
      mocks.attendanceEventFindMany.mockResolvedValue([]);
      mocks.attendanceRecordFindMany.mockResolvedValue([]);

      await GET(new Request("http://localhost/api/admin/home-analytics?parkId=park-2"));

      expect(mocks.resolveRequestedHierarchy).toHaveBeenCalledWith(
        hqUser,
        expect.objectContaining({ parkId: "park-2" })
      );
    });
  });
});
