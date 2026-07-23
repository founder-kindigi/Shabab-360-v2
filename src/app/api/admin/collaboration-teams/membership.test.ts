import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { GET as listTeams } from "./route";
import { GET as listMembers, POST as assignMember } from "./[teamId]/members/route";
import { DELETE as revokeMember, PATCH as updateMember } from "./[teamId]/members/[membershipId]/route";

vi.mock("@/lib/auth/authorize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/authorize")>();
  return {
    ...actual,
    requireAuth: vi.fn(),
    requireCapability: vi.fn(),
  };
});

import { requireCapability } from "@/lib/auth/authorize";

const mockRequireCapability = vi.mocked(requireCapability);

describe("Collaboration Team Membership APIs (TEAM-002 / TEAM-003)", () => {
  const mockCityLhr = { id: "c123456789012345678901234", name: "Lahore", code: "LHR" };
  const mockCityIsb = { id: "c223456789012345678901234", name: "Islamabad", code: "ISB" };

  const mockTeamLhr = {
    id: "c323456789012345678901234",
    cityId: mockCityLhr.id,
    name: "Lahore Tadreeb",
    code: "TADREEB",
    description: "Tadreeb team in Lahore",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeamInactive = {
    id: "c423456789012345678901234",
    cityId: mockCityLhr.id,
    name: "Lahore Media",
    code: "MEDIA",
    description: "Inactive Media team",
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStaffMetaLhr = {
    id: "c523456789012345678901234",
    userId: "u123456789012345678901234",
    role: "murabbi",
    assignedCityId: mockCityLhr.id,
    assignedParkId: null,
    assignedGroupId: null,
    isActive: true,
  };

  const mockStaffMetaIsb = {
    id: "c623456789012345678901234",
    userId: "u223456789012345678901234",
    role: "murabbi",
    assignedCityId: mockCityIsb.id,
    assignedParkId: null,
    assignedGroupId: null,
    isActive: true,
  };

  const mockStaffMetaInactive = {
    id: "c723456789012345678901234",
    userId: "u323456789012345678901234",
    role: "murabbi",
    assignedCityId: mockCityLhr.id,
    assignedParkId: null,
    assignedGroupId: null,
    isActive: false,
  };

  const mockUserLhrCityHead = {
    id: "user-cityhead-lhr",
    role: "city_head",
    assignedCityId: mockCityLhr.id,
    mustResetPwd: false,
  };

  const mockUserHq = {
    id: "user-hq-superadmin",
    role: "super_admin",
    assignedCityId: null,
    mustResetPwd: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/collaboration-teams (TC-TM-016, TC-TM-017)", () => {
    it("denies access if teams.memberships.manage capability is missing (HTTP 403)", async () => {
      mockRequireCapability.mockResolvedValue(
        new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) as any
      );

      const request = new Request("http://localhost/api/admin/collaboration-teams?cityId=" + mockCityLhr.id);
      const response = await listTeams(request);
      expect(response.status).toBe(403);
    });

    it("denies HQ user if cityId parameter is omitted (HTTP 400 - TC-TM-016)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserHq } as any);

      const request = new Request("http://localhost/api/admin/collaboration-teams");
      const response = await listTeams(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toMatch(/cityId parameter is required/i);
    });

    it("allows HQ user providing valid cityId parameter (HTTP 200 - TC-TM-017)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserHq } as any);
      vi.spyOn(db.collaborationTeam, "findMany").mockResolvedValue([mockTeamLhr] as any);

      const request = new Request(`http://localhost/api/admin/collaboration-teams?cityId=${mockCityLhr.id}`);
      const response = await listTeams(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(mockTeamLhr.id);
    });

    it("denies scoped user providing a foreign cityId (HTTP 403)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLhrCityHead } as any);

      const request = new Request(`http://localhost/api/admin/collaboration-teams?cityId=${mockCityIsb.id}`);
      const response = await listTeams(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toMatch(/scope mismatch/i);
    });
  });

  describe("POST /api/admin/collaboration-teams/[teamId]/members (TC-TM-001, TC-TM-002, TC-TM-003, TC-TM-010)", () => {
    it("allows assigned member creation for same-city staff (HTTP 201 - TC-TM-001)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLhrCityHead } as any);
      vi.spyOn(db.collaborationTeam, "findUnique").mockResolvedValue(mockTeamLhr as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaLhr as any);
      vi.spyOn(db.staffTeamMembership, "findFirst").mockResolvedValue(null);

      const createdMembership = {
        id: "mem-123456789012345678901234",
        staffMetaId: mockStaffMetaLhr.id,
        teamId: mockTeamLhr.id,
        title: "Team Lead",
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.spyOn(db.staffTeamMembership, "create").mockResolvedValue(createdMembership as any);
      const auditSpy = vi.spyOn(db.auditLog, "create").mockResolvedValue({} as any);

      const request = new Request(`http://localhost/api/admin/collaboration-teams/${mockTeamLhr.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          staffMetaId: mockStaffMetaLhr.id,
          title: "Team Lead",
        }),
      });

      const response = await assignMember(request, { params: Promise.resolve({ teamId: mockTeamLhr.id }) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.id).toBe(createdMembership.id);
      expect(auditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "create_team_membership",
          entityType: "StaffTeamMembership",
        }),
      });
    });

    it("denies creation if missing capability (HTTP 403 - TC-TM-002)", async () => {
      mockRequireCapability.mockResolvedValue(
        new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) as any
      );

      const request = new Request(`http://localhost/api/admin/collaboration-teams/${mockTeamLhr.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          staffMetaId: mockStaffMetaLhr.id,
          title: "Team Lead",
        }),
      });

      const response = await assignMember(request, { params: Promise.resolve({ teamId: mockTeamLhr.id }) });
      expect(response.status).toBe(403);
    });

    it("denies assigning staff member from a different city (HTTP 400 - TC-TM-003)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLhrCityHead } as any);
      vi.spyOn(db.collaborationTeam, "findUnique").mockResolvedValue(mockTeamLhr as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaIsb as any);

      const request = new Request(`http://localhost/api/admin/collaboration-teams/${mockTeamLhr.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          staffMetaId: mockStaffMetaIsb.id,
          title: "Team Lead",
        }),
      });

      const response = await assignMember(request, { params: Promise.resolve({ teamId: mockTeamLhr.id }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toMatch(/city mismatch/i);
    });

    it("denies assigning an inactive staff member (HTTP 400)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLhrCityHead } as any);
      vi.spyOn(db.collaborationTeam, "findUnique").mockResolvedValue(mockTeamLhr as any);
      vi.spyOn(db.staffMeta, "findUnique").mockResolvedValue(mockStaffMetaInactive as any);

      const request = new Request(`http://localhost/api/admin/collaboration-teams/${mockTeamLhr.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          staffMetaId: mockStaffMetaInactive.id,
          title: "Team Lead",
        }),
      });

      const response = await assignMember(request, { params: Promise.resolve({ teamId: mockTeamLhr.id }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toMatch(/inactive staff/i);
    });

    it("denies assignment to an inactive team (HTTP 400)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLhrCityHead } as any);
      vi.spyOn(db.collaborationTeam, "findUnique").mockResolvedValue(mockTeamInactive as any);

      const request = new Request(`http://localhost/api/admin/collaboration-teams/${mockTeamInactive.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          staffMetaId: mockStaffMetaLhr.id,
          title: "Team Lead",
        }),
      });

      const response = await assignMember(request, { params: Promise.resolve({ teamId: mockTeamInactive.id }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toMatch(/inactive team/i);
    });
  });

  describe("PATCH /api/admin/collaboration-teams/[teamId]/members/[membershipId]", () => {
    it("updates team member title and logs audit (HTTP 200)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLhrCityHead } as any);

      const mockMembership = {
        id: "mem-123456789012345678901234",
        staffMetaId: mockStaffMetaLhr.id,
        teamId: mockTeamLhr.id,
        title: "Member",
        isActive: true,
        team: mockTeamLhr,
      };

      vi.spyOn(db.staffTeamMembership, "findUnique").mockResolvedValue(mockMembership as any);
      vi.spyOn(db.staffTeamMembership, "update").mockResolvedValue({ ...mockMembership, title: "Updated Title" } as any);
      const auditSpy = vi.spyOn(db.auditLog, "create").mockResolvedValue({} as any);

      const request = new Request(
        `http://localhost/api/admin/collaboration-teams/${mockTeamLhr.id}/members/${mockMembership.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title: "Updated Title" }),
        }
      );

      const response = await updateMember(request, {
        params: Promise.resolve({ teamId: mockTeamLhr.id, membershipId: mockMembership.id }),
      });

      expect(response.status).toBe(200);
      expect(auditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "update_team_membership",
        }),
      });
    });
  });

  describe("DELETE /api/admin/collaboration-teams/[teamId]/members/[membershipId]", () => {
    it("revokes membership setting isActive: false and endedAt timestamp (HTTP 200)", async () => {
      mockRequireCapability.mockResolvedValue({ user: mockUserLhrCityHead } as any);

      const mockMembership = {
        id: "mem-123456789012345678901234",
        staffMetaId: mockStaffMetaLhr.id,
        teamId: mockTeamLhr.id,
        title: "Member",
        isActive: true,
        team: mockTeamLhr,
      };

      vi.spyOn(db.staffTeamMembership, "findUnique").mockResolvedValue(mockMembership as any);
      vi.spyOn(db.staffTeamMembership, "update").mockResolvedValue({
        ...mockMembership,
        isActive: false,
        endedAt: new Date(),
      } as any);
      const auditSpy = vi.spyOn(db.auditLog, "create").mockResolvedValue({} as any);

      const request = new Request(
        `http://localhost/api/admin/collaboration-teams/${mockTeamLhr.id}/members/${mockMembership.id}`,
        {
          method: "DELETE",
        }
      );

      const response = await revokeMember(request, {
        params: Promise.resolve({ teamId: mockTeamLhr.id, membershipId: mockMembership.id }),
      });

      expect(response.status).toBe(200);
      expect(auditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "revoke_team_membership",
        }),
      });
    });
  });

});
