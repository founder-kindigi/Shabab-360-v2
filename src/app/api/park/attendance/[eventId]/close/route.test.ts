import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  eventFindUnique: vi.fn(),
  eventUpdate: vi.fn(),
  participantFindMany: vi.fn(),
  evaluateAutomaticDropout: vi.fn(),
  staffMetaFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: { findUnique: mocks.eventFindUnique, update: mocks.eventUpdate },
    participant: { findMany: mocks.participantFindMany },
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/attendance/policy-engine", () => ({
  evaluateAutomaticDropout: mocks.evaluateAutomaticDropout,
}));

import { PATCH } from "./route";

describe("PATCH /api/park/attendance/[eventId]/close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-admin", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.eventFindUnique.mockResolvedValue({
      id: "event-2",
      groupId: "group-2",
      isClosed: false,
      group: { batch: { parkId: "park-1" } },
    });
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
    mocks.participantFindMany.mockResolvedValue([]);
    mocks.staffMetaFindUnique.mockResolvedValue({
      id: "staff-1",
      user: { name: "Park Lead" },
    });
  });

  it("passes the Park Lead-only correction policy to the scope checker", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/park/attendance/event-2/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Attendance verified by the Park Lead" }),
      }),
      { params: Promise.resolve({ eventId: "event-2" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "park-admin" }),
      { parkId: "park-1", groupId: "group-2" },
      ["park_lead"]
    );
    expect(mocks.eventUpdate).not.toHaveBeenCalled();
  });

  it("rejects a non-string reason before reading the event", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/park/attendance/event-2/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: true }),
      }),
      { params: Promise.resolve({ eventId: "event-2" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });

  it("evaluates the automatic policy only after a successful close", async () => {
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.eventUpdate.mockResolvedValue({
      id: "event-2",
      isClosed: true,
      closedAt: new Date("2026-08-02T10:00:00.000Z"),
    });
    mocks.participantFindMany.mockResolvedValue([{ id: "participant-1" }]);
    mocks.evaluateAutomaticDropout.mockResolvedValue({ droppedOut: false });

    const response = await PATCH(
      new Request("http://localhost/api/park/attendance/event-2/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Attendance verified by the Park Lead" }),
      }),
      { params: Promise.resolve({ eventId: "event-2" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.evaluateAutomaticDropout).toHaveBeenCalledWith("participant-1");
  });
});
