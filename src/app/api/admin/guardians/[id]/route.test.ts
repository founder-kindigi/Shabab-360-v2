import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireRole: mocks.requireRole, requireAuth: mocks.requireAuth, requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({ db: { guardian: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { DELETE, PATCH } from "./route";

const params = { params: Promise.resolve({ id: "guardian-1" }) };

describe("Guardian deactivation session revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.update.mockResolvedValue({ id: "guardian-1", isActive: false });
  });

  it("revokes the linked session when a Guardian is deactivated through PATCH", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "guardian-1", userId: "user-1", isActive: true, name: "Guardian", phone: "0300", children: [],
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/guardians/guardian-1", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isActive: false }),
      }),
      params
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        isActive: false,
        user: { update: { tokenVersion: { increment: 1 } } },
      }),
    }));
  });

  it("revokes the linked session when a Guardian is deactivated through DELETE", async () => {
    mocks.findUnique.mockResolvedValue({ id: "guardian-1", userId: "user-1", isActive: true, name: "Guardian" });

    const response = await DELETE(new NextRequest("http://localhost/api/admin/guardians/guardian-1", { method: "DELETE" }), params);

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ user: { update: { tokenVersion: { increment: 1 } } } }),
    }));
  });

  it("denies guardian management before reading the guardian", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await PATCH(new NextRequest("http://localhost/api/admin/guardians/guardian-1", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isActive: false }) }), params);
    expect(response.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
