import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  deriveContentPlannerCityScope,
  deriveContentPlannerParkScope,
  buildContentPlanScopeFilter,
  canReadContentPlan,
  canWriteContentPlan,
  verifyTeamInCity,
  isApprovedCategory,
  isHqUser,
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

  describe("isHqUser", () => {
    it("should return true for super_admin", () => {
      expect(isHqUser({ id: "u1", role: "super_admin" })).toBe(true);
    });

    it("should return true for program_admin", () => {
      expect(isHqUser({ id: "u1", role: "program_admin" })).toBe(true);
    });

    it("should return false for city_head", () => {
      expect(isHqUser({ id: "u1", role: "city_head" })).toBe(false);
    });

    it("should return false for park_lead", () => {
      expect(isHqUser({ id: "u1", role: "park_lead" })).toBe(false);
    });
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

    // ── Cross-park isolation tests ──────────────────────────────────────────

    it("should always enforce derived park for park_lead even when parkId is omitted", async () => {
      // Park Lead in park1 must only see plans for park1 and city-wide templates,
      // never all Lahore plans. The filter uses OR to include city-wide templates only.
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any) // city derivation
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any); // park scope derivation

      const result = await buildContentPlanScopeFilter(user, "city1");
      expect(result).toEqual({
        cityId: "city1",
        OR: [
          { parkId: null, batchId: null, kind: "template" },
          { parkId: { in: ["park1"] } },
        ],
      });
    });

    it("should return null when park_lead requests a sibling park", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any) // city derivation
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any); // park scope derivation

      // requestParkId = "park2" (sibling in same city) must be denied
      const result = await buildContentPlanScopeFilter(user, "city1", undefined, "park2");
      expect(result).toBeNull();
    });

    it("should return null when park_lead requests a batch owned by a sibling park", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any) // city derivation
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any); // park scope derivation
      // batch belongs to same city but different park
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch2",
        cityId: "city1",
        parkId: "park2",
      } as any);

      const result = await buildContentPlanScopeFilter(user, "city1", "batch2");
      expect(result).toBeNull();
    });

    it("should allow park_lead to filter by a batch owned by their own park", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch1",
        cityId: "city1",
        parkId: "park1",
      } as any);

      const result = await buildContentPlanScopeFilter(user, "city1", "batch1");
      // When batch is specified the OR clause is replaced by batchId discriminator
      expect(result).toEqual({
        cityId: "city1",
        batchId: "batch1",
      });
    });

    it("should enforce derived park for murabbi with group assignment", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "murabbi",
        assignedGroupId: "group1",
      };
      vi.mocked(db.group.findUnique)
        .mockResolvedValueOnce({ id: "group1", park: { cityId: "city1" } } as any)
        .mockResolvedValueOnce({ id: "group1", park: { cityId: "city1" } } as any)
        .mockResolvedValueOnce({ id: "group1", park: { id: "park1", cityId: "city1" } } as any);

      const result = await buildContentPlanScopeFilter(user, "city1");
      expect(result).toEqual({
        cityId: "city1",
        OR: [
          { parkId: null, batchId: null, kind: "template" },
          { parkId: { in: ["park1"] } },
        ],
      });
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

    it("should deny park_lead reading a plan that belongs to a sibling park", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      // Plan belongs to park2 (sibling in same city)
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan1",
        cityId: "city1",
        parkId: "park2",
        batchId: null,
      } as any);
      // deriveContentPlannerCityScope → park lookup
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canReadContentPlan(user, "plan1");
      expect(result).toBe(false);
    });

    it("should allow park_lead to read a plan in their own park", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan1",
        cityId: "city1",
        parkId: "park1",
        batchId: null,
      } as any);
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canReadContentPlan(user, "plan1");
      expect(result).toBe(true);
    });
  });

  describe("canWriteContentPlan", () => {
    it("should allow super_admin to write with valid scope", async () => {
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

    it("should deny park_lead creating a city-wide plan (no parkId, no batchId)", async () => {
      // Park-scoped users must not create city-wide templates.
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

    it("should deny murabbi creating a city-wide plan (no parkId, no batchId)", async () => {
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

    it("should deny city_head writing in different city (scope violation)", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };

      const result = await canWriteContentPlan(user, "city2");
      expect(result).toBe(false);
    });

    it("should deny park_lead writing outside assigned park city", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique).mockResolvedValue({
        id: "park1",
        cityId: "city1",
      } as any);

      const result = await canWriteContentPlan(user, "city2");
      expect(result).toBe(false);
    });

    it("should deny park_lead writing to a plan in a sibling park", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      // The plan being written to is in park2 (same city, different park)
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canWriteContentPlan(user, "city1", null, "park2");
      expect(result).toBe(false);
    });

    it("should allow park_lead writing to a plan in their own park", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canWriteContentPlan(user, "city1", null, "park1");
      expect(result).toBe(true);
    });
  });

  // ── City template and park-plan visibility (read) ─────────────────────────
  describe("park-scoped read: city template and own/sibling-park isolation", () => {
    it("should allow park_lead to read the city-wide template (kind: template)", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "tmpl1",
        cityId: "city1",
        parkId: null,
        batchId: null,
        kind: "template",
      } as any);
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canReadContentPlan(user, "tmpl1");
      expect(result).toBe(true);
    });

    it("should deny park_lead reading a city-wide override (kind: override)", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "ovr1",
        cityId: "city1",
        parkId: null,
        batchId: null,
        kind: "override",
      } as any);
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canReadContentPlan(user, "ovr1");
      expect(result).toBe(false);
    });

    it("should allow murabbi to read the city-wide template (kind: template)", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "murabbi",
        assignedGroupId: "group1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "tmpl1",
        cityId: "city1",
        parkId: null,
        batchId: null,
        kind: "template",
      } as any);
      vi.mocked(db.group.findUnique)
        .mockResolvedValueOnce({ id: "group1", park: { cityId: "city1" } } as any)
        .mockResolvedValueOnce({ id: "group1", park: { cityId: "city1" } } as any)
        .mockResolvedValueOnce({ id: "group1", park: { id: "park1", cityId: "city1" } } as any);

      const result = await canReadContentPlan(user, "tmpl1");
      expect(result).toBe(true);
    });

    it("should deny murabbi reading a city-wide override (kind: override)", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "murabbi",
        assignedGroupId: "group1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "ovr1",
        cityId: "city1",
        parkId: null,
        batchId: null,
        kind: "override",
      } as any);
      vi.mocked(db.group.findUnique)
        .mockResolvedValueOnce({ id: "group1", park: { cityId: "city1" } } as any)
        .mockResolvedValueOnce({ id: "group1", park: { cityId: "city1" } } as any)
        .mockResolvedValueOnce({ id: "group1", park: { id: "park1", cityId: "city1" } } as any);

      const result = await canReadContentPlan(user, "ovr1");
      expect(result).toBe(false);
    });

    it("should allow park_lead to read their own park override", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan1",
        cityId: "city1",
        parkId: "park1",
        batchId: null,
      } as any);
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canReadContentPlan(user, "plan1");
      expect(result).toBe(true);
    });

    it("should deny park_lead reading a sibling-park override", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan2",
        cityId: "city1",
        parkId: "park2", // sibling
        batchId: null,
      } as any);
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canReadContentPlan(user, "plan2");
      expect(result).toBe(false);
    });

    it("should allow park_lead to read a batch plan for their own park's batch", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      // batch-only plan: parkId null, batchId set
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan3",
        cityId: "city1",
        parkId: null,
        batchId: "batch1",
      } as any);
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch1",
        parkId: "park1",
      } as any);

      const result = await canReadContentPlan(user, "plan3");
      expect(result).toBe(true);
    });

    it("should deny park_lead reading a batch plan for a sibling park's batch", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "plan4",
        cityId: "city1",
        parkId: null,
        batchId: "batch2", // belongs to park2
      } as any);
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch2",
        parkId: "park2", // sibling park
      } as any);

      const result = await canReadContentPlan(user, "plan4");
      expect(result).toBe(false);
    });
  });

  // ── Park-scoped write guards ──────────────────────────────────────────────
  describe("canWriteContentPlan: park-scoped write guards", () => {
    it("should allow city_head to create a city-wide template (no parkId, no batchId)", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "city_head",
        assignedCityId: "city1",
      };
      const result = await canWriteContentPlan(user, "city1");
      expect(result).toBe(true);
    });

    it("should allow HQ to create a city-wide template", async () => {
      const user: SessionUser = { id: "u1", role: "super_admin" };
      vi.mocked(db.city.findMany).mockResolvedValue([{ id: "city1" }] as any);
      const result = await canWriteContentPlan(user, "city1");
      expect(result).toBe(true);
    });

    it("should allow capability-granted park_lead to create own-park plan (parkId supplied)", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canWriteContentPlan(user, "city1", null, "park1");
      expect(result).toBe(true);
    });

    it("should allow capability-granted park_lead to create plan via own-park batch", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch1",
        cityId: "city1",
        parkId: "park1",
      } as any);

      const result = await canWriteContentPlan(user, "city1", "batch1");
      expect(result).toBe(true);
    });

    it("should deny capability-granted park_lead creating a city-wide plan (no parkId, no batchId)", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      // No DB calls expected — early return before scope filter
      const result = await canWriteContentPlan(user, "city1");
      expect(result).toBe(false);
    });

    it("should deny capability-granted park_lead writing to a sibling-park plan", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);

      const result = await canWriteContentPlan(user, "city1", null, "park2");
      expect(result).toBe(false);
    });

    it("should deny capability-granted park_lead creating via sibling-park batch", async () => {
      const user: SessionUser = {
        id: "user1",
        role: "park_lead",
        assignedParkId: "park1",
      };
      vi.mocked(db.park.findUnique)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any)
        .mockResolvedValueOnce({ id: "park1", cityId: "city1" } as any);
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch2",
        cityId: "city1",
        parkId: "park2",
      } as any);

      const result = await canWriteContentPlan(user, "city1", "batch2");
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
