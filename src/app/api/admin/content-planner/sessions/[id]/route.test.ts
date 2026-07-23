import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, PATCH, DELETE } from "./route";
import * as authorize from "@/lib/auth/authorize";
import * as scope from "@/lib/content-planner/scope";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize");
vi.mock("@/lib/content-planner/scope");
vi.mock("@/lib/db", () => ({
  db: {
    contentPlanSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe("Content Planner Sessions [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/admin/content-planner/sessions/[id]", () => {
    it("should return session with blocks when user has read permission", async () => {
      const mockSession = {
        id: "session1",
        planId: "plan1",
        sessionDate: new Date("2024-01-15"),
        weekLabel: "Week 1",
        dayLabel: "Day 1",
        focusArea: "Character Building",
        isOffDay: false,
        status: "published",
        plan: {
          id: "plan1",
          name: "City Plan",
          cityId: "city1",
          city: { name: "Dubai" },
        },
        blocks: [
          {
            id: "block1",
            category: "tadreeb",
            title: "Islamic Studies",
            content: "Quran memorization",
            sortOrder: 0,
            team: { id: "team1", name: "Tadreeb Team", code: "tadreeb" },
            resources: [],
            _count: { activities: 2 },
          },
        ],
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(
        mockSession as any
      );
      vi.mocked(scope.canReadContentPlan).mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1"
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe("session1");
      expect(data.blocks).toHaveLength(1);
    });

    it("should return 404 when session does not exist", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/missing"
      );
      const params = Promise.resolve({ id: "missing" });
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("not found");
    });

    it("should return 403 when user lacks read permission for plan scope", async () => {
      const mockSession = {
        id: "session1",
        planId: "plan1",
        plan: {
          id: "plan1",
          name: "Other City Plan",
          cityId: "city2",
          city: { name: "Abu Dhabi" },
        },
        blocks: [],
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(
        mockSession as any
      );
      vi.mocked(scope.canReadContentPlan).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1"
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await GET(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Access denied");
    });

    it("should reject when user lacks content.view capability", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "murabbi" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1"
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await GET(request, { params });

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /api/admin/content-planner/sessions/[id]", () => {
    it("should update session when user has write permission", async () => {
      const mockExisting = {
        id: "session1",
        planId: "plan1",
        sessionDate: new Date("2024-01-15"),
        weekLabel: "Week 1",
        dayLabel: "Day 1",
        focusArea: "Character Building",
        status: "draft",
        plan: {
          id: "plan1",
          cityId: "city1",
          batchId: null,
          parkId: null,
        },
      };

      const mockUpdated = {
        ...mockExisting,
        focusArea: "Leadership Development",
        status: "published",
        plan: {
          id: "plan1",
          name: "City Plan",
          city: { name: "Dubai" },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.contentPlanSession.update).mockResolvedValue(
        mockUpdated as any
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        {
          method: "PATCH",
          body: JSON.stringify({
            focusArea: "Leadership Development",
            status: "published",
          }),
        }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.focusArea).toBe("Leadership Development");
      expect(data.status).toBe("published");
    });

    it("should reject malformed JSON in request body", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        {
          method: "PATCH",
          body: "invalid json{",
        }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid JSON");
    });

    it("should reject invalid sessionDate format", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        {
          method: "PATCH",
          body: JSON.stringify({
            sessionDate: "15/01/2024", // invalid format
          }),
        }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(400);
    });

    it("should return 404 when session does not exist", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/missing",
        {
          method: "PATCH",
          body: JSON.stringify({ focusArea: "New Focus" }),
        }
      );
      const params = Promise.resolve({ id: "missing" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(404);
    });

    it("should return 403 when user lacks write permission for plan scope", async () => {
      const mockExisting = {
        id: "session1",
        planId: "plan1",
        plan: {
          id: "plan1",
          cityId: "city2", // different city
          batchId: null,
          parkId: null,
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        {
          method: "PATCH",
          body: JSON.stringify({ focusArea: "New Focus" }),
        }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Access denied");
    });

    it("should reject duplicate sessionDate in same plan", async () => {
      const mockExisting = {
        id: "session1",
        planId: "plan1",
        sessionDate: new Date("2024-01-15"),
        plan: {
          id: "plan1",
          cityId: "city1",
          batchId: null,
          parkId: null,
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique)
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce({ id: "session2" } as any); // duplicate check
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        {
          method: "PATCH",
          body: JSON.stringify({ sessionDate: "2024-01-20" }),
        }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("already exists");
    });

    it("should reject when user lacks content.manage capability", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "murabbi" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        {
          method: "PATCH",
          body: JSON.stringify({ focusArea: "New Focus" }),
        }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/admin/content-planner/sessions/[id]", () => {
    it("should archive session when user has write permission", async () => {
      const mockExisting = {
        id: "session1",
        planId: "plan1",
        status: "published",
        plan: {
          id: "plan1",
          cityId: "city1",
          batchId: null,
          parkId: null,
        },
      };

      const mockArchived = {
        ...mockExisting,
        status: "cancelled",
        plan: {
          id: "plan1",
          name: "City Plan",
          city: { name: "Dubai" },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.contentPlanSession.update).mockResolvedValue(
        mockArchived as any
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        {
          method: "DELETE",
          body: JSON.stringify({ reason: "No longer needed" }),
        }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("cancelled");
    });

    it("should accept empty body for archive", async () => {
      const mockExisting = {
        id: "session1",
        planId: "plan1",
        status: "draft",
        plan: {
          id: "plan1",
          cityId: "city1",
          batchId: null,
          parkId: null,
        },
      };

      const mockArchived = {
        ...mockExisting,
        status: "cancelled",
        plan: {
          id: "plan1",
          name: "City Plan",
          city: { name: "Dubai" },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.contentPlanSession.update).mockResolvedValue(
        mockArchived as any
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        { method: "DELETE" }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(200);
    });

    it("should return 404 when session does not exist", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/missing",
        { method: "DELETE" }
      );
      const params = Promise.resolve({ id: "missing" });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(404);
    });

    it("should return 403 when user lacks write permission for plan scope", async () => {
      const mockExisting = {
        id: "session1",
        planId: "plan1",
        plan: {
          id: "plan1",
          cityId: "city2", // different city
          batchId: null,
          parkId: null,
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        { method: "DELETE" }
      );
      const params = Promise.resolve({ id: "session1" });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Access denied");
    });

    it("should log audit event with reason when provided", async () => {
      const { logAudit } = await import("@/lib/audit");

      const mockExisting = {
        id: "session1",
        planId: "plan1",
        status: "published",
        plan: {
          id: "plan1",
          cityId: "city1",
          batchId: null,
          parkId: null,
        },
      };

      const mockArchived = {
        ...mockExisting,
        status: "cancelled",
        plan: {
          id: "plan1",
          name: "City Plan",
          city: { name: "Dubai" },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.contentPlanSession.update).mockResolvedValue(
        mockArchived as any
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/sessions/session1",
        {
          method: "DELETE",
          body: JSON.stringify({ reason: "Session cancelled by coordinator" }),
        }
      );
      const params = Promise.resolve({ id: "session1" });
      await DELETE(request, { params });

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "archive",
          entityType: "content_plan_session",
          entityId: "session1",
        })
      );
    });
  });
});
