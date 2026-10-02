import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  parkFindMany: vi.fn(),
  parkFindFirst: vi.fn(),
  parkFindUnique: vi.fn(),
  cityFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({ db: {
  park: { findMany: mocks.parkFindMany, findFirst: mocks.parkFindFirst, findUnique: mocks.parkFindUnique },
  city: { findUnique: mocks.cityFindUnique },
  $transaction: mocks.transaction,
} }));

import { GET, POST } from "./route";

describe("GET /api/admin/parks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "city-head", role: "city_head" } });
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("denies organization access before listing parks", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/parks"));

    expect(response.status).toBe(403);
    expect(mocks.parkFindMany).not.toHaveBeenCalled();
  });

  it("denies a Murabbi the organisation park directory (the observed attendance-entry block)", async () => {
    // The mobile shell loads its park list from this directory route, so a
    // Murabbi without organisation.view gets an empty park list and cannot reach
    // the attendance screen. The scoped contract is /api/park/attendance/parks
    // and the dashboard response, never this directory.
    mocks.requireAuth.mockResolvedValue({ user: { id: "m-1", role: "murabbi", assignedParkId: "park-1" } });
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await GET(new NextRequest("http://localhost/api/admin/parks"));

    expect(response.status).toBe(403);
    expect(mocks.parkFindMany).not.toHaveBeenCalled();
    expect(mocks.parkFindUnique).not.toHaveBeenCalled();
  });

  it("requires an explicit city for an HQ park creation", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "hq", role: "program_admin" } });
    const response = await POST(new NextRequest("http://localhost/api/admin/parks", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "North Park" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.cityFindUnique).not.toHaveBeenCalled();
  });

  it("denies an unassigned City Head before looking up a city", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "city-head", role: "city_head" } });
    const response = await POST(new NextRequest("http://localhost/api/admin/parks", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "North Park" }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.cityFindUnique).not.toHaveBeenCalled();
  });

  it("uses the assigned city rather than a City Head supplied city", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "city-head", role: "city_head", assignedCityId: "clh0000000000000000000001" } });
    mocks.cityFindUnique.mockResolvedValue({ id: "clh0000000000000000000001", isActive: true });
    mocks.parkFindFirst.mockResolvedValue(null);
    const created = { id: "park-1", name: "North Park", cityId: "clh0000000000000000000001" };
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({ park: { create: vi.fn().mockResolvedValue(created) }, auditLog: { create: vi.fn() } }));
    const response = await POST(new NextRequest("http://localhost/api/admin/parks", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "North Park", cityId: "clh0000000000000000000002" }),
    }));
    expect(response.status).toBe(201);
    expect(mocks.cityFindUnique).toHaveBeenCalledWith({ where: { id: "clh0000000000000000000001" }, select: { id: true, isActive: true } });
  });
});
