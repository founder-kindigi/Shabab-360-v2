import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import * as authorize from "@/lib/auth/authorize";
import * as scope from "@/lib/content-planner/scope";
import { db } from "@/lib/db";

vi.mock("@/lib/auth/authorize");
vi.mock("@/lib/content-planner/scope");
vi.mock("@/lib/db", () => ({
  db: {
    contentPlanSession: { findUnique: vi.fn() },
    collaborationTeam: { findUnique: vi.fn() },
    contentPlanBlock: { findUnique: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe("Content Planner Blocks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/admin/content-planner/blocks", () => {
    it("should reject unapproved category", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/blocks", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session1",
          teamId: "team1",
          category: "media", // Not approved
          content: "Test content",
          sortOrder: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should reject block creation on off-day session", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue({
        id: "session1",
        planId: "plan1",
        isOffDay: true,
        plan: { cityId: "city1", batchId: null, parkId: null },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/blocks", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session1",
          teamId: "team1",
          category: "sports",
          content: "Test content",
          sortOrder: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Cannot create content blocks for off-day");
    });

    it("should reject when user cannot write to plan scope", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue({
        id: "session1",
        planId: "plan1",
        isOffDay: false,
        plan: { cityId: "city2", batchId: null, parkId: null },
      } as any);

      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(false);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/blocks", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session1",
          teamId: "team1",
          category: "sports",
          content: "Test content",
          sortOrder: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it("should reject when team does not belong to plan city", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue({
        id: "session1",
        planId: "plan1",
        isOffDay: false,
        plan: { cityId: "city1", batchId: null, parkId: null },
      } as any);

      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);

      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
        id: "team1",
        cityId: "city2", // Different city
        code: "sports",
        isActive: true,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/blocks", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session1",
          teamId: "team1",
          category: "sports",
          content: "Test content",
          sortOrder: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("same city");
    });

    it("should reject when category does not match team code", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue({
        id: "session1",
        planId: "plan1",
        isOffDay: false,
        plan: { cityId: "city1", batchId: null, parkId: null },
      } as any);

      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);

      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
        id: "team1",
        cityId: "city1",
        code: "skills", // Skills team
        isActive: true,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/blocks", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session1",
          teamId: "team1",
          category: "sports", // Sports category with skills team - mismatch!
          content: "Test content",
          sortOrder: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("must use team");
    });

    it("should accept exercises category with sports team", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue({
        id: "session1",
        planId: "plan1",
        isOffDay: false,
        plan: { cityId: "city1", batchId: null, parkId: null },
      } as any);

      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);

      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
        id: "team1",
        cityId: "city1",
        code: "sports",
        isActive: true,
      } as any);

      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(null);

      const mockBlock = {
        id: "block1",
        sessionId: "session1",
        teamId: "team1",
        category: "exercises",
        content: "Warm-up drills",
        sortOrder: 0,
        team: { id: "team1", name: "Sports", code: "sports" },
        session: { id: "session1", sessionDate: new Date(), plan: { id: "plan1", name: "Test" } },
      };
      vi.mocked(db.contentPlanBlock.create).mockResolvedValue(mockBlock as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/blocks", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session1",
          teamId: "team1",
          category: "exercises", // Exercises maps to sports team
          content: "Warm-up drills",
          sortOrder: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.category).toBe("exercises");
    });

    it("should reject duplicate category+sortOrder in session", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "super_admin" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue({
        id: "session1",
        planId: "plan1",
        isOffDay: false,
        plan: { cityId: "city1", batchId: null, parkId: null },
      } as any);

      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);

      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
        id: "team1",
        cityId: "city1",
        code: "sports",
        isActive: true,
      } as any);

      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue({
        id: "existing1",
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/blocks", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session1",
          teamId: "team1",
          category: "sports",
          content: "Test content",
          sortOrder: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("already exists");
    });

    it("should create block when all validations pass", async () => {
      vi.mocked(authorize.requireAuth).mockResolvedValue({
        user: { id: "user1", role: "city_head", assignedCityId: "city1" },
      } as any);
      vi.mocked(authorize.requireCapability).mockResolvedValue({ user: {} } as any);

      vi.mocked(db.contentPlanSession.findUnique).mockResolvedValue({
        id: "session1",
        planId: "plan1",
        isOffDay: false,
        plan: { cityId: "city1", batchId: null, parkId: null },
      } as any);

      vi.mocked(scope.canWriteContentPlan).mockResolvedValue(true);

      vi.mocked(db.collaborationTeam.findUnique).mockResolvedValue({
        id: "team1",
        cityId: "city1",
        code: "tadreeb",
        isActive: true,
      } as any);

      vi.mocked(db.contentPlanBlock.findUnique).mockResolvedValue(null);

      const mockBlock = {
        id: "block1",
        sessionId: "session1",
        teamId: "team1",
        category: "tadreeb",
        title: "Islamic Studies",
        content: "Quran memorization and understanding",
        sortOrder: 0,
        status: "draft",
        team: { id: "team1", name: "Tadreeb", code: "tadreeb" },
        session: {
          id: "session1",
          sessionDate: new Date("2026-07-25"),
          plan: { id: "plan1", name: "Lahore Template" },
        },
      };
      vi.mocked(db.contentPlanBlock.create).mockResolvedValue(mockBlock as any);

      const request = new NextRequest("http://localhost:3000/api/admin/content-planner/blocks", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session1",
          teamId: "team1",
          category: "tadreeb",
          title: "Islamic Studies",
          content: "Quran memorization and understanding",
          sortOrder: 0,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBe("block1");
      expect(data.category).toBe("tadreeb");
    });
  });
});
