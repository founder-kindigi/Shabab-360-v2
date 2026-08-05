import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as verifyScopes } from "../verify-scopes/route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  requireCityScope: vi.fn(),
  requireParkScope: vi.fn(),
  requireGroupScope: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  resolveActorCity: mocks.resolveActorCity,
  requireCityScope: mocks.requireCityScope,
  requireParkScope: mocks.requireParkScope,
  requireGroupScope: mocks.requireGroupScope,
}));

describe("V3-702 Multi-City Scoped Security & Isolation Engine API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("verifies super admin has global HQ access across all cities", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "usr_admin", role: "super_admin" },
    });
    mocks.resolveActorCity.mockResolvedValue(null);
    mocks.requireCityScope.mockReturnValue(true);

    const req = new NextRequest("http://localhost/api/admin/pilot/verify-scopes");
    const res = await verifyScopes(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("verified");
    expect(data.verificationChecks.isHqRole).toBe(true);
  });

  it("verifies city head has same-city access and cross-city isolation denied", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "usr_city_head", role: "city_head", assignedCityId: "city_lahore" },
    });
    mocks.resolveActorCity.mockResolvedValue("city_lahore");
    mocks.requireCityScope.mockImplementation((user: any, cityId: string) => cityId === "city_lahore");

    const req = new NextRequest("http://localhost/api/admin/pilot/verify-scopes");
    const res = await verifyScopes(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("verified");
    expect(data.verificationChecks.sameCityAccess).toBe(true);
    expect(data.verificationChecks.crossCityAccessDenied).toBe(true);
  });
});
