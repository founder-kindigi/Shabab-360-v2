import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  parkFindMany: vi.fn(),
  parkFindUnique: vi.fn(),
  groupFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ATTENDANCE_ROLES: ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"],
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    park: { findMany: mocks.parkFindMany, findUnique: mocks.parkFindUnique },
    group: { findUnique: mocks.groupFindUnique },
  },
}));

import { GET } from "./route";

describe("GET /api/park/attendance/parks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only a City Head's assigned-city parks", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.parkFindMany.mockResolvedValue([{ id: "park-1", name: "Gulberg" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "park-1", name: "Gulberg" }]);
    expect(mocks.parkFindMany).toHaveBeenCalledWith({
      where: { cityId: "city-1", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  });

  it("fails closed when a City Head has no assigned city", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "city-head-1", role: "city_head" } });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.parkFindMany).not.toHaveBeenCalled();
  });

  it("returns the authentication denial response without querying parks", async () => {
    mocks.requireAuth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.parkFindMany).not.toHaveBeenCalled();
  });
});
