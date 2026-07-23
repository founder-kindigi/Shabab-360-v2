import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  batchFindUnique: vi.fn(),
  batchUpdate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  ORGANIZATION_MANAGEMENT_ROLES: ["super_admin", "program_admin", "city_head", "park_admin", "park_lead"],
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: { batch: { findUnique: mocks.batchFindUnique, update: mocks.batchUpdate } },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET, PATCH } from "./route";

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
      { cityId: "city-2" }
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

  it("denies a Park Lead batch mutation before loading the batch", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead", role: "park_lead", assignedParkId: "park-2" },
    });

    const response = await PATCH(new NextRequest("http://localhost/api/admin/batches/batch-2", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed batch" }),
    }), { params: Promise.resolve({ id: "batch-2" }) });

    expect(response.status).toBe(403);
    expect(mocks.batchFindUnique).not.toHaveBeenCalled();
    expect(mocks.requireResourceScope).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/batches/[id] date validation", () => {
  const existingBatch = {
    id: "batch-1",
    name: "Lahore Batch 4",
    parkId: "park-1",
    cityId: "city-1",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-09-30"),
    isActive: true,
    park: { id: "park-1", cityId: "city-1", city: { id: "city-1" } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.batchFindUnique.mockResolvedValue({ ...existingBatch });
    mocks.batchUpdate.mockResolvedValue({ ...existingBatch });
  });

  it("accepts equal startDate and endDate (200)", async () => {
    const response = await PATCH(new NextRequest("http://localhost/api/admin/batches/batch-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startDate: "2026-10-01", endDate: "2026-10-01" }),
    }), { params: Promise.resolve({ id: "batch-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.batchUpdate).toHaveBeenCalled();
  });

  it("accepts endDate after startDate (200)", async () => {
    const response = await PATCH(new NextRequest("http://localhost/api/admin/batches/batch-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startDate: "2026-08-01", endDate: "2026-12-31" }),
    }), { params: Promise.resolve({ id: "batch-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.batchUpdate).toHaveBeenCalled();
  });

  it("rejects endDate before startDate with 400 and no database write", async () => {
    const response = await PATCH(new NextRequest("http://localhost/api/admin/batches/batch-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startDate: "2026-09-01", endDate: "2026-08-15" }),
    }), { params: Promise.resolve({ id: "batch-1" }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });

  it("rejects endDate before existing startDate when only endDate is updated", async () => {
    const response = await PATCH(new NextRequest("http://localhost/api/admin/batches/batch-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endDate: "2026-07-15" }),
    }), { params: Promise.resolve({ id: "batch-1" }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.endDate).toBeDefined();
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });
});
