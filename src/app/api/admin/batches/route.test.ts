import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  parkFindUnique: vi.fn(),
  batchCreate: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    park: { findUnique: mocks.parkFindUnique },
    batch: { create: mocks.batchCreate },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST } from "./route";

describe("POST /api/admin/batches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("denies a Park Admin before parsing or loading the compatibility anchor", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "park-admin", role: "park_admin", assignedParkId: "park-1" },
    });

    const response = await POST(new NextRequest("http://localhost/api/admin/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Batch 5", parkId: "park-1", startDate: "2026-08-01" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
    expect(mocks.batchCreate).not.toHaveBeenCalled();
  });

  it("stops on a missing organisation capability before loading a park", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "city-head", role: "city_head", assignedCityId: "city-1" } });
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(new NextRequest("http://localhost/api/admin/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Batch 5", parkId: "park-1", startDate: "2026-08-01" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
  });

  describe("date validation", () => {
    beforeEach(() => {
      mocks.requireAuth.mockResolvedValue({
        user: { id: "city-head", role: "city_head", assignedCityId: "city-1" },
      });
      mocks.parkFindUnique.mockResolvedValue({
        id: "park-1",
        cityId: "city-1",
        isActive: true,
        city: { id: "city-1", name: "Lahore" },
      });
      mocks.batchCreate.mockResolvedValue({
        id: "batch-new",
        name: "Valid Batch",
        parkId: "park-1",
        cityId: "city-1",
        startDate: new Date("2026-08-01"),
        endDate: null,
      });
    });

    it("accepts equal startDate and endDate (201)", async () => {
      const response = await POST(new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Same Day Batch",
          parkId: "park-1",
          startDate: "2026-08-01",
          endDate: "2026-08-01",
        }),
      }));

      expect(response.status).toBe(201);
      expect(mocks.batchCreate).toHaveBeenCalled();
    });

    it("accepts endDate after startDate (201)", async () => {
      const response = await POST(new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Normal Batch",
          parkId: "park-1",
          startDate: "2026-08-01",
          endDate: "2026-09-15",
        }),
      }));

      expect(response.status).toBe(201);
      expect(mocks.batchCreate).toHaveBeenCalled();
    });

    it("rejects endDate before startDate with 400 and no database write", async () => {
      const response = await POST(new NextRequest("http://localhost/api/admin/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Invalid Batch",
          parkId: "park-1",
          startDate: "2026-09-01",
          endDate: "2026-08-15",
        }),
      }));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(mocks.batchCreate).not.toHaveBeenCalled();
      expect(mocks.parkFindUnique).not.toHaveBeenCalled();
    });
  });
});
