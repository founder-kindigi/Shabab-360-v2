import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  batchFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ORGANIZATION_MANAGEMENT_ROLES: ["super_admin", "program_admin", "city_head", "park_admin", "park_lead"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: { batch: { findUnique: mocks.batchFindUnique } },
}));

import { GET } from "./route";

describe("GET /api/admin/batches/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.batchFindUnique.mockResolvedValue({
      id: "batch-2",
      parkId: "park-2",
      park: { city: { id: "city-2" } },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  });

  it("returns 403 instead of another city's batch detail", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/batches/batch-2"), {
      params: Promise.resolve({ id: "batch-2" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "city-head" }),
      { cityId: "city-2", parkId: "park-2" },
      expect.any(Array)
    );
  });

  it("denies organization access before loading a batch", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/batches/batch-2"), {
      params: Promise.resolve({ id: "batch-2" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.batchFindUnique).not.toHaveBeenCalled();
    expect(mocks.requireResourceScope).not.toHaveBeenCalled();
  });
});
