/**
 * Tests for canonical /api/admin/teams/** membership endpoints.
 *
 * Covers: capability gate (teams.memberships.manage), HQ city-scope rules,
 * scoped-actor foreign-city 403, missing cityId handling, duplicate 409,
 * cross-city staff 400, audit logging, soft-deactivation.
 *
 * This is the canonical route surface used by the admin UI. The parallel
 * /api/admin/collaboration-teams/** tests cover the same authorization
 * rules on the duplicate route set.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as getTeams } from "./route";
import { GET as getTeamById } from "./[id]/route";
import { GET as getTeamMembers, POST as addTeamMember } from "./[id]/members/route";
import { DELETE as revokeTeamMember } from "./members/[membershipId]/route";

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: vi.fn(),
  requireCityScope: vi.fn(),
  isHqRole: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    staffTeamMembership: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    staffMeta: { findUnique: vi.fn() },
  },
}));

import * as auth from "@/lib/auth/authorize";
import { db } from "@/lib/db";

const TEAM = { id: "t1", cityId: "city-lhr", name: "Sports", code: "sports", description: null, isActive: true, createdAt: "2026-07-28T09:56:22.704Z", city: { id: "city-lhr", name: "Lahore" }, _count: { memberships: 5 } };
const STAFF = { id: "sm1", isActive: true, assignedCityId: "city-lhr", assignedPark: null, assignedGroup: null };
const MEMBERSHIP = { id: "mem1", teamId: "t1", staffMetaId: "sm1", title: "Captain", startedAt: "2026-07-28T09:56:22.704Z", isActive: true };
const ACTIVE_MEM = { id: "mem1", teamId: "t1", staffMetaId: "sm1", title: "Captain", isActive: true, endedAt: null, team: { cityId: "city-lhr" } };

describe("TEAM-004: Canonical /api/admin/teams/** membership API", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── 1. GET /api/admin/teams (List Teams) ──────────────────────────

  describe("GET /api/admin/teams", () => {
    it("returns 403 when teams.memberships.manage capability is missing", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
      const res = await getTeams(new NextRequest("http://localhost/api/admin/teams"));
      expect(res.status).toBe(403);
      expect(db.collaborationTeam.findMany).not.toHaveBeenCalled();
    });

    it("HQ user lists all cities when no cityId supplied", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(auth.isHqRole).mockReturnValue(true);
      vi.mocked(db.collaborationTeam.findMany).mockResolvedValue([] as any);
      vi.mocked(db.collaborationTeam.count).mockResolvedValue(0);

      const res = await getTeams(new NextRequest("http://localhost/api/admin/teams"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ total: 0, page: 1, pageSize: 20 });
    });

    it("HQ user narrows to supplied cityId", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(auth.isHqRole).mockReturnValue(true);
      vi.mocked(db.collaborationTeam.findMany).mockResolvedValue([] as any);
      vi.mocked(db.collaborationTeam.count).mockResolvedValue(0);

      await getTeams(new NextRequest("http://localhost/api/admin/teams?cityId=city-lhr"));
      expect(vi.mocked(db.collaborationTeam.findMany).mock.calls[0]?.[0]?.where).toMatchObject({ cityId: "city-lhr" });
    });

    it("city_head auto-scoped when no cityId supplied", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any);
      vi.mocked(auth.isHqRole).mockReturnValue(false);
      vi.mocked(db.collaborationTeam.findMany).mockResolvedValue([] as any);
      vi.mocked(db.collaborationTeam.count).mockResolvedValue(0);

      await getTeams(new NextRequest("http://localhost/api/admin/teams"));
      expect(vi.mocked(db.collaborationTeam.findMany).mock.calls[0]?.[0]?.where).toMatchObject({ cityId: "city-lhr" });
    });

    it("returns 403 when city_head supplies a foreign cityId", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any);
      vi.mocked(auth.isHqRole).mockReturnValue(false);

      const res = await getTeams(new NextRequest("http://localhost/api/admin/teams?cityId=city-khi"));
      expect(res.status).toBe(403);
    });

    it("returns 403 when scoped user has no assignedCityId", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u3", role: "city_head", assignedCityId: null } } as any);
      vi.mocked(auth.isHqRole).mockReturnValue(false);

      const res = await getTeams(new NextRequest("http://localhost/api/admin/teams"));
      expect(res.status).toBe(403);
    });

    it("returns paginated response", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(auth.isHqRole).mockReturnValue(true);
      vi.mocked(db.collaborationTeam.findMany).mockResolvedValue([TEAM] as any);
      vi.mocked(db.collaborationTeam.count).mockResolvedValue(1);

      const res = await getTeams(new NextRequest("http://localhost/api/admin/teams"));
      const body = await res.json();
      expect(body).toMatchObject({ data: [TEAM], total: 1, page: 1, pageSize: 20 });
    });
  });

  // ── 2. GET /api/admin/teams/[id] (Team Detail) ────────────────────

  describe("GET /api/admin/teams/[id]", () => {
    it("returns 403 when capability is missing", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const res = await getTeamById(new NextRequest("http://localhost/api/admin/teams/t1"), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(403);
      expect(db.collaborationTeam.findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when team does not exist", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(null as any);
      const res = await getTeamById(new NextRequest("http://localhost/api/admin/teams/missing"), { params: Promise.resolve({ id: "missing" }) });
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is outside team city", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(false);
      const res = await getTeamById(new NextRequest("http://localhost/api/admin/teams/t1"), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 200 with team and active-member count when in scope", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(true);
      const res = await getTeamById(new NextRequest("http://localhost/api/admin/teams/t1"), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe("t1");
      expect(body._count.memberships).toBe(5);
    });
  });

  // ── 3. GET /api/admin/teams/[id]/members (List Members) ─────────

  describe("GET /api/admin/teams/[id]/members", () => {
    it("returns 403 when capability missing", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const res = await getTeamMembers(new NextRequest("http://localhost/api/admin/teams/t1/members"), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 404 when team does not exist", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(null as any);
      const res = await getTeamMembers(new NextRequest("http://localhost/api/admin/teams/missing/members"), { params: Promise.resolve({ id: "missing" }) });
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is outside team city", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(false);
      const res = await getTeamMembers(new NextRequest("http://localhost/api/admin/teams/t1/members"), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(403);
    });

    it("returns paginated members list with default active filter", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(true);
      vi.mocked(db.staffTeamMembership.findMany).mockResolvedValue([MEMBERSHIP] as any);
      vi.mocked(db.staffTeamMembership.count).mockResolvedValue(1);

      const res = await getTeamMembers(new NextRequest("http://localhost/api/admin/teams/t1/members"), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ total: 1, page: 1 });
    });
  });

  // ── 4. POST /api/admin/teams/[id]/members (Create Member) ────────

  describe("POST /api/admin/teams/[id]/members", () => {
    const postReq = (body: unknown) =>
      new NextRequest("http://localhost/api/admin/teams/t1/members", {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
        headers: { "content-type": "application/json" },
      });

    it("returns 403 when capability missing (before DB mutation)", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const res = await addTeamMember(postReq({ staffMetaId: "sm1" }), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(403);
      expect(db.collaborationTeam.findUnique).not.toHaveBeenCalled();
    });

    it("returns 400 on malformed JSON", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      const res = await addTeamMember(new NextRequest("http://localhost/api/admin/teams/t1/members", { method: "POST", body: "{{invalid" }), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 404 when team not found", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(null as any);
      const res = await addTeamMember(postReq({ staffMetaId: "sm1" }), { params: Promise.resolve({ id: "missing" }) });
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is outside team city", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(false);
      const res = await addTeamMember(postReq({ staffMetaId: "sm1" }), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 404 when staff not found", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(true);
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue(null as any);
      const res = await addTeamMember(postReq({ staffMetaId: "sm-missing" }), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(404);
    });

    it("returns 400 when staff belongs to a different city (cross-city)", async () => {
      const crossCityStaff = { ...STAFF, assignedCityId: "city-khi" };
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(true);
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue(crossCityStaff as any);
      const res = await addTeamMember(postReq({ staffMetaId: "sm1" }), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("city");
    });

    it("returns 409 when staff already active", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(true);
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue(STAFF as any);
      vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue({ id: "existing" } as any);
      const res = await addTeamMember(postReq({ staffMetaId: "sm1" }), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(409);
    });

    it("creates membership and returns 201 with audit", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(TEAM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(true);
      vi.mocked(db.staffMeta.findUnique).mockResolvedValue(STAFF as any);
      vi.mocked(db.staffTeamMembership.findFirst).mockResolvedValue(null);
      vi.mocked(db.staffTeamMembership.create).mockResolvedValue(MEMBERSHIP as any);
      const res = await addTeamMember(postReq({ staffMetaId: "sm1", title: "Captain" }), { params: Promise.resolve({ id: "t1" }) });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe("mem1");
    });
  });

  // ── 5. DELETE /api/admin/teams/members/[membershipId] (Revoke) ──

  describe("DELETE /api/admin/teams/members/[membershipId]", () => {
    it("returns 403 when capability missing", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const res = await revokeTeamMember(new NextRequest("http://localhost/api/admin/teams/members/mem1", { method: "DELETE" }), { params: Promise.resolve({ membershipId: "mem1" }) });
      expect(res.status).toBe(403);
      expect(db.staffTeamMembership.findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 for non-existent membership", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(null as any);
      const res = await revokeTeamMember(new NextRequest("http://localhost/api/admin/teams/members/missing", { method: "DELETE" }), { params: Promise.resolve({ membershipId: "missing" }) });
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is outside team city", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u2", role: "city_head", assignedCityId: "city-lhr" } } as any);
      vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(ACTIVE_MEM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(false);
      const res = await revokeTeamMember(new NextRequest("http://localhost/api/admin/teams/members/mem1", { method: "DELETE" }), { params: Promise.resolve({ membershipId: "mem1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 409 when already inactive", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      const inactive = { ...ACTIVE_MEM, isActive: false, endedAt: new Date() };
      vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(inactive as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(true);
      const res = await revokeTeamMember(new NextRequest("http://localhost/api/admin/teams/members/mem1", { method: "DELETE" }), { params: Promise.resolve({ membershipId: "mem1" }) });
      expect(res.status).toBe(409);
    });

    it("soft-deactivates and records audit", async () => {
      vi.mocked(auth.requireCapability).mockResolvedValue({ user: { id: "u1", role: "super_admin" } } as any);
      vi.mocked(db.staffTeamMembership.findUnique).mockResolvedValue(ACTIVE_MEM as any);
      vi.mocked(auth.requireCityScope).mockReturnValue(true);
      vi.mocked(db.staffTeamMembership.update).mockResolvedValue({ ...ACTIVE_MEM, isActive: false, endedAt: new Date() } as any);
      const res = await revokeTeamMember(new NextRequest("http://localhost/api/admin/teams/members/mem1", { method: "DELETE" }), { params: Promise.resolve({ membershipId: "mem1" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isActive).toBe(false);
    });
  });
});
