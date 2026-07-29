import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  dbUserFindUnique: vi.fn(),
  dbUserFindFirst: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
  bcryptHash: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.dbUserFindUnique,
      findFirst: mocks.dbUserFindFirst,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.bcryptHash,
  },
}));

describe("POST /api/admin/guardians/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.bcryptHash.mockResolvedValue("hashed-password");
  });

  const request = (body: any) =>
    new NextRequest("http://localhost/api/admin/guardians/invite", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("creates a guardian and returns a temporary password with secure headers", async () => {
    mocks.dbUserFindUnique.mockResolvedValue(null);
    mocks.dbUserFindFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (cb) => {
      return {
        user: { id: "user-1", email: "guardian@example.com", mustResetPwd: true },
        guardian: { id: "guardian-1", name: "Test Guardian" },
      };
    });

    const response = await POST(
      request({
        name: "Test Guardian",
        email: "guardian@example.com",
        phone: "1234567890",
        relationship: "Father",
      })
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store, no-cache, max-age=0, must-revalidate");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");

    const body = await response.json();
    expect(body.temporaryPassword).toEqual(expect.any(String));
    expect(body.user.id).toBe("user-1");
  });
});
