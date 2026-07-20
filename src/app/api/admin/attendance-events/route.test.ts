import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  eventFindMany: vi.fn(),
  eventCount: vi.fn(),
  participantGroupBy: vi.fn(),
  recordGroupBy: vi.fn(),
  staffFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: { findMany: mocks.eventFindMany, count: mocks.eventCount },
    participant: { groupBy: mocks.participantGroupBy },
    attendanceRecord: { groupBy: mocks.recordGroupBy },
    staffMeta: { findMany: mocks.staffFindMany },
  },
}));

import { GET } from "./route";

describe("GET /api/admin/attendance-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.eventFindMany.mockResolvedValue([]);
    mocks.eventCount.mockResolvedValue(0);
    mocks.participantGroupBy.mockResolvedValue([]);
    mocks.recordGroupBy.mockResolvedValue([]);
    mocks.staffFindMany.mockResolvedValue([]);
  });

  it("requires an allowed administrative role before checking capability", async () => {
    mocks.requireRole.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(new Request("http://localhost/api/admin/attendance-events"));

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).not.toHaveBeenCalled();
    expect(mocks.eventFindMany).not.toHaveBeenCalled();
  });

  it("requires attendance capability before reading events", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(new Request("http://localhost/api/admin/attendance-events"));

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("attendance.mark");
    expect(mocks.eventFindMany).not.toHaveBeenCalled();
  });

  it("denies a city-scoped user with no city assignment", async () => {
    mocks.requireCapability.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: null },
    });

    const response = await GET(new Request("http://localhost/api/admin/attendance-events"));

    expect(response.status).toBe(403);
    expect(mocks.eventFindMany).not.toHaveBeenCalled();
  });

  it("limits a city head event list to the assigned city", async () => {
    const response = await GET(new Request("http://localhost/api/admin/attendance-events"));

    expect(response.status).toBe(200);
    expect(mocks.eventFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        group: { batch: { park: { cityId: "city-1" } } },
      }),
    }));
  });
});
