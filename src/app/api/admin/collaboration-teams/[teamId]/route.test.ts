/**
 * Tests for GET /api/admin/collaboration-teams/[teamId]
 * Covers: capability gate, 404, city-scope allow/deny.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: vi.fn(),
  requireCityScope: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { collaborationTeam: { findUnique: vi.fn() } },
}));

import * as auth from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { GET } from "./route";

const url = (id: string) =>
  `http://localhost/api/admin/collaboration-teams/${id}`;
const params = (teamId: string) => ({ params: Promise.resolve({ teamId }) });

const mockTeam = {
  id: "t1",
  cityId: "city-lhr",
  name: "Sports",
  code: "sports",
  description: null,
  isActive: true,
  createdAt: new Date(),
  city: { id: "city-lhr", name: "Lahore" },
  _count: { memberships: 5 },
};

describe("GET /api/admin/collaboration-teams/[teamId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when capability is missing", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const res = await GET(new NextRequest(url("t1")), params("t1"));

    expect(res.status).toBe(403);
    expect(db.collaborationTeam.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when team does not exist", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(null as any);

    const res = await GET(new NextRequest(url("missing")), params("missing"));

    expect(res.status).toBe(404);
  });

  it("returns 403 when user is outside the team city", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(mockTeam as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(false);

    const res = await GET(new NextRequest(url("t1")), params("t1"));

    expect(res.status).toBe(403);
  });

  it("returns 200 with team and active-member count when in scope", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(mockTeam as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);

    const res = await GET(new NextRequest(url("t1")), params("t1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("t1");
    expect(body._count.memberships).toBe(5);
  });
});
