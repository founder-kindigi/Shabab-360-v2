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

describe("attendance close and automatic dropout", () => {
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

  it("atomically closes the event, drops a three-week absentee, and audits both", async () => {
    const dates = ["2026-08-01", "2026-08-02", "2026-08-08", "2026-08-09", "2026-08-15", "2026-08-16"];
    const closedEvents = dates.map((date, index) => ({ id: `event-${index}`, eventDate: new Date(`${date}T00:00:00.000Z`) }));
    const tx = {
      attendanceEvent: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue(closedEvents),
      },
      participant: {
        findMany: vi.fn().mockResolvedValue([{ id: "participant-1", state: "active" }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      attendanceRecord: {
        findMany: vi.fn().mockResolvedValue(closedEvents.map((event) => ({ participantId: "participant-1", eventId: event.id, status: "absent" }))),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const response = await PATCH(request({ reason: "Weekly register complete" }), { params: Promise.resolve({ eventId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ automaticDropouts: 1 });
    expect(tx.participant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "dropout", dropoutSource: "automatic" }) }));
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it("does not drop a participant when one expected mark is missing", async () => {
    const closedEvents = ["2026-08-01", "2026-08-02", "2026-08-08", "2026-08-09", "2026-08-15", "2026-08-16"]
      .map((date, index) => ({ id: `event-${index}`, eventDate: new Date(`${date}T00:00:00.000Z`) }));
    const tx = {
      attendanceEvent: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findMany: vi.fn().mockResolvedValue(closedEvents) },
      participant: { findMany: vi.fn().mockResolvedValue([{ id: "participant-1", state: "active" }]), updateMany: vi.fn() },
      attendanceRecord: { findMany: vi.fn().mockResolvedValue(closedEvents.slice(1).map((event) => ({ participantId: "participant-1", eventId: event.id, status: "absent" }))) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    expect((await PATCH(request({ reason: "Weekly register complete" }), { params: Promise.resolve({ eventId }) })).status).toBe(200);
    expect(tx.participant.updateMany).not.toHaveBeenCalled();
  });
});
