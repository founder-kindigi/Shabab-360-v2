import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  parkFindUnique: vi.fn(),
  groupFindUnique: vi.fn(),
  groupFindMany: vi.fn(),
  offDateFindFirst: vi.fn(),
  existingEventsFindMany: vi.fn(),
  listEventsFindMany: vi.fn(),
  eventCreate: vi.fn(),
  auditCreate: vi.fn(),
  participantGroupBy: vi.fn(),
  staffFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_admin", "park_lead", "murabbi", "city_head"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {
  park: { findUnique: mocks.parkFindUnique },
  group: { findUnique: mocks.groupFindUnique, findMany: mocks.groupFindMany },
  operationalOffDate: { findFirst: mocks.offDateFindFirst },
  attendanceEvent: { findMany: mocks.listEventsFindMany },
  participant: { groupBy: mocks.participantGroupBy },
  staffMeta: { findMany: mocks.staffFindMany },
  $transaction: (callback: (tx: unknown) => unknown) => callback({
    attendanceEvent: { findMany: mocks.existingEventsFindMany, create: mocks.eventCreate },
    auditLog: { create: mocks.auditCreate },
  }),
} }));

import { POST } from "./route";

describe("POST /api/park/attendance/prepare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role: "park_lead", assignedParkId: "ckpark0000000000000000000" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "user-1", role: "park_lead", assignedParkId: "ckpark0000000000000000000" } });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.parkFindUnique.mockResolvedValue({ id: "ckpark0000000000000000000", cityId: "ckcity0000000000000000000" });
    mocks.offDateFindFirst.mockResolvedValue(null);
    mocks.groupFindMany.mockResolvedValue([]);
    mocks.existingEventsFindMany.mockResolvedValue([]);
    mocks.listEventsFindMany.mockResolvedValue([]);
    mocks.participantGroupBy.mockResolvedValue([]);
    mocks.staffFindMany.mockResolvedValue([]);
  });

  const request = () => new Request("http://localhost/api/park/attendance/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date: "2026-08-01" }),
  });

  it("accepts an imported UUID park identifier", async () => {
    const parkId = "be979d3b-1da9-43fb-81fa-2a2f4f6c82dd";
    mocks.parkFindUnique.mockResolvedValue({ id: parkId, cityId: "61ae6957-3990-42bf-a321-b2beea3b314a" });
    const response = await POST(new Request("http://localhost/api/park/attendance/prepare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: "2026-08-01", parkId }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.parkFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: parkId, isActive: true },
    }));
  });

  it("rejects malformed park identifiers before database reads", async () => {
    const response = await POST(new Request("http://localhost/api/park/attendance/prepare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: "2026-08-01", parkId: "not-an-id" }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Invalid identifier" });
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
  });

  it("fails before reads when capability is denied", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await POST(request())).status).toBe(403);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
  });

  it("does not create sessions on a shared operational off date", async () => {
    mocks.offDateFindFirst.mockResolvedValue({ label: "Public holiday" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      events: [],
      preparation: { prepared: 0, isOffDate: true, reason: "Public holiday" },
    });
    expect(mocks.groupFindMany).not.toHaveBeenCalled();
  });

  it("creates only missing eligible group sessions with an atomic audit", async () => {
    mocks.groupFindMany.mockResolvedValue([
      { id: "group-1", name: "Group 1", batch: { name: "Batch 4", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-01"), settings: { classWeekdays: "[6]" }, extraClassDates: [] } },
      { id: "group-2", name: "Group 2", batch: { name: "Batch 4", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-01"), settings: { classWeekdays: "[6]" }, extraClassDates: [] } },
    ]);
    mocks.existingEventsFindMany.mockResolvedValue([{ groupId: "group-1" }]);
    mocks.eventCreate.mockResolvedValue({ id: "created" });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({
      events: [],
      preparation: { prepared: 1, eligibleGroups: 2, isOffDate: false },
    });
    expect(mocks.existingEventsFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.requireAuth).not.toHaveBeenCalled();
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("converges when a concurrent prepare wins the (groupId, eventDate) race", async () => {
    mocks.groupFindMany.mockResolvedValue([
      { id: "group-1", name: "Group 1", batch: { name: "Batch 4", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-01"), settings: { classWeekdays: "[6]" }, extraClassDates: [] } },
      { id: "group-2", name: "Group 2", batch: { name: "Batch 4", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-01"), settings: { classWeekdays: "[6]" }, extraClassDates: [] } },
    ]);
    // First pass inserts group-1, then loses the race for group-2 and rolls back.
    mocks.existingEventsFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ groupId: "group-2" }]);
    mocks.eventCreate
      .mockResolvedValueOnce({ id: "created-1" })
      .mockRejectedValueOnce(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }))
      .mockResolvedValueOnce({ id: "created-2" });
    mocks.auditCreate.mockResolvedValue({ id: "audit" });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preparation).toMatchObject({ prepared: 1, eligibleGroups: 2, isOffDate: false });
    expect(mocks.existingEventsFindMany).toHaveBeenCalledTimes(2);
    expect(mocks.eventCreate).toHaveBeenCalledTimes(3);
  });
});

const MURABBI_PARK = "ckpark0000000000000000000";
const MURABBI_GROUP = {
  id: "group-1",
  parkId: MURABBI_PARK,
  park: { id: MURABBI_PARK, cityId: "ckcity0000000000000000000" },
  batch: { cityId: "ckcity0000000000000000000", park: { cityId: "ckcity0000000000000000000" } },
};

function murabbiRequest(date = "2026-08-02", parkId?: string) {
  return new Request("http://localhost/api/park/attendance/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parkId ? { date, parkId } : { date }),
  });
}

describe("POST /api/park/attendance/prepare — Murabbi scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({
      user: { id: "m-1", role: "murabbi", assignedParkId: MURABBI_PARK, assignedGroupId: "group-1" },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.groupFindUnique.mockResolvedValue(MURABBI_GROUP);
    mocks.parkFindUnique.mockResolvedValue({ id: MURABBI_PARK, cityId: "ckcity0000000000000000000" });
    mocks.offDateFindFirst.mockResolvedValue(null);
    mocks.existingEventsFindMany.mockResolvedValue([]);
    mocks.listEventsFindMany.mockResolvedValue([]);
    mocks.participantGroupBy.mockResolvedValue([]);
    mocks.staffFindMany.mockResolvedValue([]);
  });

  it("prepares the assigned group session on a valid scheduled class date", async () => {
    mocks.groupFindMany.mockResolvedValue([{
      id: "group-1",
      name: "Group 1",
      batch: { name: "Batch 4", startDate: new Date("2026-05-23"), endDate: new Date("2027-01-31"), settings: { classWeekdays: "[0,6]" }, extraClassDates: [] },
    }]);
    mocks.eventCreate.mockResolvedValue({ id: "created-1" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });

    const response = await POST(murabbiRequest("2026-08-02"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preparation).toMatchObject({ prepared: 1, eligibleGroups: 1, isOffDate: false });
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
    expect(mocks.groupFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "group-1", isActive: true }),
    }));
  });

  it("creates no session on a non-class date and never touches another group", async () => {
    mocks.groupFindMany.mockResolvedValue([{
      id: "group-1",
      name: "Group 1",
      batch: { name: "Batch 4", startDate: new Date("2026-05-23"), endDate: new Date("2027-01-31"), settings: { classWeekdays: "[0,6]" }, extraClassDates: [] },
    }]);

    const response = await POST(murabbiRequest("2026-09-15"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preparation).toMatchObject({ prepared: 0, eligibleGroups: 0, isOffDate: false });
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("denies an unassigned Murabbi before any park or group read", async () => {
    mocks.requireCapability.mockResolvedValue({
      user: { id: "m-2", role: "murabbi", assignedParkId: MURABBI_PARK, assignedGroupId: null },
    });
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(murabbiRequest());

    expect(response.status).toBe(403);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
    expect(mocks.groupFindMany).not.toHaveBeenCalled();
  });

  it("denies a Murabbi whose requested park is not their group's park", async () => {
    const response = await POST(murabbiRequest("2026-08-02", "ckother000000000000000000"));

    expect(response.status).toBe(403);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
    expect(mocks.groupFindMany).not.toHaveBeenCalled();
  });

  it("denies a Muawin the attendance prepare capability", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(murabbiRequest());

    expect(response.status).toBe(403);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
  });
});
