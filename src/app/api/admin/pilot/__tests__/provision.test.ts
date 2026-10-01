import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as postProvision } from "../provision/route";
import { GET as getHealth } from "../health/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  logAudit: vi.fn(),
  db: {
    city: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn() },
    park: { count: vi.fn() },
    participant: { count: vi.fn() },
    user: { count: vi.fn() },
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

describe("V3-701 Multi-City Pilot Provisioning & Health API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "usr_admin", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
  });

  describe("POST /api/admin/pilot/provision", () => {
    it("provisions new pilot city cleanly and logs audit", async () => {
      mocks.db.city.findUnique.mockResolvedValue(null);
      mocks.db.city.create.mockResolvedValue({
        id: "city_khi",
        name: "Karachi",
        code: "KHI",
        isActive: true,
      });

      const req = new NextRequest("http://localhost/api/admin/pilot/provision", {
        method: "POST",
        body: JSON.stringify({
          name: "Karachi",
          code: "KHI",
        }),
      });

      const res = await postProvision(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.code).toBe("KHI");
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "pilot.city.provision",
        })
      );
    });
  });

  describe("GET /api/admin/pilot/health", () => {
    it("returns multi-city system metrics and schema health status", async () => {
      mocks.db.city.count.mockResolvedValue(3);
      mocks.db.park.count.mockResolvedValue(12);
      mocks.db.participant.count.mockResolvedValue(450);
      mocks.db.user.count.mockResolvedValue(60);

      const req = new NextRequest("http://localhost/api/admin/pilot/health");
      const res = await getHealth(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("healthy");
      expect(data.networkMetrics.activeCities).toBe(3);
    });
  });
});
