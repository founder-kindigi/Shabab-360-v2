import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  batchFindUnique: vi.fn(),
  parkFindUnique: vi.fn(),
  groupCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    batch: { findUnique: mocks.batchFindUnique },
    park: { findUnique: mocks.parkFindUnique },
    group: { create: mocks.groupCreate },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST } from "./route";

describe("POST /api/admin/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("denies a Park Lead before loading the batch or park", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead", role: "park_lead", assignedParkId: "park-1" },
    });

    const response = await POST(new NextRequest("http://localhost/api/admin/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Group A", batchId: "batch-1", parkId: "park-1" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.batchFindUnique).not.toHaveBeenCalled();
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
    expect(mocks.groupCreate).not.toHaveBeenCalled();
  });

  it("stops on a missing organisation capability before loading the batch", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "city-head", role: "city_head", assignedCityId: "city-1" } });
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(new NextRequest("http://localhost/api/admin/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Group A", batchId: "batch-1", parkId: "park-1" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.batchFindUnique).not.toHaveBeenCalled();
  });
});
