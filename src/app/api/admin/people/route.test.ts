import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(), requireAuth: vi.fn(), requireCapability: vi.fn(),
  userFindMany: vi.fn(), userCount: vi.fn(),
}));
vi.mock("@/lib/auth/authorize", () => ({ requireRole: mocks.requireRole, requireCapability: mocks.requireCapability, requireAuth: mocks.requireAuth }));
vi.mock("@/lib/db", () => ({ db: { user: { findMany: mocks.userFindMany, count: mocks.userCount } } }));

import { GET } from "./route";

describe("GET /api/admin/people", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "program", role: "program_admin" } });
  });
  it("denies directory access before querying staff records", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/people"));
    expect(response.status).toBe(403);
  });

  it("does not select contact or reset fields for a normal directory viewer", async () => {
    mocks.userFindMany.mockResolvedValue([]);
    mocks.userCount.mockResolvedValue(0);
    const response = await GET(new NextRequest("http://localhost/api/admin/people"));
    expect(response.status).toBe(200);
    const select = mocks.userFindMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("email");
    expect(select).not.toHaveProperty("phone");
    expect(select).not.toHaveProperty("mustResetPwd");
  });

  it("selects reset state only for Super Admin", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "super", role: "super_admin" } });
    mocks.userFindMany.mockResolvedValue([]);
    mocks.userCount.mockResolvedValue(0);
    await GET(new NextRequest("http://localhost/api/admin/people"));
    expect(mocks.userFindMany.mock.calls[0][0].select.mustResetPwd).toBe(true);
  });
});
