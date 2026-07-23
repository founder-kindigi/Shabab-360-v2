import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  parkFindUnique: vi.fn(),
  batchCreate: vi.fn(),
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
  db: {
    park: { findUnique: mocks.parkFindUnique },
    batch: { create: mocks.batchCreate },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST } from "./route";

describe("POST /api/admin/batches dynamic authorization & real scope boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
    mocks.parkFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "park-1") {
        return { id: "park-1", cityId: "city-1", isActive: true, city: { id: "city-1", name: "Lahore" } };
      }
      if (where.id === "park-2-foreign-city") {
        return { id: "park-2-foreign-city", cityId: "city-2", isActive: true, city: { id: "city-2", name: "Karachi" } };
      }
      if (where.id === "park-1-same-city-foreign-park") {
        return { id: "park-1-same-city-foreign-park", cityId: "city-1", isActive: true, city: { id: "city-1", name: "Lahore" } };
      }
      return null;
    });
    mocks.batchCreate.mockResolvedValue({
      id: "batch-new",
      name: "New Batch",
      parkId: "park-1",
      cityId: "city-1",
      startDate: new Date("2026-08-01"),
      endDate: null,
    });
  });

  it("stops on missing organisation.manage capability -> 403 and no write", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "user-1", role: "park_lead", assignedParkId: "park-1" },
    });
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(
      new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Batch 5", parkId: "park-1", startDate: "2026-08-01" }),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
    expect(mocks.batchCreate).not.toHaveBeenCalled();
  });

  it("allows existing City Head to create batch for a same-city park", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Batch 5", parkId: "park-1", startDate: "2026-08-01" }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.parkFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "park-1", isActive: true } }));
    expect(mocks.batchCreate).toHaveBeenCalled();
  });

  it("denies City Head creating a batch in a foreign-city park -> 403 and no write", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: "city-1" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Foreign Batch", parkId: "park-2-foreign-city", startDate: "2026-08-01" }),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.parkFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "park-2-foreign-city", isActive: true } }));
    expect(mocks.batchCreate).not.toHaveBeenCalled();
  });

  it("allows dynamically capability-granted Park Lead to mutate a Batch in assigned park", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Batch 5", parkId: "park-1", startDate: "2026-08-01" }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.batchCreate).toHaveBeenCalled();
  });

  it("denies capability-granted Park Lead creating a batch in a same-city foreign park -> 403 and no write", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Foreign Park Batch", parkId: "park-1-same-city-foreign-park", startDate: "2026-08-01" }),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.batchCreate).not.toHaveBeenCalled();
  });

  it("denies capability-granted Park Lead creating a batch in a foreign-city park -> 403 and no write", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Foreign City Batch", parkId: "park-2-foreign-city", startDate: "2026-08-01" }),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.batchCreate).not.toHaveBeenCalled();
  });

  it("denies capability-granted Murabbi creating a batch -> 403 and no write (batch is not group-scoped)", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "murabbi-1", role: "murabbi", assignedGroupId: "group-1" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Murabbi Batch", parkId: "park-1", startDate: "2026-08-01" }),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.batchCreate).not.toHaveBeenCalled();
  });

  it("uses target park for scope enforcement on create route", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-lead-1", role: "park_lead", assignedParkId: "park-1" },
    });

    await POST(
      new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Target Park Batch", parkId: "park-1", startDate: "2026-08-01" }),
      })
    );

    expect(mocks.parkFindUnique).toHaveBeenCalledWith({
      where: { id: "park-1", isActive: true },
      include: { city: true },
    });
  });

  describe("date validation", () => {
    beforeEach(() => {
      mocks.requireAuth.mockResolvedValue({
        user: { id: "city-head", role: "city_head", assignedCityId: "city-1" },
      });
    });

    it("accepts equal startDate and endDate (201)", async () => {
      const response = await POST(
        new NextRequest("http://localhost/api/admin/batches", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Same Day Batch",
            parkId: "park-1",
            startDate: "2026-08-01",
            endDate: "2026-08-01",
          }),
        })
      );

      expect(response.status).toBe(201);
      expect(mocks.batchCreate).toHaveBeenCalled();
    });

    it("accepts endDate after startDate (201)", async () => {
      const response = await POST(
        new NextRequest("http://localhost/api/admin/batches", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Normal Batch",
            parkId: "park-1",
            startDate: "2026-08-01",
            endDate: "2026-09-15",
          }),
        })
      );

      expect(response.status).toBe(201);
      expect(mocks.batchCreate).toHaveBeenCalled();
    });

    it("rejects endDate before startDate with 400 and no database write", async () => {
      const response = await POST(
        new NextRequest("http://localhost/api/admin/batches", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Invalid Batch",
            parkId: "park-1",
            startDate: "2026-09-01",
            endDate: "2026-08-15",
          }),
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(mocks.batchCreate).not.toHaveBeenCalled();
    });
  });
});
