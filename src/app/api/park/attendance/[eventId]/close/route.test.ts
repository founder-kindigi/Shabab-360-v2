import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  eventFindUnique: vi.fn(),
  staffFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {
  attendanceEvent: { findUnique: mocks.eventFindUnique },
  staffMeta: { findUnique: mocks.staffFindUnique },
  $transaction: mocks.transaction,
} }));

import { PATCH } from "./route";

const eventId = "event-1";
const request = (body: unknown) => new Request("http://localhost", {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("attendance close records attendance only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role: "park_lead" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "user-1", role: "park_lead" } });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.staffFindUnique.mockResolvedValue({ id: "staff-1", user: { name: "Lead" } });
    mocks.eventFindUnique.mockResolvedValue({
      id: eventId,
      eventDate: new Date("2026-08-16T00:00:00.000Z"),
      groupId: "group-1",
      isClosed: false,
      // A legacy batch setting still says automatic dropout is enabled.
      group: { batch: {
        cityId: "city-1",
        parkId: "park-1",
        park: { cityId: "city-1" },
        settings: { classWeekdays: "[0,6]", automaticDropoutEnabled: true, warningConsecutiveWeeks: 2, dropoutConsecutiveWeeks: 3 },
      } },
    });
  });

  it("denies when correction capability is missing", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await PATCH(request({ reason: "Weekly register complete" }), { params: Promise.resolve({ eventId }) })).status).toBe(403);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("closes the session, writes only the close audit, and never writes a participant lifecycle", async () => {
    const tx = {
      attendanceEvent: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      participant: { findMany: vi.fn(), updateMany: vi.fn() },
      attendanceRecord: { findMany: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));

    const response = await PATCH(request({ reason: "Weekly register complete" }), { params: Promise.resolve({ eventId }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, automaticDropouts: 0, event: { id: eventId, isClosed: true } });
    expect(tx.attendanceEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: eventId, isClosed: false },
      data: expect.objectContaining({ isClosed: true }),
    }));
    expect(tx.participant.findMany).not.toHaveBeenCalled();
    expect(tx.participant.updateMany).not.toHaveBeenCalled();
    expect(tx.attendanceRecord.findMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "event_close", entityType: "attendance_events" }),
    }));
  });

  it("returns 409 when another request already closed the session", async () => {
    const tx = {
      attendanceEvent: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      participant: { findMany: vi.fn(), updateMany: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));

    const response = await PATCH(request({ reason: "Weekly register complete" }), { params: Promise.resolve({ eventId }) });

    expect(response.status).toBe(409);
    expect(tx.participant.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("attendance close — park_admin lifecycle authority (F-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.staffFindUnique.mockResolvedValue({ id: "staff-admin", user: { name: "Admin" } });
    mocks.eventFindUnique.mockResolvedValue({
      id: eventId,
      eventDate: new Date("2026-08-16T00:00:00.000Z"),
      groupId: "group-1",
      isClosed: false,
      group: { batch: { cityId: "city-1", parkId: "park-1", park: { cityId: "city-1" } } },
    });
  });

  it("park_admin with same-park scope can close a session", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1", role: "park_admin", assignedParkId: "park-1" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "admin-1", role: "park_admin", assignedParkId: "park-1" } });
    // Same-park scope check passes
    mocks.requireResourceScope.mockReturnValue(null);
    const tx = {
      attendanceEvent: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      participant: { findMany: vi.fn(), updateMany: vi.fn() },
      attendanceRecord: { findMany: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));

    const response = await PATCH(request({ reason: "Admin closing" }), { params: Promise.resolve({ eventId }) });

    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
  });

  it("park_admin from a different park is denied", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-2", role: "park_admin", assignedParkId: "park-999" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "admin-2", role: "park_admin", assignedParkId: "park-999" } });
    // Scope check denies cross-park access
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await PATCH(request({ reason: "Admin closing wrong park" }), { params: Promise.resolve({ eventId }) });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("park_lead behavior is preserved after adding park_admin", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "lead-1", role: "park_lead", assignedParkId: "park-1" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "lead-1", role: "park_lead", assignedParkId: "park-1" } });
    mocks.requireResourceScope.mockReturnValue(null);
    const tx = {
      attendanceEvent: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      participant: { findMany: vi.fn(), updateMany: vi.fn() },
      attendanceRecord: { findMany: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));

    const response = await PATCH(request({ reason: "Lead closing" }), { params: Promise.resolve({ eventId }) });

    expect(response.status).toBe(200);
  });
});

