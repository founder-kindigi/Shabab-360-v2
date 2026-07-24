import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  teamFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/auth/team-scope", () => ({
  resolveActorCity: mocks.resolveActorCity,
}));
vi.mock("@/lib/db", () => ({
  db: { collaborationTeam: { findMany: mocks.teamFindMany } },
}));

import { GET } from "./route";

describe("GET /api/admin/collaboration-teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: { id: "super-admin", role: "super_admin" } });
    mocks.resolveActorCity.mockResolvedValue({ success: true, cityId: "city-lhr" });
  });

  it("denies callers without teams.memberships.manage capability", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/collaboration-teams"));
    expect(response.status).toBe(403);
    expect(mocks.teamFindMany).not.toHaveBeenCalled();
  });

  it("applies a validated city filter with status=active", async () => {
    mocks.teamFindMany.mockResolvedValue([]);
    const response = await GET(new NextRequest("http://localhost/api/admin/collaboration-teams?cityId=city-lhr&status=active"));
    expect(response.status).toBe(200);
    expect(mocks.teamFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { cityId: "city-lhr", isActive: true },
    }));
  });
});
