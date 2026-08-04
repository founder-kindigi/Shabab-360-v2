import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), requireCapability: vi.fn(), requireRoleAndCapability: vi.fn() }));
vi.mock("@/lib/auth/authorize", () => ({ requireRole: mocks.requireRole, requireCapability: mocks.requireCapability, requireRoleAndCapability: mocks.requireRoleAndCapability, requireAuth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET } from "./route";

describe("GET /api/admin/students", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockResolvedValue(null); mocks.requireRoleAndCapability.mockResolvedValue(null); });
  it("denies student management before querying participants", async () => {
    mocks.requireRoleAndCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/students"));
    expect(response.status).toBe(403);
  });
});
