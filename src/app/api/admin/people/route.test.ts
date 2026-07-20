import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), requireCapability: vi.fn() }));
vi.mock("@/lib/auth/authorize", () => ({ requireRole: mocks.requireRole, requireCapability: mocks.requireCapability, requireAuth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET } from "./route";

describe("GET /api/admin/people", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockResolvedValue(null); });
  it("denies directory access before querying staff records", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/people"));
    expect(response.status).toBe(403);
  });
});
