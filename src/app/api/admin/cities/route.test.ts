import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  cityFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
  requireAuth: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { city: { findMany: mocks.cityFindMany } } }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET } from "./route";

describe("GET /api/admin/cities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("denies organization access before listing cities", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.cityFindMany).not.toHaveBeenCalled();
  });
});
