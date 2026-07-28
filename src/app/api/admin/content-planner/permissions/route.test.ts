/**
 * Tests for GET /api/admin/content-planner/permissions
 *
 * Covers: unauthenticated denial, dynamic grant/deny via userHasCapability,
 * response contains no role-derived authority beyond requested booleans.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: vi.fn(),
}));

import * as auth from "@/lib/auth/authorize";
import * as caps from "@/lib/auth/capability-access";

async function getPermissions() {
  const { GET } = await import("./route");
  return GET();
}

describe("GET /api/admin/content-planner/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await getPermissions();
    expect(res.status).toBe(401);
  });

  it("returns { canView: true, canManage: true, isHq: true } for super_admin", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue({
      user: { id: "u1", role: "super_admin" },
    } as any);
    vi.mocked(caps.userHasCapability).mockResolvedValue(true);

    const res = await getPermissions();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ canView: true, canManage: true, isHq: true });
  });

  it("returns { canView: true, canManage: false, isHq: false } for park_lead", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue({
      user: { id: "u2", role: "park_lead" },
    } as any);
    vi.mocked(caps.userHasCapability).mockImplementation(
      async (_user: any, cap: string) => cap === "content.view"
    );

    const res = await getPermissions();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ canView: true, canManage: false, isHq: false });
  });

  it("returns all false for denied user", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue({
      user: { id: "u3", role: "murabbi" },
    } as any);
    vi.mocked(caps.userHasCapability).mockResolvedValue(false);

    const res = await getPermissions();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ canView: false, canManage: false, isHq: false });
  });

  it("response contains no role name or hard-coded authority", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue({
      user: { id: "u1", role: "super_admin" },
    } as any);
    vi.mocked(caps.userHasCapability).mockResolvedValue(false);

    const res = await getPermissions();
    const body = await res.json();
    // The response must not expose role names or role-based flags beyond the
    // three explicitly requested booleans.
    expect(Object.keys(body)).toEqual(["canView", "canManage", "isHq"]);
    expect(body).not.toHaveProperty("role");
    expect(body).not.toHaveProperty("isSuperAdmin");
    expect(body).not.toHaveProperty("permissions");
  });

  it("passes content.view and content.manage to userHasCapability", async () => {
    vi.mocked(auth.requireAuth).mockResolvedValue({
      user: { id: "u1", role: "city_head" },
    } as any);
    vi.mocked(caps.userHasCapability).mockResolvedValue(true);

    await getPermissions();
    expect(caps.userHasCapability).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1" }),
      "content.view"
    );
    expect(caps.userHasCapability).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1" }),
      "content.manage"
    );
  });
});
