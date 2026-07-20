import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  groupFindUnique: vi.fn(),
  groupUpdate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ORGANIZATION_MANAGEMENT_ROLES: ["super_admin", "program_admin", "city_head", "park_admin", "park_lead"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: { group: { findUnique: mocks.groupFindUnique, update: mocks.groupUpdate } },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { PATCH } from "./route";

describe("PATCH /api/admin/groups/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-admin", role: "park_admin", assignedParkId: "park-1" },
    });
    mocks.groupFindUnique.mockResolvedValue({
      id: "group-2",
      name: "Group 2",
      isActive: true,
      batchId: "batch-2",
      batch: { parkId: "park-2", park: { cityId: "city-2" } },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  });

  it("denies a cross-park mutation before the group can be updated", async () => {
    const response = await PATCH(new NextRequest("http://localhost/api/admin/groups/group-2", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed group" }),
    }), { params: Promise.resolve({ id: "group-2" }) });

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "park-admin" }),
      { cityId: "city-2", parkId: "park-2", groupId: "group-2" },
      expect.any(Array)
    );
    expect(mocks.groupUpdate).not.toHaveBeenCalled();
  });

  it("denies organization access before loading a group", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await PATCH(new NextRequest("http://localhost/api/admin/groups/group-2", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed group" }),
    }), { params: Promise.resolve({ id: "group-2" }) });

    expect(response.status).toBe(403);
    expect(mocks.groupFindUnique).not.toHaveBeenCalled();
    expect(mocks.requireResourceScope).not.toHaveBeenCalled();
    expect(mocks.groupUpdate).not.toHaveBeenCalled();
  });
});
