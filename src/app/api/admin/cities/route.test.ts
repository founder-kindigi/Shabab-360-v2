import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse, NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  cityFindMany: vi.fn(),
  cityFindUnique: vi.fn(),
  cityCreate: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
  requireAuth: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    city: {
      findMany: mocks.cityFindMany,
      findUnique: mocks.cityFindUnique,
      create: mocks.cityCreate,
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { GET, POST } from "./route";

describe("Cities Read/Mutation Access Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(null);
  });

  describe("GET /api/admin/cities", () => {
    it("denies organization access before listing cities", async () => {
      mocks.requireCapability.mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );

      const response = await GET();

      expect(response.status).toBe(403);
      expect(mocks.cityFindMany).not.toHaveBeenCalled();
    });

    it("denies access to a City Head (GET)", async () => {
      mocks.requireRole.mockImplementation((allowedRoles: string[]) => {
        if (!allowedRoles.includes("city_head")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return null;
      });

      const response = await GET();
      expect(response.status).toBe(403);
      expect(mocks.cityFindMany).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/admin/cities", () => {
    function createRequest(body: Record<string, unknown>) {
      return new NextRequest("http://localhost/api/admin/cities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("denies access to a City Head (POST)", async () => {
      mocks.requireRole.mockImplementation((allowedRoles: string[]) => {
        if (!allowedRoles.includes("city_head")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return null;
      });

      const response = await POST(createRequest({ name: "Lahore", code: "lhr" }));
      expect(response.status).toBe(403);
      expect(mocks.cityCreate).not.toHaveBeenCalled();
    });
  });
});
