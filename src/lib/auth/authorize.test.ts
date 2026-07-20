import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn(), userHasCapability: vi.fn() }));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: mocks.userHasCapability }));

import { requireAuth, requireCapability, requireRole } from "./authorize";

describe("authorization guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies missing sessions before a route can access protected data", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const result = await requireAuth();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    await expect((result as Response).json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("denies a valid session whose password reset is still mandatory", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "super_admin", mustResetPwd: true },
    });

    const result = await requireRole(["super_admin"]);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    await expect((result as Response).json()).resolves.toEqual({
      error: "Password reset required",
    });
  });

  it("denies roles outside the route's explicit allow-list", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "guardian", mustResetPwd: false },
    });

    const result = await requireRole(["super_admin", "program_admin"]);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    await expect((result as Response).json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns the session user only after all authentication checks pass", async () => {
    const user = { id: "user-1", role: "park_admin", mustResetPwd: false };
    mocks.getServerSession.mockResolvedValue({ user });

    await expect(requireAuth()).resolves.toEqual({ user });
    await expect(requireRole(["park_admin"])).resolves.toBeNull();
  });

  it("denies a module capability before a route reads scoped data", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "park_admin", mustResetPwd: false },
    });
    mocks.userHasCapability.mockResolvedValue(false);

    const result = await requireCapability("attendance.mark");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    await expect((result as Response).json()).resolves.toEqual({ error: "Forbidden" });
    expect(mocks.userHasCapability).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", role: "park_admin" }),
      "attendance.mark"
    );
  });
});
