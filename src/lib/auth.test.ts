import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  loginAttemptCount: vi.fn(),
  loginAttemptCreate: vi.fn(),
  loginAttemptDeleteMany: vi.fn(),
  transaction: vi.fn(),
  staffMetaFindUnique: vi.fn(),
  guardianFindUnique: vi.fn(),
  participantFindUnique: vi.fn(),
  bcryptCompare: vi.fn(),
  credentialsProvider: vi.fn((config) => config),
}));

vi.mock("next-auth/providers/credentials", () => ({ default: mocks.credentialsProvider }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.bcryptCompare } }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.findUnique,
    },
    loginAttempt: {
      count: mocks.loginAttemptCount,
      create: mocks.loginAttemptCreate,
      deleteMany: mocks.loginAttemptDeleteMany,
    },
    $transaction: mocks.transaction,
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
    guardian: { findUnique: mocks.guardianFindUnique },
    participant: { findUnique: mocks.participantFindUnique },
  },
}));

import { authOptions } from "./auth";

const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

function credentialsProvider() {
  return authOptions.providers[0] as unknown as {
    authorize: (credentials: { email: string; password: string }) => Promise<unknown>;
  };
}

describe("JWT session invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-rate-limit-secret";
    mocks.loginAttemptCount.mockResolvedValue(0);
    mocks.loginAttemptCreate.mockResolvedValue({ id: "attempt-1" });
    mocks.loginAttemptDeleteMany.mockResolvedValue({ count: 0 });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        loginAttempt: {
          create: mocks.loginAttemptCreate,
          deleteMany: mocks.loginAttemptDeleteMany,
        },
      })
    );
    mocks.bcryptCompare.mockResolvedValue(false);
    mocks.staffMetaFindUnique.mockResolvedValue(null);
    mocks.guardianFindUnique.mockResolvedValue(null);
    mocks.participantFindUnique.mockResolvedValue(null);
  });

  afterAll(() => {
    if (originalNextAuthSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET;
      return;
    }
    process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
  });

  it("invalidates a token when its stored version no longer matches the user", async () => {
    mocks.findUnique.mockResolvedValue({ tokenVersion: 2 });
    const callback = authOptions.callbacks?.jwt;

    const result = await callback!({ token: { id: "user-1", tokenVersion: 1 } } as never);

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { tokenVersion: true },
    });
    expect(result).toEqual({});
  });

  it("retains a token whose version still matches the user", async () => {
    mocks.findUnique.mockResolvedValue({ tokenVersion: 2 });
    const token = { id: "user-1", tokenVersion: 2, role: "super_admin" };
    const callback = authOptions.callbacks?.jwt;

    const result = await callback!({ token } as never);

    expect(result).toEqual(token);
  });

  it("does not log an email address when a login is rejected", async () => {
    const email = "private.user@example.invalid";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.findUnique.mockResolvedValue(null);

    const result = await credentialsProvider().authorize({ email, password: "incorrect-password" });

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith("[NextAuth Authorize] User not found");
    expect(warn.mock.calls.flat().join(" ")).not.toContain(email);
    warn.mockRestore();
  });

  it("rejects a rate-limited identifier before querying a user account", async () => {
    const email = "private.user@example.invalid";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.loginAttemptCount.mockResolvedValue(5);

    const result = await credentialsProvider().authorize({ email, password: "incorrect-password" });

    expect(result).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("[NextAuth Authorize] Rate limit exceeded");
    expect(warn.mock.calls.flat().join(" ")).not.toContain(email);
    warn.mockRestore();
  });

  it("stores only a keyed fingerprint for failed logins", async () => {
    const email = "private.user@example.invalid";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.findUnique.mockResolvedValue(null);

    const result = await credentialsProvider().authorize({ email, password: "incorrect-password" });

    expect(result).toBeNull();
    expect(mocks.loginAttemptCreate).toHaveBeenCalledTimes(1);
    const identifier = mocks.loginAttemptCreate.mock.calls[0][0].data.identifier as string;
    expect(identifier).toHaveLength(64);
    expect(identifier).not.toContain(email);
    expect(mocks.loginAttemptDeleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
    warn.mockRestore();
  });

  it("clears a successful account's prior failed-login records", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      email: "member@example.invalid",
      name: "Member",
      passwordHash: "hash",
      isActive: true,
      mustResetPwd: false,
      tokenVersion: 0,
    });
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.staffMetaFindUnique.mockResolvedValue({
      role: "park_lead",
      assignedCityId: "city-1",
      assignedParkId: "park-1",
      assignedGroupId: null,
    });

    const result = await credentialsProvider().authorize({
      email: "member@example.invalid",
      password: "correct-password",
    });

    expect(result).toMatchObject({ id: "user-1", role: "park_lead" });
    expect(mocks.loginAttemptDeleteMany).toHaveBeenCalledWith({
      where: { identifier: expect.stringMatching(/^[a-f0-9]{64}$/) },
    });
  });

  it("fails closed when rate-limit storage is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.loginAttemptCount.mockRejectedValue(new Error("database unavailable"));

    const result = await credentialsProvider().authorize({
      email: "private.user@example.invalid",
      password: "incorrect-password",
    });

    expect(result).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("[NextAuth Authorize] Rate limit unavailable");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("database unavailable");
    warn.mockRestore();
  });
});
