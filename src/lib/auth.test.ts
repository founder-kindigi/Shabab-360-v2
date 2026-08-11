import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let credentialsConfig: { authorize?: (credentials: { email: string; password: string }) => Promise<unknown> } | undefined;

  return {
    findUnique: vi.fn(),
    credentialsProvider: vi.fn((config) => {
      credentialsConfig = config;
      return config;
    }),
    getCredentialsConfig: () => credentialsConfig,
  };
});

vi.mock("next-auth/providers/credentials", () => ({ default: mocks.credentialsProvider }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.findUnique },
  },
}));

import { authOptions } from "./auth";

describe("JWT session invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

describe("credentials login diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a non-PII reason when an active account cannot be resolved", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const credentialsProvider = mocks.getCredentialsConfig();

    await expect(credentialsProvider?.authorize?.({
      email: "operator@example.com",
      password: "not-a-real-password",
    })).resolves.toBeNull();

    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({ event: "credentials_login_denied", reason: "account_unavailable" }),
    );
  });
});
