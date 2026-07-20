import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  userFindMany: vi.fn(),
  transaction: vi.fn(),
  txUserUpdateMany: vi.fn(),
  txStaffMetaFindMany: vi.fn(),
  txStaffMetaUpdateMany: vi.fn(),
  txStaffMetaCreateMany: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: mocks.userFindMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/users/batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/users/batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.userFindMany.mockResolvedValue([{ id: "user-1" }, { id: "user-2" }]);
    mocks.transaction.mockImplementation(async (work) => work({
      user: { updateMany: mocks.txUserUpdateMany },
      staffMeta: {
        findMany: mocks.txStaffMetaFindMany,
        updateMany: mocks.txStaffMetaUpdateMany,
        createMany: mocks.txStaffMetaCreateMany,
      },
    }));
  });

  it("invalidates every selected session when deactivating accounts", async () => {
    mocks.txUserUpdateMany.mockResolvedValue({ count: 2 });

    const response = await POST(request({ action: "deactivate", userIds: ["user-1", "user-2"] }));

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txUserUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["user-1", "user-2"] } },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });
  });

  it("denies scope management before loading selected users", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await POST(request({ action: "deactivate", userIds: ["user-1"] }));

    expect(response.status).toBe(403);
    expect(mocks.userFindMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("updates role metadata and invalidates sessions inside the same transaction", async () => {
    mocks.txStaffMetaFindMany.mockResolvedValue([{ id: "meta-1", userId: "user-1" }]);
    mocks.txStaffMetaUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txStaffMetaCreateMany.mockResolvedValue({ count: 1 });
    mocks.txUserUpdateMany.mockResolvedValue({ count: 2 });

    const response = await POST(request({
      action: "assign-role",
      role: "city_head",
      userIds: ["user-1", "user-2"],
    }));

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txStaffMetaUpdateMany).toHaveBeenCalledWith({
      where: { userId: { in: ["user-1", "user-2"] } },
      data: { role: "city_head" },
    });
    expect(mocks.txStaffMetaCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "user-2", role: "city_head" }],
    });
    expect(mocks.txUserUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["user-1", "user-2"] } },
      data: { tokenVersion: { increment: 1 } },
    });
  });
});
