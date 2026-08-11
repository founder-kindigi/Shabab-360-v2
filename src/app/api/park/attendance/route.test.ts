import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  groupFindUnique: vi.fn(),
  groupFindMany: vi.fn(),
  parkFindUnique: vi.fn(),
  batchFindMany: vi.fn(),
  attendanceEventFindMany: vi.fn(),
  participantGroupBy: vi.fn(),
  staffMetaFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    group: { findUnique: mocks.groupFindUnique, findMany: mocks.groupFindMany },
    park: { findUnique: mocks.parkFindUnique },
    batch: { findMany: mocks.batchFindMany },
    attendanceEvent: { findFirst: vi.fn(), create: vi.fn(), findMany: mocks.attendanceEventFindMany },
    participant: { groupBy: mocks.participantGroupBy },
    staffMeta: { findMany: mocks.staffMetaFindMany },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET, POST } from "./route";

describe("POST /api/park/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "staff-user-1", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(null);
  });

  it("allows a City Head to list an assigned-city park and includes city scope", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.parkFindUnique.mockResolvedValue({ id: "park-1", cityId: "city-1" });
    mocks.batchFindMany.mockResolvedValue([]);
    mocks.groupFindMany.mockResolvedValue([]);
    mocks.attendanceEventFindMany.mockResolvedValue([]);
    mocks.participantGroupBy.mockResolvedValue([]);
    mocks.staffMetaFindMany.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/park/attendance?parkId=park-1&date=2026-08-11"));

    expect(response.status).toBe(200);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ role: "city_head" }),
      { parkId: "park-1", cityId: "city-1" },
      expect.any(Array)
    );
  });

  it("returns 400 for invalid eventDate before querying group scope", async () => {
    const response = await POST(
      new Request("http://localhost/api/park/attendance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId: "ckggggggggggggggggggggggg",
          title: "Weekly Session",
          eventDate: "not-a-date",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
  });

  it("denies attendance mark capability before parsing request body", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(
      new Request("http://localhost/api/park/attendance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
  });
});
