import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  eventFindUnique: vi.fn(),
  transaction: vi.fn(),
  updateMany: vi.fn(),
  auditCreate: vi.fn(),
  txFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["park_lead", "park_admin", "murabbi"],
  isHqRole: vi.fn(() => false),
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/audit", () => ({
  createAuditLogData: (value: unknown) => value,
}));
vi.mock("@/lib/db", () => ({
  db: {
    parkStaffAttendanceEvent: { findUnique: mocks.eventFindUnique },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "./route";

describe("PATCH /api/park/staff-attendance/[eventId]/close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({
      user: { id: "user-1", role: "park_lead", assignedParkId: "park-1" },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.eventFindUnique.mockResolvedValue({ id: "event-1", parkId: "park-1", isClosed: false });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.txFindUnique.mockResolvedValue({ id: "event-1", isClosed: true, closedAt: new Date("2026-08-10T12:00:00.000Z") });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      parkStaffAttendanceEvent: { updateMany: mocks.updateMany, findUnique: mocks.txFindUnique },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("closes an in-scope staff roll-call and writes its audit in the transaction", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/park/staff-attendance/event-1/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Verified by Park Lead" }),
      }),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "event-1", isClosed: false },
    }));
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
  });

  it("returns 409 without an audit if another request already closed the event", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(
      new Request("http://localhost/api/park/staff-attendance/event-1/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Verified by Park Lead" }),
      }),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );

    expect(response.status).toBe(409);
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("denies a Murabbi before opening a transaction", async () => {
    mocks.requireCapability.mockResolvedValue({
      user: { id: "user-1", role: "murabbi", assignedParkId: "park-1" },
    });
    const response = await PATCH(
      new Request("http://localhost/api/park/staff-attendance/event-1/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Verified by Park Lead" }),
      }),
      { params: Promise.resolve({ eventId: "event-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
