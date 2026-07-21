import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  db: {
    group: { findUnique: vi.fn(), findMany: vi.fn() },
    batch: { findMany: vi.fn() },
    park: { findUnique: vi.fn() },
    attendanceEvent: { findMany: vi.fn(), groupBy: vi.fn() },
    participant: { groupBy: vi.fn(), findMany: vi.fn() },
    staffMeta: { findMany: vi.fn() },
    attendanceRecord: { findMany: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { GET } from "./route";

describe("GET /api/park/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("denies unauthorized roles", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "city_head", assignedCityId: "city-1" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("includes active events with 0 marked attendance in needsAttention warnings", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "pl-1", role: "park_lead", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);

    mocks.db.batch.findMany.mockResolvedValue([{ id: "b-1" }]);
    mocks.db.group.findMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batchId: "b-1" }]);
    mocks.db.park.findUnique.mockResolvedValue({ id: "park-1", name: "State Life Park", city: { name: "Lahore" } });

    const mockDate = new Date();
    mocks.db.attendanceEvent.findMany.mockImplementation(async (query?: any) => {
      // If query is for unclosed yesterday events, return empty
      if (query?.where?.eventDate?.lt) return [];
      return [
        {
          id: "e-1",
          title: "Session 1",
          groupId: "g-1",
          eventDate: mockDate,
          isClosed: false,
          closedBy: null,
          closedAt: null,
          group: { name: "Group 1" },
          _count: { records: 0 },
          records: [],
        },
      ];
    });
    mocks.db.attendanceEvent.groupBy.mockResolvedValue([]);
    mocks.db.participant.groupBy.mockResolvedValue([{ groupId: "g-1", _count: 20 }]);
    mocks.db.participant.findMany.mockResolvedValue([]);
    mocks.db.staffMeta.findMany.mockResolvedValue([]);
    mocks.db.attendanceRecord.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    const lowAtt = data.needsAttention.find((item: any) => item.type === "low_attendance");
    expect(lowAtt).toBeDefined();
    expect(lowAtt.groupName).toBe("Group 1");
    expect(lowAtt.rate).toBe(0);
  });
});
