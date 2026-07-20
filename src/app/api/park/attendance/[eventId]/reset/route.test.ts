import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  eventFindUnique: vi.fn(),
  recordCount: vi.fn(),
  recordDeleteMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: { findUnique: mocks.eventFindUnique },
    attendanceRecord: {
      count: mocks.recordCount,
      deleteMany: mocks.recordDeleteMany,
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { DELETE } from "./route";

describe("DELETE /api/park/attendance/[eventId]/reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead", role: "park_lead", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.eventFindUnique.mockResolvedValue({
      id: "event-2",
      groupId: "group-2",
      isClosed: false,
      group: { batch: { parkId: "park-2" } },
    });
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  });

  it("denies a cross-park reset before it counts or deletes attendance records", async () => {
    const response = await DELETE(new Request("http://localhost/api/park/attendance/event-2/reset", {
      method: "DELETE",
    }), { params: Promise.resolve({ eventId: "event-2" }) });

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "park-lead" }),
      { parkId: "park-2", groupId: "group-2" },
      ["park_admin", "park_lead"]
    );
    expect(mocks.recordCount).not.toHaveBeenCalled();
    expect(mocks.recordDeleteMany).not.toHaveBeenCalled();
  });

  it("denies a missing correction capability before reading the event", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await DELETE(new Request("http://localhost/api/park/attendance/event-2/reset", { method: "DELETE" }), { params: Promise.resolve({ eventId: "event-2" }) });
    expect(response.status).toBe(403);
    expect(mocks.eventFindUnique).not.toHaveBeenCalled();
  });
});
