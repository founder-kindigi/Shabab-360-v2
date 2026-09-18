import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  eventFindUnique: vi.fn(),
  eventUpdate: vi.fn(),
  recordFindUnique: vi.fn(),
  recordUpdate: vi.fn(),
  auditCreate: vi.fn(),
  staffMetaFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: async (run: (tx: unknown) => unknown) => run({
      attendanceEvent: { findUnique: mocks.eventFindUnique, update: mocks.eventUpdate },
      attendanceRecord: { findUnique: mocks.recordFindUnique, update: mocks.recordUpdate },
      auditLog: { create: mocks.auditCreate },
      staffMeta: { findUnique: mocks.staffMetaFindUnique },
    }),
    attendanceRecord: { findUnique: mocks.recordFindUnique, update: mocks.recordUpdate },
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
  },
}));
vi.mock("@/lib/audit", async (original) => ({ ...await original<typeof import("@/lib/audit")>(), logAudit: vi.fn() }));

import { PATCH } from "./route";

const IF_MATCH = "2026-09-01T00:00:00.000Z";
const EDIT_REASON = "Correcting an earlier marking";

const scheduledEvent = {
  id: "event-2",
  groupId: "group-2",
  eventDate: new Date("2026-08-16T00:00:00.000Z"),
  group: {
    id: "group-2", parkId: "park-2", isActive: true,
    park: { id: "park-2", cityId: "city-2" },
    batch: {
      id: "batch-2", isActive: true, cityId: "city-2",
      startDate: new Date("2026-05-23T00:00:00.000Z"),
      endDate: new Date("2027-01-31T00:00:00.000Z"),
      settings: { classWeekdays: "[0,6]" },
      extraClassDates: [],
      park: { cityId: "city-2" },
    },
  },
};

const crossParkEvent = {
  id: "event-2",
  groupId: "group-2",
  eventDate: new Date("2026-08-16T00:00:00.000Z"),
  group: { id: "group-2", parkId: "park-2", isActive: true, park: { cityId: "city-2" }, batch: { isActive: true, cityId: "city-2" } },
};

function withEvent(overrides: Record<string, unknown>) {
  return { ...scheduledEvent, ...overrides };
}

function withGroup(overrides: Record<string, unknown>) {
  return { ...scheduledEvent, group: { ...scheduledEvent.group, ...overrides } };
}

function request(ifMatch = IF_MATCH, body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/park/attendance/event-2/records/record-2", {
    method: "PATCH",
    headers: { "content-type": "application/json", "If-Match": ifMatch },
    body: JSON.stringify({ status: "absent", editReason: EDIT_REASON, ...body }),
  });
}

const params = { params: Promise.resolve({ eventId: "event-2", recordId: "record-2" }) };

describe("PATCH /api/park/attendance/[eventId]/records/[recordId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.staffMetaFindUnique.mockResolvedValue({ id: "staff", role: "park_admin", assignedParkId: "park-1", isActive: true });
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-admin", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.eventFindUnique.mockResolvedValue(scheduledEvent);
    mocks.recordFindUnique.mockResolvedValue({
      id: "record-2",
      eventId: "event-2",
      status: "present",
      markedBy: null,
      markedAt: new Date(IF_MATCH),
    });
    mocks.eventUpdate.mockResolvedValue({ id: "event-2" });
    mocks.recordUpdate.mockResolvedValue({ id: "record-2", status: "absent", editReason: EDIT_REASON, markedAt: new Date("2026-09-01T00:00:00.001Z") });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
  });

  it("denies a cross-park attendance edit before writing records", async () => {
    mocks.eventFindUnique.mockResolvedValue(crossParkEvent);
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await PATCH(request(), params);

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "park-admin" }),
      { cityId: "city-2", parkId: "park-2", groupId: "group-2" },
      ["super_admin", "program_admin", "city_head", "park_lead"]
    );
    expect(mocks.recordFindUnique).not.toHaveBeenCalled();
    expect(mocks.recordUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("denies a missing correction capability before reading the record", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await PATCH(request(), params);
    expect(response.status).toBe(403);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
    expect(mocks.recordFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an overly long edit reason before reading the record", async () => {
    const response = await PATCH(request(IF_MATCH, { editReason: "a".repeat(2001) }), params);

    expect(response.status).toBe(400);
    expect(mocks.recordFindUnique).not.toHaveBeenCalled();
  });

  it("corrects a record on a valid scheduled session and preserves the audit history", async () => {
    const response = await PATCH(request(), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      record: { id: "record-2", status: "absent", editReason: EDIT_REASON, markedAt: "2026-09-01T00:00:00.001Z" },
    });
    expect(mocks.eventUpdate).toHaveBeenCalledWith({ where: { id: "event-2" }, data: { updatedAt: expect.any(Date) } });
    expect(mocks.recordUpdate).toHaveBeenCalledWith({
      where: { id: "record-2", markedAt: new Date(IF_MATCH) },
      data: { status: "absent", editReason: EDIT_REASON, markedBy: "staff", markedAt: expect.any(Date) },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "park-admin",
        action: "attendance_edit",
        entityType: "attendance_records",
        entityId: "record-2",
        oldValues: JSON.stringify({ status: "present" }),
        newValues: JSON.stringify({ status: "absent" }),
        reason: EDIT_REASON,
      }),
    });
  });

  it.each([
    ["a non-class weekday inside the batch range", new Date("2026-08-18T00:00:00.000Z")],
    ["a date after the batch end", new Date("2027-06-01T00:00:00.000Z")],
    ["a date before the batch start", new Date("2026-05-01T00:00:00.000Z")],
  ])("rejects a correction on %s before any write", async (_label, eventDate) => {
    mocks.eventFindUnique.mockResolvedValue(withEvent({ eventDate }));

    const response = await PATCH(request(), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "SESSION_NOT_SCHEDULED" });
    expect(mocks.eventUpdate).not.toHaveBeenCalled();
    expect(mocks.recordFindUnique).not.toHaveBeenCalled();
    expect(mocks.recordUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects a correction when the group is inactive before any write", async () => {
    mocks.eventFindUnique.mockResolvedValue(withGroup({ isActive: false }));

    const response = await PATCH(request(), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "GROUP_INACTIVE" });
    expect(mocks.eventUpdate).not.toHaveBeenCalled();
    expect(mocks.recordUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects a correction when the batch is inactive before any write", async () => {
    mocks.eventFindUnique.mockResolvedValue(withGroup({ batch: { ...scheduledEvent.group.batch, isActive: false } }));

    const response = await PATCH(request(), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "BATCH_INACTIVE" });
    expect(mocks.eventUpdate).not.toHaveBeenCalled();
    expect(mocks.recordUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("still rejects a stale correction version on a valid scheduled session", async () => {
    const response = await PATCH(request("2026-08-31T00:00:00.000Z"), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "A newer mark exists. Reload and review the correction.",
    });
    expect(mocks.recordUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
