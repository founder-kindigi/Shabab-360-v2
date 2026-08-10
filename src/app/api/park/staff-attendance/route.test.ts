import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  isHqRole: vi.fn(),
  userHasCapability: vi.fn(),
  parkFindUnique: vi.fn(),
  batchFindMany: vi.fn(),
  eventFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_admin", "park_lead", "murabbi"],
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
  isHqRole: mocks.isHqRole,
}));

vi.mock("@/lib/db", () => ({
  db: {
    park: { findUnique: mocks.parkFindUnique },
    batch: { findMany: mocks.batchFindMany },
    parkStaffAttendanceEvent: { findUnique: mocks.eventFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: mocks.userHasCapability,
}));

import { POST } from "./route";

const parkId = "ckggggggggggggggggggggggg";
const saturday = "2026-08-01T08:00:00.000Z";

describe("POST /api/park/staff-attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({
      user: { id: "user-1", role: "park_lead", assignedParkId: parkId },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.isHqRole.mockReturnValue(false);
    mocks.userHasCapability.mockResolvedValue(true);
    mocks.parkFindUnique.mockResolvedValue({ id: parkId, name: "Park", isActive: true });
    mocks.batchFindMany.mockResolvedValue([
      { startDate: new Date("2026-07-01T00:00:00.000Z"), endDate: null, settings: null },
    ]);
  });

  it("denies staff roll-call creation to a scoped role that cannot manage it", async () => {
    mocks.requireCapability.mockResolvedValue({
      user: { id: "user-1", role: "murabbi", assignedParkId: parkId },
    });

    const response = await POST(new Request("http://localhost/api/park/staff-attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parkId, eventDate: saturday }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("refuses creation when no active batch is scheduled on the requested date", async () => {
    mocks.batchFindMany.mockResolvedValue([
      { startDate: new Date("2026-07-01T00:00:00.000Z"), endDate: null, settings: {
        offWeekdays: [{ weekday: 6 }],
        offDates: [],
      } },
    ]);

    const response = await POST(new Request("http://localhost/api/park/staff-attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parkId, eventDate: saturday }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates the roll call and audit record in one transaction", async () => {
    const tx = {
      parkStaffAttendanceEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "event-1", eventDate: new Date(saturday) }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    mocks.transaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));

    const response = await POST(new Request("http://localhost/api/park/staff-attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parkId, eventDate: saturday }),
    }));

    expect(response.status).toBe(201);
    expect(tx.parkStaffAttendanceEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("returns a conflict without writing when the date already has a staff roll call", async () => {
    const tx = {
      parkStaffAttendanceEvent: {
        findUnique: vi.fn().mockResolvedValue({ id: "event-1" }),
        create: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };
    mocks.transaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));

    const response = await POST(new Request("http://localhost/api/park/staff-attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parkId, eventDate: saturday }),
    }));

    expect(response.status).toBe(409);
    expect(tx.parkStaffAttendanceEvent.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
