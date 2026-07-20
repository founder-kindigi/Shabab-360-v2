import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  parkFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({ db: { park: { findMany: mocks.parkFindMany } } }));

import { GET } from "./route";

describe("GET /api/admin/parks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "city-head", role: "city_head" } });
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("denies organization access before listing parks", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/parks"));

    expect(response.status).toBe(403);
    expect(mocks.parkFindMany).not.toHaveBeenCalled();
  });
});
