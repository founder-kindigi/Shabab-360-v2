/**
 * Tests for GET /api/admin/collaboration-teams
 * Covers: capability gate, HQ unrestricted, scoped-city allow/deny,
 * foreign-city 403, no-city 403, pagination, status filter.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: vi.fn(),
  requireCityScope: vi.fn().mockReturnValue(true),
  isHqRole: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import * as auth from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { GET } from "./route";

const BASE = "http://localhost/api/admin/collaboration-teams";

describe("GET /api/admin/collaboration-teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.collaborationTeam.findMany).mockResolvedValue([] as any);
    vi.mocked(db.collaborationTeam.count).mockResolvedValue(0);
  });

  it("returns 403 when organisation.manage capability is missing", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const res = await GET(new NextRequest(BASE));

    expect(res.status).toBe(403);
    expect(db.collaborationTeam.findMany).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid pageSize", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(auth.isHqRole).mockReturnValue(true);

    const res = await GET(new NextRequest(`${BASE}?pageSize=9999`));

    expect(res.status).toBe(400);
    expect(db.collaborationTeam.findMany).not.toHaveBeenCalled();
  });

  it("HQ user lists all cities when no cityId supplied", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(auth.isHqRole).mockReturnValue(true);

    const res = await GET(new NextRequest(BASE));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ total: 0, page: 1, pageSize: 20 });
    // No cityId constraint in the where clause
    const callWhere = vi.mocked(db.collaborationTeam.findMany).mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty("cityId");
  });

  it("HQ user narrows to supplied cityId", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(auth.isHqRole).mockReturnValue(true);

    await GET(new NextRequest(`${BASE}?cityId=city-lhr`));

    const callWhere = vi.mocked(db.collaborationTeam.findMany).mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ cityId: "city-lhr" });
  });

  it("city_head sees only their assigned city when no cityId supplied", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any
    );
    vi.mocked(auth.isHqRole).mockReturnValue(false);

    await GET(new NextRequest(BASE));

    const callWhere = vi.mocked(db.collaborationTeam.findMany).mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ cityId: "city-lhr" });
  });

  it("returns 403 when city_head supplies a foreign cityId", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any
    );
    vi.mocked(auth.isHqRole).mockReturnValue(false);

    const res = await GET(new NextRequest(`${BASE}?cityId=city-khi`));

    expect(res.status).toBe(403);
    expect(db.collaborationTeam.findMany).not.toHaveBeenCalled();
  });

  it("returns 403 when scoped user has no assignedCityId", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u3", role: "city_head", assignedCityId: null } } as any
    );
    vi.mocked(auth.isHqRole).mockReturnValue(false);

    const res = await GET(new NextRequest(BASE));

    expect(res.status).toBe(403);
    expect(db.collaborationTeam.findMany).not.toHaveBeenCalled();
  });

  it("applies isActive=false when status=inactive", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(auth.isHqRole).mockReturnValue(true);

    await GET(new NextRequest(`${BASE}?status=inactive`));

    const callWhere = vi.mocked(db.collaborationTeam.findMany).mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ isActive: false });
  });

  it("omits isActive when status=all", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(auth.isHqRole).mockReturnValue(true);

    await GET(new NextRequest(`${BASE}?status=all`));

    const callWhere = vi.mocked(db.collaborationTeam.findMany).mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty("isActive");
  });
});
