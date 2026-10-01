import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthMock = vi.fn();
const userHasCapabilityMock = vi.fn();
const deriveContentPlannerCityScopeMock = vi.fn();

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: userHasCapabilityMock,
}));

vi.mock("@/lib/auth/scope", () => ({
  isHqRole: (role: string) => role === "super_admin" || role === "program_admin",
}));

vi.mock("@/lib/content-planner/scope", () => ({
  deriveContentPlannerCityScope: deriveContentPlannerCityScopeMock,
}));

describe("GET /api/admin/content-planner/ui-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deriveContentPlannerCityScopeMock.mockResolvedValue(["city-1"]);
  });

  it("returns the authentication response without evaluating capabilities", async () => {
    const { NextResponse } = await import("next/server");
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireAuthMock.mockResolvedValue(authResponse);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(401);
    expect(userHasCapabilityMock).not.toHaveBeenCalled();
  });

  it("fails closed when content.view is missing", async () => {
    const user = { id: "user-1", role: "city_head" };
    requireAuthMock.mockResolvedValue({ user });
    userHasCapabilityMock.mockImplementation(async (_user, capability) => capability === "content.manage");

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("returns server-resolved scoped capabilities without role details", async () => {
    const user = { id: "user-1", role: "city_head" };
    requireAuthMock.mockResolvedValue({ user });
    userHasCapabilityMock.mockResolvedValue(true);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      canView: true,
      canManage: true,
      isHq: false,
      actorCityId: "city-1",
    });
    expect(body).not.toHaveProperty("role");
    expect(body).not.toHaveProperty("userId");
  });

  it("requires explicit city selection for HQ through the isHq flag", async () => {
    const user = { id: "user-1", role: "super_admin" };
    requireAuthMock.mockResolvedValue({ user });
    userHasCapabilityMock.mockImplementation(async (_user, capability) => capability === "content.view");

    const { GET } = await import("./route");
    const response = await GET();

    expect(await response.json()).toEqual({
      canView: true,
      canManage: false,
      isHq: true,
      actorCityId: null,
    });
    expect(deriveContentPlannerCityScopeMock).not.toHaveBeenCalled();
  });

  it("fails closed when a scoped actor has no single active city", async () => {
    const user = { id: "user-1", role: "city_head" };
    requireAuthMock.mockResolvedValue({ user });
    userHasCapabilityMock.mockResolvedValue(true);
    deriveContentPlannerCityScopeMock.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Active city scope is unavailable" });
  });
});
