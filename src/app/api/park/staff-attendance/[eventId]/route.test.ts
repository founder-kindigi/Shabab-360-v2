import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  isHqRole: vi.fn(),
  eventFindUnique: vi.fn(),
  staffFindUnique: vi.fn(),
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
    parkStaffAttendanceEvent: { findUnique: mocks.eventFindUnique },
    staffMeta: { findUnique: mocks.staffFindUnique },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "./route";

const eventId = "ckeeeeeeeeeeeeeeeeeeeeeee";
const staffId = "cksssssssssssssssssssssss";

describe("PATCH /api/park/staff-attendance/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({
      user: { id: "user-1", role: "park_lead", assignedParkId: "park-1" },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.isHqRole.mockReturnValue(false);
    mocks.eventFindUnique.mockResolvedValue({
      id: eventId,
      parkId: "park-1",
      title: "Park staff attendance",
      eventDate: new Date("2026-08-01T08:00:00.000Z"),
      isClosed: false,
      closedAt: null,
    });
  });

  it("denies an inactive staff member before opening a write transaction", async () => {
    mocks.staffFindUnique.mockResolvedValue({
      id: staffId,
      isActive: false,
      assignedParkId: "park-1",
      assignedGroup: null,
    });

    const response = await PATCH(new Request(`http://localhost/api/park/staff-attendance/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffId, status: "present" }),
    }), { params: Promise.resolve({ eventId }) });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies an active staff member assigned to another park", async () => {
    mocks.staffFindUnique.mockResolvedValue({
      id: staffId,
      isActive: true,
      assignedParkId: "park-2",
      assignedGroup: null,
    });

    const response = await PATCH(new Request(`http://localhost/api/park/staff-attendance/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffId, status: "present" }),
    }), { params: Promise.resolve({ eventId }) });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("upserts an eligible staff record with its audit record in the same transaction", async () => {
    mocks.staffFindUnique.mockResolvedValue({
      id: staffId,
      isActive: true,
      assignedParkId: "park-1",
      assignedGroup: null,
    });
    const tx = {
      parkStaffAttendanceEvent: { findFirst: vi.fn().mockResolvedValue({ id: eventId }) },
      parkStaffAttendanceRecord: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: "record-1", status: "present" }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    mocks.transaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));

    const response = await PATCH(new Request(`http://localhost/api/park/staff-attendance/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ staffId, status: "present" }),
    }), { params: Promise.resolve({ eventId }) });

    expect(response.status).toBe(200);
    expect(tx.parkStaffAttendanceRecord.upsert).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
