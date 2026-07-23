import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  deriveContentPlannerCityScope,
  deriveContentPlannerParkScope,
  buildContentPlanScopeFilter,
  canReadContentPlan,
  canWriteContentPlan,
  verifyTeamInCity,
  isApprovedCategory,
  CATEGORY_TO_TEAM_CODE,
} from "./scope";
import type { SessionUser } from "@/lib/auth/scope";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    city: { findMany: vi.fn(), findUnique: vi.fn() },
    park: { findUnique: vi.fn() },
    group: { findUnique: vi.fn() },
    batch: { findUnique: vi.fn() },
    contentPlan: { findUnique: vi.fn() },
    collaborationTeam: { findUnique: vi.fn() },
  },
}));

describe("Content Planner Scope Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isApprovedCategory", () => {
    it("should accept approved categories", () => {
      expect(isApprovedCategory("exercises")).toBe(true);
      expect(isApprovedCategory("sports")).toBe(true);
      expect(isApprovedCategory("skills")).toBe(true);
      expect(isApprovedCategory("tadreeb")).toBe(true);
    });

    it("should reject unapproved categories", () => {
      expect(isApprovedCategory("media")).toBe(false);
      expect(isApprovedCategory("muawin")).toBe(false);
      expect(isApprovedCategory("invalid")).toBe(false);
    });
  });

  describe("CATEGORY_TO_TEAM_CODE", () => {
    it("should map categories to team codes", () => {
      expect(CATEGORY_TO_TEAM_CODE.exercises).toBe("sports");
      expect(CATEGORY_TO_TEAM_CODE.sports).toBe("sports");
      expect(CATEGORY_TO_TEAM_CODE.skills).toBe("skills");
      expect(CATEGORY_TO_TEAM_CODE.tadreeb).toBe("tadreeb");
    });
  });

  describe("deriveContentPlannerCityScope", () => {
    it("should return all active cities for super_admin", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "super_admin",
      };
      vi.mocked(db.city.findMany).mockResolvedValue([
        { id: "city1" },
        { id: "city2" },
      ] as any);

      const result = await deriveContentPlannerCityScope(user);
      expect(result).toEqual(["city1", "city2"]);
    });

    it("should return all active cities for program_admin", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "program_admin",
      };
      vi.mocked(db.city.findMany).mockResolvedValue([{ id: "city1" }] as any);

      const result = await deriveContentPlannerCityScope(user);
      expect(result).toEqual(["city1"]);
    });

    it("should return assigned city for city_head", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };

      const result = await deriveContentPlannerCityScope(user);
      expect(result).toEqual(["city1"]);
    });

    it("should derive city from park for park_lead", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique).mockResolvedValue({
        id: "park1",
        cityId: "city1",
      } as any);

      const result = await deriveContentPlannerCityScope(user);
      expect(result).toEqual(["city1"]);
    });

    it("should derive city from group for murabbi", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "murabbi",
        assignedGroupId: "group1",
      };
      vi.mocked(db.group.findUnique).mockResolvedValue({
        id: "group1",
        park: { cityId: "city1" },
      } as any);

      const result = await deriveContentPlannerCityScope(user);
      expect(result).toEqual(["city1"]);
    });

    it("should return null for user without valid assignments", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "murabbi",
      };

      const result = await deriveContentPlannerCityScope(user);
      expect(result).toBeNull();
    });

    it("should return null for missing user id", async () => {
      const user: SessionUser = {
        role: "city_head",
      };

      const result = await deriveContentPlannerCityScope(user);
      expect(result).toBeNull();
    });
  });

  describe("deriveContentPlannerParkScope", () => {
    it("should return 'all' for HQ roles", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "super_admin",
      };
      vi.mocked(db.city.findMany).mockResolvedValue([{ id: "city1" }] as any);

      const result = await deriveContentPlannerParkScope(user, "city1");
      expect(result).toBe("all");
    });

    it("should return 'all' for city_head in their assigned city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };

      const result = await deriveContentPlannerParkScope(user, "city1");
      expect(result).toBe("all");
    });

    it("should return assigned park for park_lead in correct city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique).mockResolvedValueOnce({
        id: "park1",
        cityId: "city1",
      } as any);
      vi.mocked(db.park.findUnique).mockResolvedValueOnce({
        id: "park1",
        cityId: "city1",
      } as any);

      const result = await deriveContentPlannerParkScope(user, "city1");
      expect(result).toEqual(["park1"]);
    });

    it("should return null when park_lead park is in different city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique).mockResolvedValueOnce({
        id: "park1",
        cityId: "city1",
      } as any);
      vi.mocked(db.park.findUnique).mockResolvedValueOnce({
        id: "park1",
        cityId: "city1",
      } as any);

      const result = await deriveContentPlannerParkScope(user, "city2");
      expect(result).toBeNull();
    });

    it("should return null when user cannot access city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };

      const result = await deriveContentPlannerParkScope(user, "city2");
      expect(result).toBeNull();
    });
  });

  describe("buildContentPlanScopeFilter", () => {
    it("should build filter for super_admin without narrowing", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "super_admin",
      };
      vi.mocked(db.city.findMany).mockResolvedValue([
        { id: "city1" },
        { id: "city2" },
      ] as any);

      const result = await buildContentPlanScopeFilter(user);
      expect(result).toEqual({
        cityId: { in: ["city1", "city2"] },
      });
    });

    it("should narrow to requested city when allowed", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "super_admin",
      };
      vi.mocked(db.city.findMany).mockResolvedValue([
        { id: "city1" },
        { id: "city2" },
      ] as any);

      const result = await buildContentPlanScopeFilter(user, "city1");
      expect(result).toEqual({
        cityId: "city1",
      });
    });

    it("should return null when requested city exceeds permission", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };

      const result = await buildContentPlanScopeFilter(user, "city2");
      expect(result).toBeNull();
    });

    it("should include batch filter when provided and valid", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch1",
        cityId: "city1",
      } as any);

      const result = await buildContentPlanScopeFilter(user, "city1", "batch1");
      expect(result).toEqual({
        cityId: "city1",
        batchId: "batch1",
      });
    });

    it("should return null when batch belongs to different city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch1",
        cityId: "city2",
      } as any);

      const result = await buildContentPlanScopeFilter(user, "city1", "batch1");
      expect(result).toBeNull();
    });

    it("should include park filter when park_lead requests own park", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique).mockResolvedValue({
        id: "park1",
        cityId: "city1",
      } as any);

      const result = await buildContentPlanScopeFilter(
        user,
        "city1",
        undefined,
        "park1"
      );
      expect(result).toEqual({
        cityId: "city1",
        parkId: "park1",
      });
    });

    it("should return null when user has no access", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "guardian",
      };

      const result = await buildContentPlanScopeFilter(user);
      expect(result).toBeNull();
    });
  });

  describe("canReadContentPlan", () => {
    it("should allow super_admin to read any plan", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "super_admin",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan1",
        cityId: "city1",
        parkId: null,
        batchId: null,
      } as any);
      vi.mocked(db.city.findMany).mockResolvedValue([{ id: "city1" }] as any);

      const result = await canReadContentPlan(user, "plan1");
      expect(result).toBe(true);
    });

    it("should allow city_head to read plan in assigned city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan1",
        cityId: "city1",
        parkId: null,
        batchId: null,
      } as any);

      const result = await canReadContentPlan(user, "plan1");
      expect(result).toBe(true);
    });

    it("should deny city_head reading plan in different city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan1",
        cityId: "city2",
        parkId: null,
        batchId: null,
      } as any);

      const result = await canReadContentPlan(user, "plan1");
      expect(result).toBe(false);
    });

    it("should return false when plan not found", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "super_admin",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue(null);

      const result = await canReadContentPlan(user, "plan1");
      expect(result).toBe(false);
    });
  });

  describe("canWriteContentPlan", () => {
    it("should allow super_admin to write", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "super_admin",
      };
      vi.mocked(db.city.findMany).mockResolvedValue([{ id: "city1" }] as any);

      const result = await canWriteContentPlan(user, "city1");
      expect(result).toBe(true);
    });

    it("should allow city_head to write in assigned city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };

      const result = await canWriteContentPlan(user, "city1");
      expect(result).toBe(true);
    });

    it("should deny park_lead from writing", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique).mockResolvedValue({
        id: "park1",
        cityId: "city1",
      } as any);

      const result = await canWriteContentPlan(user, "city1");
      expect(result).toBe(false);
    });

    it("should deny murabbi from writing", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "murabbi",
        assignedGroupId: "group1",
      };
      vi.mocked(db.group.findUnique).mockResolvedValue({
        id: "group1",
        park: { cityId: "city1" },
      } as any);

      const result = await canWriteContentPlan(user, "city1");
      expect(result).toBe(false);
    });

    it("should deny city_head writing in different city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };

      const result = await canWriteContentPlan(user, "city2");
      expect(result).toBe(false);
    });
  });

  describe("verifyTeamInCity", () => {
    it("should return true when team exists and is active in city", async () => {
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
        id: "team1",
        cityId: "city1",
        isActive: true,
      } as any);

      const result = await verifyTeamInCity("team1", "city1");
      expect(result).toBe(true);
    });

    it("should return false when team is in different city", async () => {
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
        id: "team1",
        cityId: "city2",
        isActive: true,
      } as any);

      const result = await verifyTeamInCity("team1", "city1");
      expect(result).toBe(false);
    });

    it("should return false when team is inactive", async () => {
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
        id: "team1",
        cityId: "city1",
        isActive: false,
      } as any);

      const result = await verifyTeamInCity("team1", "city1");
      expect(result).toBe(false);
    });

    it("should return false when team not found", async () => {
      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue(null);

      const result = await verifyTeamInCity("team1", "city1");
      expect(result).toBe(false);
    });
  });
});
