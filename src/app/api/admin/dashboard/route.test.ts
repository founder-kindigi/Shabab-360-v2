import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), requireCapability: vi.fn() }));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET } from "./route";

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
  });

  it("denies dashboard access before loading operational data", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/dashboard"));

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith(
      "dashboard.view",
      expect.objectContaining({ id: "admin-1" })
    );
  });
});
