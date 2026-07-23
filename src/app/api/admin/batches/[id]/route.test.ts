import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  batchFindUnique: vi.fn(),
  batchUpdate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/authorize")>();
  return {
    ...actual,
    requireAuth: mocks.requireAuth,
    requireCapability: mocks.requireCapability,
  };
});
vi.mock("@/lib/db", () => ({
  db: { batch: { findUnique: mocks.batchFindUnique, update: mocks.batchUpdate } },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { DELETE, GET, PATCH } from "./route";

describe("GET /api/admin/batches/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head", role: "city_head", assignedCityId: "city-1" },
    });
    mocks.batchFindUnique.mockResolvedValue({
      id: "batch-2",
      parkId: "park-2",
      cityId: "city-2",
      park: { id: "park-2", city: { id: "city-2" } },
    });
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("returns 403 instead of another city's batch detail", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/batches/batch-2"), {
      params: Promise.resolve({ id: "batch-2" }),
    });

    expect(response.status).toBe(403);
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
  });
});

describe("PATCH & DELETE /api/admin/batches/[id] dynamic authorization", () => {
  const existingSameParkBatch = {
    id: "batch-1",
    name: "Lahore Batch 4",
    parkId: "park-1",
    cityId: "city-1",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-09-30"),
    isActive: true,
    park: { id: "park-1", cityId: "city-1", city: { id: "city-1" } },
  };

  const existingForeignParkBatch = {
    id: "batch-foreign-park",
    name: "Foreign Park Batch",
    parkId: "park-2-same-city",
    cityId: "city-1",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-09-30"),
    isActive: true,
    park: { id: "park-2-same-city", cityId: "city-1", city: { id: "city-1" } },
  };

  const existingForeignCityBatch = {
    id: "batch-foreign-city",
    name: "Karachi Batch 1",
    parkId: "park-3-karachi",
    cityId: "city-2",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-09-30"),
    isActive: true,
    park: { id: "park-3-karachi", cityId: "city-2", city: { id: "city-2" } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
    mocks.batchFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "batch-1") return { ...existingSameParkBatch };
      if (where.id === "batch-foreign-park") return { ...existingForeignParkBatch };
      if (where.id === "batch-foreign-city") return { ...existingForeignCityBatch };
      return null;
    });
    mocks.batchUpdate.mockResolvedValue({ ...existingSameParkBatch });
  });

  it("stops on missing organisation.manage capability -> 403 and no write", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "user-1", role: "park_lead", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/batches/batch-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Updated Batch" }),
      }),
      { params: Promise.resolve({ id: "batch-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.batchFindUnique).not.toHaveBeenCalled();
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });

  it("allows existing City Head to update a batch in their assigned city", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/batches/batch-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Renamed Batch" }),
      }),
      { params: Promise.resolve({ id: "batch-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.batchUpdate).toHaveBeenCalled();
  });

  it("denies City Head updating a batch in a foreign city -> 403 and no write", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/batches/batch-foreign-city", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Attempted Update" }),
      }),
      { params: Promise.resolve({ id: "batch-foreign-city" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });

  it("allows capability-granted Park Lead to mutate a Batch in their assigned park", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/batches/batch-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Park Lead Update" }),
      }),
      { params: Promise.resolve({ id: "batch-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.batchUpdate).toHaveBeenCalled();
  });

  it("denies capability-granted Park Lead updating a batch in a foreign park -> 403 and no write", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/batches/batch-foreign-park", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Attempted Foreign Update" }),
      }),
      { params: Promise.resolve({ id: "batch-foreign-park" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });

  it("derives update scope from stored Batch, ignoring client input", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    // Attempting to update a foreign park batch by sending parkId: "park-1" in client payload
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/batches/batch-foreign-park", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Attempted Fake Scope Update", parkId: "park-1" }),
      }),
      { params: Promise.resolve({ id: "batch-foreign-park" }) }
    );

    // Stored batch belongs to park-2-same-city, so scope check fails with 403 regardless of client input
    expect(response.status).toBe(403);
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });

  it("allows capability-granted Park Lead to deactivate (DELETE) a Batch in assigned park", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/batches/batch-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "batch-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.batchUpdate).toHaveBeenCalledWith({
      where: { id: "batch-1" },
      data: { isActive: false },
    });
  });

  it("denies capability-granted Park Lead deactivating a Batch in a foreign park -> 403 and no write", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/batches/batch-foreign-park", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "batch-foreign-park" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });

  describe("date validation", () => {
    beforeEach(() => {
      mocks.requireAuth.mockResolvedValue({
        user: { id: "city-head", role: "city_head", assignedCityId: "city-1" },
      });
    });

    it("accepts equal startDate and endDate (200)", async () => {
      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/batches/batch-1", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ startDate: "2026-10-01", endDate: "2026-10-01" }),
        }),
        { params: Promise.resolve({ id: "batch-1" }) }
      );

      expect(response.status).toBe(200);
      expect(mocks.batchUpdate).toHaveBeenCalled();
    });

    it("accepts endDate after startDate (200)", async () => {
      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/batches/batch-1", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ startDate: "2026-08-01", endDate: "2026-12-31" }),
        }),
        { params: Promise.resolve({ id: "batch-1" }) }
      );

      expect(response.status).toBe(200);
      expect(mocks.batchUpdate).toHaveBeenCalled();
    });

    it("rejects endDate before startDate with 400 and no database write", async () => {
      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/batches/batch-1", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ startDate: "2026-09-01", endDate: "2026-08-15" }),
        }),
        { params: Promise.resolve({ id: "batch-1" }) }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(mocks.batchUpdate).not.toHaveBeenCalled();
    });

    it("rejects endDate before existing startDate when only endDate is updated", async () => {
      const response = await PATCH(
        new NextRequest("http://localhost/api/admin/batches/batch-1", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endDate: "2026-07-15" }),
        }),
        { params: Promise.resolve({ id: "batch-1" }) }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.endDate).toBeDefined();
      expect(mocks.batchUpdate).not.toHaveBeenCalled();
    });
  });
});
