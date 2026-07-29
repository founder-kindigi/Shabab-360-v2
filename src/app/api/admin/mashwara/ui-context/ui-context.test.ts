import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userHasCapability: vi.fn(),
  isHqRole: vi.fn(),
  resolveMashwaraActorCity: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
}));
vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: mocks.userHasCapability,
}));
vi.mock("@/lib/auth/scope", () => ({
  isHqRole: mocks.isHqRole,
}));
vi.mock("@/lib/auth/mashwara-scope", () => ({
  resolveMashwaraActorCity: mocks.resolveMashwaraActorCity,
}));

import { GET } from "./route";

const hqUser = { id: "admin-1", role: "super_admin" };
const cityHeadUser = { id: "city-head-1", role: "city_head" };

describe("GET /api/admin/mashwara/ui-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.requireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const res = await GET();
    expect(res.status).toBe(401);
    expect(mocks.userHasCapability).not.toHaveBeenCalled();
  });

  it("returns 403 when user lacks mashwara.view capability", async () => {
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    // First call is mashwara.view (false), second is mashwara.manage
    mocks.userHasCapability.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(mocks.resolveMashwaraActorCity).not.toHaveBeenCalled();
  });

  it("returns HQ context with actorCityId null and isHq true", async () => {
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.userHasCapability
      .mockResolvedValueOnce(true)  // mashwara.view
      .mockResolvedValueOnce(true); // mashwara.manage
    mocks.isHqRole.mockReturnValue(true);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.canView).toBe(true);
    expect(body.canManage).toBe(true);
    expect(body.isHq).toBe(true);
    expect(body.actorCityId).toBeNull();
    // HQ must NOT call resolveMashwaraActorCity
    expect(mocks.resolveMashwaraActorCity).not.toHaveBeenCalled();
  });

  it("returns scoped context with actorCityId resolved for city_head", async () => {
    mocks.requireAuth.mockResolvedValue({ user: cityHeadUser });
    mocks.userHasCapability
      .mockResolvedValueOnce(true)   // mashwara.view
      .mockResolvedValueOnce(true);  // mashwara.manage
    mocks.isHqRole.mockReturnValue(false);
    mocks.resolveMashwaraActorCity.mockResolvedValue({ cityId: "city-lhr" });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.canView).toBe(true);
    expect(body.canManage).toBe(true);
    expect(body.isHq).toBe(false);
    expect(body.actorCityId).toBe("city-lhr");
    // Must pass only the user — no requestedCityId
    expect(mocks.resolveMashwaraActorCity).toHaveBeenCalledWith(cityHeadUser);
  });

  it("returns 403 when scoped city resolution fails", async () => {
    mocks.requireAuth.mockResolvedValue({ user: cityHeadUser });
    mocks.userHasCapability
      .mockResolvedValueOnce(true)  // mashwara.view
      .mockResolvedValueOnce(false); // mashwara.manage
    mocks.isHqRole.mockReturnValue(false);
    mocks.resolveMashwaraActorCity.mockResolvedValue({
      error: "Active staff record not found",
      status: 403,
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Active staff record not found");
    // Must not return a ui-context payload
    expect(body).not.toHaveProperty("canView");
    expect(body).not.toHaveProperty("actorCityId");
  });

  it("returns canManage false when user has view but not manage capability", async () => {
    mocks.requireAuth.mockResolvedValue({ user: cityHeadUser });
    mocks.userHasCapability
      .mockResolvedValueOnce(true)   // mashwara.view
      .mockResolvedValueOnce(false); // mashwara.manage
    mocks.isHqRole.mockReturnValue(false);
    mocks.resolveMashwaraActorCity.mockResolvedValue({ cityId: "city-lhr" });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.canView).toBe(true);
    expect(body.canManage).toBe(false);
    expect(body.actorCityId).toBe("city-lhr");
  });

  it("does not return role name or any user PII in response", async () => {
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.userHasCapability.mockResolvedValue(true);
    mocks.isHqRole.mockReturnValue(true);

    const res = await GET();
    const body = await res.json();

    expect(body).not.toHaveProperty("role");
    expect(body).not.toHaveProperty("name");
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("email");
    expect(Object.keys(body).sort()).toEqual(
      ["actorCityId", "canManage", "canView", "isHq"].sort(),
    );
  });
});
