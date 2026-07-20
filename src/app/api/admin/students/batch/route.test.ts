import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(), requireAuth: vi.fn(), requireCapability: vi.fn(), findMany: vi.fn(), transaction: vi.fn(), updateMany: vi.fn(), revokeUsers: vi.fn(), logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireRole: mocks.requireRole, requireAuth: mocks.requireAuth, requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({ db: { participant: { findMany: mocks.findMany }, $transaction: mocks.transaction } }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { POST } from "./route";

describe("bulk Shabab deactivation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([
      { id: "participant-1", userId: "user-1", state: "active" },
      { id: "participant-2", userId: "user-2", state: "inactive" },
    ]);
    mocks.transaction.mockImplementation(async (work) => work({
      participant: { updateMany: mocks.updateMany }, user: { updateMany: mocks.revokeUsers },
    }));
    mocks.updateMany.mockResolvedValue({ count: 2 });
  });

  it("revokes sessions only for newly deactivated linked users", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/students/batch", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "deactivate", participantIds: ["participant-1", "participant-2"] }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.revokeUsers).toHaveBeenCalledWith({
      where: { id: { in: ["user-1"] } }, data: { tokenVersion: { increment: 1 } },
    });
  });

  it("denies student management before loading participants", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await POST(new NextRequest("http://localhost/api/admin/students/batch", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "deactivate", participantIds: ["participant-1"] }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
