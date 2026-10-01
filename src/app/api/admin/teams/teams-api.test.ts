import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as getTeams } from "./route";
import { GET as getTeamById } from "./[id]/route";
import { GET as getTeamMembers, POST as addTeamMember } from "./[id]/members/route";
import { DELETE as revokeTeamMember } from "./members/[membershipId]/route";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  createAuditLogData: vi.fn((params) => params),
  teamFindMany: vi.fn(),
  teamFindUnique: vi.fn(),
  membershipFindMany: vi.fn(),
  membershipFindFirst: vi.fn(),
  membershipFindUnique: vi.fn(),
  membershipCreate: vi.fn(),
  membershipUpdateMany: vi.fn(),
  auditLogCreate: vi.fn(),
  transaction: vi.fn(),
  staffMetaFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/auth/events-scope", () => ({
  resolveActorCity: mocks.resolveActorCity,
}));

vi.mock("@/lib/audit", () => ({
  createAuditLogData: mocks.createAuditLogData,
}));

vi.mock("@/lib/db", () => ({
  db: {
    collaborationTeam: {
      findMany: mocks.teamFindMany,
      findUnique: mocks.teamFindUnique,
    },
    staffTeamMembership: {
      findMany: mocks.membershipFindMany,
      findFirst: mocks.membershipFindFirst,
      findUnique: mocks.membershipFindUnique,
      create: mocks.membershipCreate,
      updateMany: mocks.membershipUpdateMany,
    },
    staffMeta: {
      findUnique: mocks.staffMetaFindUnique,
    },
    auditLog: { create: mocks.auditLogCreate },
    $transaction: mocks.transaction,
  },
}));

describe("TEAM-003: Collaboration Teams API & Security Test Matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: { id: "user_actor_1", role: "city_head" } });
    mocks.resolveActorCity.mockResolvedValue({ cityId: "city_lhr", isHQ: false });
    mocks.transaction.mockImplementation(async (callback) => callback({
      staffTeamMembership: {
        create: mocks.membershipCreate,
        updateMany: mocks.membershipUpdateMany,
      },
      auditLog: { create: mocks.auditLogCreate },
    }));
  });

  describe("1. GET /api/admin/teams (List Teams)", () => {
    it("returns 200 OK with city-scoped teams for valid capability and matching scope", async () => {
      const mockTeams = [
        { id: "team_1", name: "Sports", cityId: "city_lhr", _count: { memberships: 5 } },
      ];
      mocks.teamFindMany.mockResolvedValue(mockTeams);

      const req = new NextRequest("http://localhost/api/admin/teams?cityId=city_lhr");
      const res = await getTeams(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockTeams);
      expect(mocks.resolveActorCity).toHaveBeenCalledWith({ id: "user_actor_1", role: "city_head" }, "city_lhr");
      expect(mocks.teamFindMany).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.objectContaining({
          _count: expect.objectContaining({
            select: expect.objectContaining({
              memberships: { where: { isActive: true, endedAt: null } },
            }),
          }),
        }),
      }));
    });

    it("returns 400 Bad Request when HQ actor omits cityId parameter", async () => {
      mocks.requireCapability.mockResolvedValue({ user: { id: "user_hq_1", role: "super_admin" } });
      mocks.resolveActorCity.mockResolvedValue({ error: "HQ actor must supply a valid cityId", status: 400 });

      const req = new NextRequest("http://localhost/api/admin/teams");
      const res = await getTeams(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/HQ actor must supply a valid cityId/);
    });

    it("returns 403 Forbidden when scoped actor requests a foreign city", async () => {
      mocks.resolveActorCity.mockResolvedValue({
        error: "Forbidden: requested cityId does not match actor city scope",
        status: 403,
      });

      const req = new NextRequest("http://localhost/api/admin/teams?cityId=city_isb");
      const res = await getTeams(req);

      expect(res.status).toBe(403);
    });
  });

  describe("2. GET /api/admin/teams/[id] (Team Details)", () => {
    it("returns 404 Not Found when team does not exist", async () => {
      mocks.teamFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/teams/team_nonexistent");
      const res = await getTeamById(req, { params: Promise.resolve({ id: "team_nonexistent" }) });

      expect(res.status).toBe(404);
    });

    it("returns 403 Forbidden when actor does not match team city scope", async () => {
      mocks.teamFindUnique.mockResolvedValue({ id: "team_foreign", cityId: "city_isb" });
      mocks.resolveActorCity.mockResolvedValue({
        error: "Forbidden: requested cityId does not match actor city scope",
        status: 403,
      });

      const req = new NextRequest("http://localhost/api/admin/teams/team_foreign");
      const res = await getTeamById(req, { params: Promise.resolve({ id: "team_foreign" }) });

      expect(res.status).toBe(403);
    });
  });

  describe("3. POST /api/admin/teams/[id]/members (Assign Member)", () => {
    it("returns 400 Bad Request when target staff city does not match team city", async () => {
      mocks.teamFindUnique.mockResolvedValue({ id: "team_1", cityId: "city_lhr" });
      mocks.staffMetaFindUnique.mockResolvedValue({
        id: "staff_isb_1",
        isActive: true,
        assignedCityId: "city_isb",
      });

      const req = new NextRequest("http://localhost/api/admin/teams/team_1/members", {
        method: "POST",
        body: JSON.stringify({ staffMetaId: "staff_isb_1", title: "Sports Lead" }),
      });
      const res = await addTeamMember(req, { params: Promise.resolve({ id: "team_1" }) });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/city mismatch/i);
    });

    it("creates team membership and records audit log when valid", async () => {
      mocks.teamFindUnique.mockResolvedValue({ id: "team_1", cityId: "city_lhr" });
      mocks.staffMetaFindUnique.mockResolvedValue({
        id: "staff_lhr_1",
        isActive: true,
        assignedCityId: "city_lhr",
      });
      mocks.membershipFindFirst.mockResolvedValue(null);
      const createdMembership = {
        id: "membership_1",
        teamId: "team_1",
        staffMetaId: "staff_lhr_1",
        title: "Sports Lead",
      };
      mocks.membershipCreate.mockResolvedValue(createdMembership);

      const req = new NextRequest("http://localhost/api/admin/teams/team_1/members", {
        method: "POST",
        body: JSON.stringify({ staffMetaId: "staff_lhr_1", title: "Sports Lead" }),
      });
      const res = await addTeamMember(req, { params: Promise.resolve({ id: "team_1" }) });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toEqual(createdMembership);
      expect(mocks.auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({
          action: "team_membership.assign",
          entityType: "StaffTeamMembership",
          entityId: "membership_1",
        }) })
      );
    });
  });

  describe("4. DELETE /api/admin/teams/members/[membershipId] (Revoke Member)", () => {
    it("returns 404 Not Found for non-existent membershipId", async () => {
      mocks.membershipFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/teams/members/mem_nonexistent", {
        method: "DELETE",
      });
      const res = await revokeTeamMember(req, { params: Promise.resolve({ membershipId: "mem_nonexistent" }) });

      expect(res.status).toBe(404);
    });

    it("revokes membership and records audit log when authorized", async () => {
      const mockMembership = {
        id: "membership_1",
        isActive: true,
        endedAt: null,
        team: { id: "team_1", cityId: "city_lhr", name: "Sports" },
      };
      mocks.membershipFindUnique.mockResolvedValue(mockMembership);
      mocks.membershipUpdateMany.mockResolvedValue({ count: 1 });

      const req = new NextRequest("http://localhost/api/admin/teams/members/membership_1", {
        method: "DELETE",
      });
      const res = await revokeTeamMember(req, { params: Promise.resolve({ membershipId: "membership_1" }) });

      expect(res.status).toBe(200);
      expect(mocks.auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({
          action: "team_membership.revoke",
          entityType: "StaffTeamMembership",
          entityId: "membership_1",
        }) })
      );
    });

    it("rejects an already-ended membership without a mutation", async () => {
      mocks.membershipFindUnique.mockResolvedValue({
        id: "membership_1",
        isActive: true,
        endedAt: new Date("2026-08-01T00:00:00.000Z"),
        team: { id: "team_1", cityId: "city_lhr", name: "Sports" },
      });

      const res = await revokeTeamMember(
        new NextRequest("http://localhost/api/admin/teams/members/membership_1", { method: "DELETE" }),
        { params: Promise.resolve({ membershipId: "membership_1" }) }
      );

      expect(res.status).toBe(409);
      expect(mocks.membershipUpdateMany).not.toHaveBeenCalled();
    });
  });
});
