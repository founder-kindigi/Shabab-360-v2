import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getArticles } from "../route";
import { POST as postArticle } from "../../admin/knowledge/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  logAudit: vi.fn(),
  db: {
    knowledgeArticle: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

describe("V3-604 Knowledge Base & Best Practices API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_admin", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
  });

  describe("GET /api/knowledge", () => {
    it("searches published knowledge base articles by query keyword", async () => {
      mocks.db.knowledgeArticle.findMany.mockResolvedValue([
        { id: "art_1", title: "Attendance Best Practices", slug: "attendance-best-practices", category: "best_practices" },
      ]);

      const req = new NextRequest("http://localhost/api/knowledge?q=attendance");
      const res = await getArticles(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].slug).toBe("attendance-best-practices");
    });
  });

  describe("POST /api/admin/knowledge", () => {
    it("publishes new knowledge article with unique slug and audit log", async () => {
      mocks.db.knowledgeArticle.findUnique.mockResolvedValue(null);
      mocks.db.knowledgeArticle.create.mockResolvedValue({
        id: "art_1",
        title: "Weekly Mashwara Operations Guide",
        slug: "weekly-mashwara-guide",
        content: "Detailed operational guide for conducting city and park mashwara meetings effectively.",
        category: "operational_guide",
        isPublished: true,
      });

      const req = new NextRequest("http://localhost/api/admin/knowledge", {
        method: "POST",
        body: JSON.stringify({
          title: "Weekly Mashwara Operations Guide",
          slug: "weekly-mashwara-guide",
          content: "Detailed operational guide for conducting city and park mashwara meetings effectively.",
          category: "operational_guide",
        }),
      });

      const res = await postArticle(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.slug).toBe("weekly-mashwara-guide");
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "knowledge.article.create",
        })
      );
    });
  });
});
