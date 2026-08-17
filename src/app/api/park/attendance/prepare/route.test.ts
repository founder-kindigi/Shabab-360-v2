import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  parkFindUnique: vi.fn(),
  groupFindMany: vi.fn(),
  offDateFindFirst: vi.fn(),
  eventFindUnique: vi.fn(),
  eventCreate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_admin", "park_lead", "murabbi", "city_head"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {
  park: { findUnique: mocks.parkFindUnique },
  group: { findUnique: vi.fn(), findMany: mocks.groupFindMany },
  operationalOffDate: { findFirst: mocks.offDateFindFirst },
  $transaction: (callback: (tx: unknown) => unknown) => callback({
    attendanceEvent: { findUnique: mocks.eventFindUnique, create: mocks.eventCreate },
    auditLog: { create: mocks.auditCreate },
  }),
} }));

import { POST } from "./route";

describe("POST /api/park/attendance/prepare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role: "park_lead", assignedParkId: "ckpark0000000000000000000" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.parkFindUnique.mockResolvedValue({ id: "ckpark0000000000000000000", cityId: "ckcity0000000000000000000" });
    mocks.offDateFindFirst.mockResolvedValue(null);
    mocks.groupFindMany.mockResolvedValue([]);
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
    expect(await response.json()).toMatchObject({ prepared: 0, isOffDate: true, reason: "Public holiday" });
    expect(mocks.groupFindMany).not.toHaveBeenCalled();
  });

  it("creates only missing eligible group sessions with an atomic audit", async () => {
    mocks.groupFindMany.mockResolvedValue([
      { id: "group-1", name: "Group 1", batch: { name: "Batch 4", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-01"), settings: { classWeekdays: "[6]" }, extraClassDates: [] } },
      { id: "group-2", name: "Group 2", batch: { name: "Batch 4", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-01"), settings: { classWeekdays: "[6]" }, extraClassDates: [] } },
    ]);
    mocks.eventFindUnique.mockResolvedValueOnce({ id: "existing" }).mockResolvedValueOnce(null);
    mocks.eventCreate.mockResolvedValue({ id: "created" });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ prepared: 1, eligibleGroups: 2, isOffDate: false });
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });
});
