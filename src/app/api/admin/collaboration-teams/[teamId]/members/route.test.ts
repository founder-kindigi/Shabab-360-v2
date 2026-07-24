/**
 * Tests for GET & POST /api/admin/collaboration-teams/[teamId]/members
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: vi.fn(),
  requireCityScope: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: { findUnique: vi.fn() },
    staffMeta: { findUnique: vi.fn() },
    staffTeamMembership: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import * as auth from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { GET, POST } from "./route";

const url = (id: string) => `http://localhost/api/admin/collaboration-teams/${id}/members`;
const params = (id: string) => ({ params: Promise.resolve({ teamId: id }) });

const TEAM = { id: "t1", cityId: "city-lhr" };
const STAFF = {
  id: "sm1",
  isActive: true,
  assignedCityId: "city-lhr",
  assignedPark: null,
  assignedGroup: null,
};
const MEMBERSHIP = {
  id: "mem1",
  teamId: "t1",
  staffMetaId: "sm1",
  title: "Captain",
  startedAt: new Date(),
  isActive: true,
};

describe("GET /api/admin/collaboration-teams/[teamId]/members", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when capability is missing", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const res = await GET(new NextRequest(url("t1")), params("t1"));

    expect(res.status).toBe(403);
  });

  it("returns 404 when team does not exist", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(null as any);

    const res = await GET(new NextRequest(url("missing")), params("missing"));

    expect(res.status).toBe(404);
  });

  it("returns 403 when user is outside team city", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(false);

    const res = await GET(new NextRequest(url("t1")), params("t1"));

    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid query params", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);

    const res = await GET(new NextRequest(`${url("t1")}?pageSize=9999`), params("t1"));

    expect(res.status).toBe(400);
  });

  it("returns paginated members list with default active filter", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);
    vi.mocked(db.staffTeamMembership.findMany).mockResolvedValue([MEMBERSHIP] as any);
    vi.mocked(db.staffTeamMembership.count).mockResolvedValue(1);

    const res = await GET(new NextRequest(url("t1")), params("t1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ total: 1, page: 1 });
    expect(body.data).toHaveLength(1);
    const findManyCall = vi.mocked(db.staffTeamMembership.findMany).mock.calls[0]?.[0];
    expect(findManyCall?.where).toMatchObject({ isActive: true });
  });

  it("omits isActive filter when status=all", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);

    await GET(new NextRequest(`${url("t1")}?status=all`), params("t1"));

    const findManyCall = vi.mocked(db.staffTeamMembership.findMany).mock.calls[0]?.[0];
    expect(findManyCall?.where).not.toHaveProperty("isActive");
  });
});

describe("POST /api/admin/collaboration-teams/[teamId]/members", () => {
  beforeEach(() => vi.clearAllMocks());

  const postReq = (teamId: string, body: unknown) =>
    new NextRequest(url(teamId), {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

  it("returns 403 when capability is missing", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const res = await POST(postReq("t1", { staffMetaId: "sm1" }), params("t1"));

    expect(res.status).toBe(403);
  });

  it("returns 400 on malformed JSON body", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );

    const res = await POST(
      new NextRequest(url("t1"), { method: "POST", body: "{{invalid" }),
      params("t1")
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid JSON");
  });

  it("returns 400 when staffMetaId is missing", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );

    const res = await POST(postReq("t1", {}), params("t1"));

    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too long", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );

    const res = await POST(
      postReq("t1", { staffMetaId: "sm1", title: "x".repeat(121) }),
      params("t1")
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when team does not exist", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(null as any);
    vi.mocked(db.staffMeta.findUnique).mockResolvedValue(STAFF as any);

    const res = await POST(postReq("missing", { staffMetaId: "sm1" }), params("missing"));

    expect(res.status).toBe(404);
  });

  it("returns 403 when user is outside team city", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(db.staffMeta.findUnique).mockResolvedValue(STAFF as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(false);

    const res = await POST(postReq("t1", { staffMetaId: "sm1" }), params("t1"));

    expect(res.status).toBe(403);
  });

  it("returns 404 when staff member is not found", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(db.staffMeta.findUnique).mockResolvedValue(null as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);

    const res = await POST(postReq("t1", { staffMetaId: "sm-missing" }), params("t1"));

    expect(res.status).toBe(404);
  });

  it("returns 400 when staff belongs to a different city (cross-city)", async () => {
    const crossCityStaff = { ...STAFF, assignedCityId: "city-khi" };
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(db.staffMeta.findUnique).mockResolvedValue(crossCityStaff as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);

    const res = await POST(postReq("t1", { staffMetaId: "sm1" }), params("t1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("city");
  });

  it("returns 409 when staff is already an active member", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(db.staffMeta.findUnique).mockResolvedValue(STAFF as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue({ id: "existing-mem" } as any);

    const res = await POST(postReq("t1", { staffMetaId: "sm1" }), params("t1"));

    expect(res.status).toBe(409);
  });

  it("creates membership and returns 201 for valid request", async () => {
    vi.mocked(auth.requireCapability).mockResolvedValue(
      { user: { id: "u1", role: "super_admin" } } as any
    );
    vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
    vi.mocked(db.staffMeta.findUnique).mockResolvedValue(STAFF as any);
    vi.mocked(auth.requireCityScope).mockReturnValue(true);
    vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue(null);
    vi.mocked(db.staffTeamMembership.create).mockResolvedValue(MEMBERSHIP as any);

    const res = await POST(
      postReq("t1", { staffMetaId: "sm1", title: "Captain" }),
      params("t1")
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("mem1");
  });
});
