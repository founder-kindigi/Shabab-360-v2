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
    contentPlanBlock: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe("Content Planner Blocks [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/admin/content-planner/blocks/[id]", () => {
    it("should return block with resources and activities when user has read permission", async () => {
      const mockBlock = {
        id: "block1",
        sessionId: "session1",
        teamId: "team1",
        category: "tadreeb",
        title: "Islamic Studies",
        content: "Quran memorization and understanding",
        sortOrder: 0,
        status: "published",
        team: {
          id: "team1",
          name: "Tadreeb Team",
          code: "tadreeb",
        },
        resources: [
          {
            id: "res1",
            label: "Quran App",
            url: "https://quran.com",
            kind: "external_link",
          },
        ],
        activities: [
          {
            id: "act1",
            title: "Prepare lesson",
            description: "Review content",
            scheduledFor: new Date("2024-01-20"),
          },
        ],
        session: {
          id: "session1",
          sessionDate: new Date("2024-01-15"),
          planId: "plan1",
          plan: {
            id: "plan1",
            name: "City Plan",
            city: { name: "Dubai" },
          },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(
        mockBlock as any
      );
      vi.mocked(scope.canReadContentPlan).mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1"
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe("block1");
      expect(data.category).toBe("tadreeb");
      expect(data.resources).toHaveLength(1);
      expect(data.activities).toHaveLength(1);
    });

    it("should return 404 when block does not exist", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/missing"
      );
      const params = Promise.resolve({ id: "missing" });
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("not found");
    });

    it("should return 403 when user lacks read permission for plan scope", async () => {
      const mockBlock = {
        id: "block1",
        session: {
          planId: "plan1",
          plan: {
            id: "plan1",
            name: "Other City Plan",
          },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(
        mockBlock as any
      );
      vi.mocked(scope.canReadContentPlan).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1"
      );
      const params = Promise.resolve({ id: "block1" });
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
        "http://localhost/api/admin/content-planner/blocks/block1"
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await GET(request, { params });

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /api/admin/content-planner/blocks/[id]", () => {
    it("should update block when user has write permission", async () => {
      const mockExisting = {
        id: "block1",
        sessionId: "session1",
        category: "tadreeb",
        title: "Islamic Studies",
        content: "Quran memorization",
        sortOrder: 0,
        status: "draft",
        session: {
          id: "session1",
          planId: "plan1",
          plan: {
            cityId: "city1",
            batchId: null,
            parkId: null,
          },
        },
      };

      const mockUpdated = {
        ...mockExisting,
        title: "Advanced Islamic Studies",
        content: "Quran memorization and Tafsir",
        status: "published",
        team: {
          id: "team1",
          name: "Tadreeb Team",
          code: "tadreeb",
        },
        session: {
          id: "session1",
          sessionDate: new Date("2024-01-15"),
          plan: { id: "plan1", name: "City Plan" },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.contentPlanBlock.update).mockResolvedValue(
        mockUpdated as any
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        {
          method: "PATCH",
          body: JSON.stringify({
            title: "Advanced Islamic Studies",
            content: "Quran memorization and Tafsir",
            status: "published",
          }),
        }
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe("Advanced Islamic Studies");
      expect(data.status).toBe("published");
    });

    it("should reject malformed JSON in request body", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        {
          method: "PATCH",
          body: "invalid json{",
        }
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid JSON");
    });

    it("should reject invalid payload with empty content", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        {
          method: "PATCH",
          body: JSON.stringify({
            content: "", // invalid: too short
          }),
        }
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(400);
    });

    it("should return 404 when block does not exist", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/missing",
        {
          method: "PATCH",
          body: JSON.stringify({ title: "New Title" }),
        }
      );
      const params = Promise.resolve({ id: "missing" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(404);
    });

    it("should return 403 when user lacks write permission for plan scope", async () => {
      const mockExisting = {
        id: "block1",
        sessionId: "session1",
        session: {
          id: "session1",
          planId: "plan1",
          plan: {
            cityId: "city2", // different city
            batchId: null,
            parkId: null,
          },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        {
          method: "PATCH",
          body: JSON.stringify({ title: "New Title" }),
        }
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Access denied");
    });

    it("should reject duplicate category+sortOrder combination", async () => {
      const mockExisting = {
        id: "block1",
        sessionId: "session1",
        category: "tadreeb",
        sortOrder: 0,
        session: {
          id: "session1",
          planId: "plan1",
          plan: {
            cityId: "city1",
            batchId: null,
            parkId: null,
          },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique)
        .mockResolvedValueOnce(mockExisting as any)
        .mockResolvedValueOnce({ id: "block2" } as any); // duplicate check
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        {
          method: "PATCH",
          body: JSON.stringify({ sortOrder: 1 }),
        }
      );
      const params = Promise.resolve({ id: "block1" });
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
        "http://localhost/api/admin/content-planner/blocks/block1",
        {
          method: "PATCH",
          body: JSON.stringify({ title: "New Title" }),
        }
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/admin/content-planner/blocks/[id]", () => {
    it("should delete block when user has write permission", async () => {
      const mockExisting = {
        id: "block1",
        sessionId: "session1",
        category: "tadreeb",
        title: "Islamic Studies",
        status: "draft",
        session: {
          id: "session1",
          planId: "plan1",
          plan: {
            cityId: "city1",
            batchId: null,
            parkId: null,
          },
        },
      };

      const mockDeleted = {
        id: "block1",
        sessionId: "session1",
        category: "tadreeb",
        title: "Islamic Studies",
        status: "draft",
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.contentPlanBlock.delete).mockResolvedValue(
        mockDeleted as any
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        {
          method: "DELETE",
          body: JSON.stringify({ reason: "Content no longer relevant" }),
        }
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain("deleted successfully");
    });

    it("should accept empty body for delete", async () => {
      const mockExisting = {
        id: "block1",
        sessionId: "session1",
        session: {
          id: "session1",
          planId: "plan1",
          plan: {
            cityId: "city1",
            batchId: null,
            parkId: null,
          },
        },
      };

      const mockDeleted = {
        id: "block1",
        sessionId: "session1",
        category: "tadreeb",
        title: "Islamic Studies",
        status: "draft",
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.contentPlanBlock.delete).mockResolvedValue(
        mockDeleted as any
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        { method: "DELETE" }
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(200);
    });

    it("should return 404 when block does not exist", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/missing",
        { method: "DELETE" }
      );
      const params = Promise.resolve({ id: "missing" });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(404);
    });

    it("should return 403 when user lacks write permission for plan scope", async () => {
      const mockExisting = {
        id: "block1",
        sessionId: "session1",
        session: {
          id: "session1",
          planId: "plan1",
          plan: {
            cityId: "city2", // different city
            batchId: null,
            parkId: null,
          },
        },
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(false);

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        { method: "DELETE" }
      );
      const params = Promise.resolve({ id: "block1" });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Access denied");
    });

    it("should log audit event with delete action", async () => {
      const { logAudit } = await import("@/lib/audit");

      const mockExisting = {
        id: "block1",
        sessionId: "session1",
        session: {
          id: "session1",
          planId: "plan1",
          plan: {
            cityId: "city1",
            batchId: null,
            parkId: null,
          },
        },
      };

      const mockDeleted = {
        id: "block1",
        sessionId: "session1",
        category: "tadreeb",
        title: "Islamic Studies",
        status: "draft",
      };

      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue(null as any);
      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(
        mockExisting as any
      );
      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);
      vi.mocked(db.contentPlanBlock.delete).mockResolvedValue(
        mockDeleted as any
      );

      const request = new NextRequest(
        "http://localhost/api/admin/content-planner/blocks/block1",
        {
          method: "DELETE",
          body: JSON.stringify({ reason: "Outdated content" }),
        }
      );
      const params = Promise.resolve({ id: "block1" });
      await DELETE(request, { params });

      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          entityType: "content_plan_block",
          entityId: "block1",
        })
      );
    });
  });
});
