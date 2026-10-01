import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/auth/events-scope", () => ({
  resolveActorCity: mocks.resolveActorCity,
}));
vi.mock("@/lib/db", () => ({
  db: { callingCampaign: { findMany: mocks.findMany } },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET } from "./route";

describe("GET /api/calling/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({
      user: { id: "staff-1", role: "city_head" },
    });
    mocks.resolveActorCity.mockResolvedValue({ cityId: "city-lahore", isHQ: false });
    mocks.findMany.mockResolvedValue([]);
  });

  it("returns the capability denial before resolving city scope", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/calling/campaigns"));

    expect(response.status).toBe(403);
    expect(mocks.resolveActorCity).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("requires HQ users to provide a cityId", async () => {
    mocks.requireCapability.mockResolvedValue({
      user: { id: "hq-1", role: "super_admin" },
    });
    mocks.resolveActorCity.mockResolvedValue({
      error: "HQ actor must supply a valid cityId",
      status: 400,
    });

    const response = await GET(new NextRequest("http://localhost/api/calling/campaigns"));

    expect(response.status).toBe(400);
    expect(mocks.resolveActorCity).toHaveBeenCalledWith(
      expect.objectContaining({ id: "hq-1" }),
      undefined
    );
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects an unsupported campaign status before querying the database", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/calling/campaigns?status=unknown")
    );

    expect(response.status).toBe(400);
    expect(mocks.resolveActorCity).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("uses server-derived city scope and a bounded query", async () => {
    mocks.findMany.mockResolvedValue([{ id: "campaign-1", cityId: "city-lahore" }]);

    const response = await GET(
      new NextRequest("http://localhost/api/calling/campaigns?status=active")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: "campaign-1", cityId: "city-lahore" },
    ]);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cityId: "city-lahore", status: "active" },
        take: 100,
      })
    );
  });

  it("returns an empty list instead of synthetic campaign data", async () => {
    const response = await GET(new NextRequest("http://localhost/api/calling/campaigns"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });
});
