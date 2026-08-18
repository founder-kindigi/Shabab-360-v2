import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userHasCapability: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: mocks.userHasCapability,
}));

describe("GET /api/admin/teams/ui-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      user: { id: "user_1", role: "city_head" },
    });
  });

  it("returns the narrow server-derived flags for a scoped viewer", async () => {
    mocks.userHasCapability.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      canView: true,
      canManage: false,
      isHq: false,
    });
    expect(mocks.userHasCapability).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user_1" }),
      "organisation.view"
    );
  });

  it("identifies HQ on the server without exposing a role name", async () => {
    mocks.requireAuth.mockResolvedValue({
      user: { id: "user_hq", role: "super_admin" },
    });
    mocks.userHasCapability.mockResolvedValue(true);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      canView: true,
      canManage: true,
      isHq: true,
    });
  });

  it("denies users who lack Teams view capability", async () => {
    mocks.userHasCapability.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("preserves authentication failures", async () => {
    mocks.requireAuth.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const response = await GET();

    expect(response.status).toBe(401);
  });
});
