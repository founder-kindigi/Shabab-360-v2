import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";
import * as authorize from "@/lib/auth/authorize";
import * as scope from "@/lib/content-planner/scope";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize");
vi.mock("@/lib/content-planner/scope");
vi.mock("@/lib/db", () => ({
  db: {
    city: { findUnique: vi.fn(), findMany: vi.fn() },
    batch: { findUnique: vi.fn() },
    park: { findUnique: vi.fn() },
    contentPlan: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

describe("Content Planner Plans API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/admin/content-planner/plans", () => {
    it("should return 400 when HQ user does not supply cityId", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/content-planner/plans"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("cityId is required");
    });

    it("should return 400 when program_admin user does not supply cityId", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "program_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/content-planner/plans"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("cityId is required");
    });

    it("should return 200 when HQ user supplies explicit cityId", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.buildContentPlanScopeFilter).mockResolvedValue({
        cityId: "city1",
      });
      vi.mocked(db.contentPlan.findMany).mockResolvedValue([] as any);
      vi.mocked(db.contentPlan.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/content-planner/plans?cityId=city1"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should return 403 when scoped actor supplies foreign cityId", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.buildContentPlanScopeFilter).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/content-planner/plans?cityId=city2"
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("insufficient scope");
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should return 403 when missing content.view capability", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans");
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it("should return 403 when user has insufficient scope", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.buildContentPlanScopeFilter).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/content-planner/plans?cityId=city2"
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("insufficient scope");
    });

    it("should return plans when user has access", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.buildContentPlanScopeFilter).mockResolvedValue({
        cityId: "city1",
      });

      const mockPlans = [
        {
          id: "plan1",
          name: "Test Plan",
          cityId: "city1",
          city: { id: "city1", name: "Test City", code: "test" },
          _count: { sessions: 10, overrides: 0 },
        },
      ];

      vi.mocked(db.contentPlan.findMany).mockResolvedValue(mockPlans as any);
      vi.mocked(db.contentPlan.count).mockResolvedValue(1);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/content-planner/plans?cityId=city1"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.plans).toHaveLength(1);
      expect(data.plans[0].id).toBe("plan1");
    });

    it("should validate query parameters", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/content-planner/plans?page=invalid"
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid query parameters");
    });
  });

  describe("POST /api/admin/content-planner/plans", () => {
    it("should return 403 when missing content.manage capability", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "park_lead" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ cityId: "city1", name: "Test" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it("should return 403 when user cannot write to city", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(false);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ cityId: "city2", name: "Test Plan" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("cannot create plan");
    });

    it("should validate request body", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      // HQ without cityId gets 400 because multi-city HQ must supply cityId
      vi.mocked(scope.deriveContentPlannerCityScope).mockResolvedValue(["city1", "city2"]);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ name: "Missing cityId" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 404 when city not found", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.city.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ cityId: "invalid", name: "Test Plan" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
    });

    it("should return 400 when batch does not belong to city", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.city.findUnique).mockResolvedValue({
        id: "city1",
        isActive: true,
      } as any);
      vi.mocked(db.batch.findUnique).mockResolvedValue({
        id: "batch1",
        cityId: "city2",
        isActive: true,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({
          cityId: "city1",
          batchId: "batch1",
          name: "Test Plan",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("does not belong to city");
    });

    it("should return 400 when basePlan is not a template", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.city.findUnique).mockResolvedValue({
        id: "city1",
        isActive: true,
      } as any);
      vi.mocked(db.contentPlan.findUnique).mockResolvedValue({
        id: "base1",
        cityId: "city1",
        kind: "override",
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({
          cityId: "city1",
          basePlanId: "base1",
          name: "Override Plan",
          kind: "override",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("must be a template");
    });

    it("should create plan when all validations pass", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.city.findUnique).mockResolvedValue({
        id: "city1",
        isActive: true,
      } as any);

      const mockPlan = {
        id: "plan1",
        name: "Test Plan",
        cityId: "city1",
        kind: "template",
        status: "draft",
        city: { id: "city1", name: "Test City" },
      };
      vi.mocked(db.contentPlan.create).mockResolvedValue(mockPlan as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ cityId: "city1", name: "Test Plan" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBe("plan1");
      expect(data.name).toBe("Test Plan");
    });

    it("should return 400 when HQ omits cityId even with one active city", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ name: "No cityId" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("cityId is required");
      expect(db.contentPlan.create).not.toHaveBeenCalled();
    });

    it("should create for city_head without explicit cityId (derived scope)", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.deriveContentPlannerCityScope).mockResolvedValue(["city1"]);
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.city.findUnique).mockResolvedValue({ id: "city1", isActive: true } as any);
      vi.mocked(db.contentPlan.create).mockResolvedValue({
        id: "plan1",
        name: "Scoped Plan",
        kind: "template",
        status: "draft",
        cityId: "city1",
        city: { id: "city1", name: "Test City" },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ name: "Scoped Plan" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe("Scoped Plan");
    });

    it("should return 403 when scoped user sends foreign cityId", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.deriveContentPlannerCityScope).mockResolvedValue(["city1"]);
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(false);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ cityId: "foreign_city", name: "Foreign Plan" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      expect(db.contentPlan.create).not.toHaveBeenCalled();
    });

    it("should derive parkId for park_lead and create own-park plan", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "park_lead" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);
      vi.mocked(scope.deriveContentPlannerCityScope).mockResolvedValue(["city1"]);
      vi.mocked(scope.deriveContentPlannerParkScope).mockResolvedValue(["park1"]);
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.city.findUnique).mockResolvedValue({ id: "city1", isActive: true } as any);
      vi.mocked(db.park.findUnique).mockResolvedValue({ id: "park1", cityId: "city1", isActive: true } as any);
      vi.mocked(db.contentPlan.create).mockResolvedValue({
        id: "plan1",
        name: "Park Plan",
        kind: "template",
        status: "draft",
        cityId: "city1",
        parkId: "park1",
        city: { id: "city1", name: "Test City" },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/plans", {
        method: "POST",
        body: JSON.stringify({ name: "Park Plan" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      // Verify the derived parkId was used in the DB create call
      expect(data.name).toBe("Park Plan");
      expect(db.contentPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ parkId: "park1" }) })
      );
    });
  });
});
