import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getResources } from "../route";
import { POST as postResource } from "../../admin/resources/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  logAudit: vi.fn(),
  db: {
    city: { findUnique: vi.fn() },
    digitalResource: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  resolveActorCity: mocks.resolveActorCity,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

describe("V3-603 Digital Resource Library API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_murabbi", role: "murabbi" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.resolveActorCity.mockResolvedValue("city_lahore");
  });

  describe("GET /api/resources", () => {
    it("filters digital resources by allowed roles and city scope", async () => {
      mocks.db.digitalResource.findMany.mockResolvedValue([
        { id: "res_1", title: "Murabbi Guide", category: "curriculum", allowedRoles: "murabbi,park_lead", targetCityId: "city_lahore" },
        { id: "res_2", title: "HQ Only Guide", category: "policy", allowedRoles: "super_admin", targetCityId: null },
      ]);

      const req = new NextRequest("http://localhost/api/resources");
      const res = await getResources(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].title).toBe("Murabbi Guide");
    });
  });

  describe("POST /api/admin/resources", () => {
    it("publishes digital resource cleanly with audit logging", async () => {
      mocks.db.digitalResource.create.mockResolvedValue({
        id: "res_1",
        title: "Tadreeb Manual 2026",
        fileUrl: "https://drive.google.com/file/d/123/view",
        category: "curriculum",
        allowedRoles: "all",
      });

      const req = new NextRequest("http://localhost/api/admin/resources", {
        method: "POST",
        body: JSON.stringify({
          title: "Tadreeb Manual 2026",
          fileUrl: "https://drive.google.com/file/d/123/view",
          category: "curriculum",
          allowedRoles: "all",
        }),
      });

      const res = await postResource(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.title).toBe("Tadreeb Manual 2026");
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "resources.digital_resource.create",
        })
      );
    });
  });
});
