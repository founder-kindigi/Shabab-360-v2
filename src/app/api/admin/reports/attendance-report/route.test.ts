import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), requireCapability: vi.fn() }));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET } from "./route";

describe("GET /api/admin/reports/attendance-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "park-lead", role: "park_lead" } });
  });

  it("denies report access before querying attendance", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new Request("http://localhost/api/admin/reports/attendance-report"));

    expect(response.status).toBe(403);
  });
});
