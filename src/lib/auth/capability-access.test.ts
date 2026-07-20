import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  roleFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    roleCapabilityOverride: { findUnique: mocks.roleFindUnique },
    userCapabilityOverride: { findUnique: mocks.userFindUnique },
  },
}));

import { userHasCapability } from "@/lib/auth/capability-access";

describe("database-backed capability access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.roleFindUnique.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue(null);
  });

  it("uses the role default when no exception exists", async () => {
    await expect(
      userHasCapability({ id: "user-1", role: "park_admin" }, "attendance.mark")
    ).resolves.toBe(true);
  });

  it("lets an active individual denial override an allowed role default", async () => {
    mocks.userFindUnique.mockResolvedValue({
      effect: "deny",
      isActive: true,
      expiresAt: null,
    });

    await expect(
      userHasCapability({ id: "user-1", role: "park_admin" }, "attendance.mark")
    ).resolves.toBe(false);
  });

  it("ignores an expired override and returns to the current policy", async () => {
    mocks.userFindUnique.mockResolvedValue({
      effect: "deny",
      isActive: true,
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      userHasCapability(
        { id: "user-1", role: "park_admin" },
        "attendance.mark",
        new Date("2026-07-16T00:00:00.000Z")
      )
    ).resolves.toBe(true);
  });

  it("fails closed for an invalid user or a database error", async () => {
    await expect(
      userHasCapability({ id: "user-1", role: "untrusted_role" }, "attendance.mark")
    ).resolves.toBe(false);
    expect(mocks.roleFindUnique).not.toHaveBeenCalled();

    mocks.roleFindUnique.mockRejectedValue(new Error("database unavailable"));
    await expect(
      userHasCapability({ id: "user-1", role: "park_admin" }, "attendance.mark")
    ).resolves.toBe(false);
  });
});
