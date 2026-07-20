import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), requireCapability: vi.fn() }));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET } from "./route";

describe("GET /api/admin/reports/fee-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
  });

  it("denies fee reporting before querying payments", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/reports/fee-report"));

    expect(response.status).toBe(403);
  });
});
