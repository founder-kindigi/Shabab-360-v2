import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));

import { POST } from "./route";

describe("POST /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({ user: { id: "super-admin" } });
  });

  it("rejects the legacy direct-password account creation path", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Use /api/admin/invite to create staff accounts",
    });
  });

  it("requires scope administration capability before returning the legacy response", async () => {
    const { NextResponse } = await import("next/server");
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST();

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("access.scope.manage");
  });
});
