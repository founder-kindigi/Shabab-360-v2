import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(), requireCapability: vi.fn(), userFindUnique: vi.fn(), transaction: vi.fn(),
  roleOverrideFindMany: vi.fn(),
  txOverrideFindUnique: vi.fn(), txOverrideUpsert: vi.fn(), txOverrideUpdate: vi.fn(), txUserUpdate: vi.fn(), txAuditCreate: vi.fn(),
  createAuditLogData: vi.fn((data) => data), sanitizeAuditReason: vi.fn((value) => value),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireRole: mocks.requireRole, requireCapability: mocks.requireCapability }));
vi.mock("@/lib/audit", () => ({ createAuditLogData: mocks.createAuditLogData, sanitizeAuditReason: mocks.sanitizeAuditReason }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mocks.userFindUnique }, $transaction: mocks.transaction, roleCapabilityOverride: { findMany: mocks.roleOverrideFindMany } },
}));

import { DELETE, GET, PUT } from "./route";

const target = { id: "user-1", isActive: true, staffMeta: { role: "park_admin" }, guardian: null, participant: null };
const params = { params: Promise.resolve({ id: "user-1" }) };
const request = (method: "PUT" | "DELETE", body: Record<string, unknown>) => new NextRequest("http://localhost/api/admin/access/users/user-1/overrides", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("named user access overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({ user: { id: "super-admin", role: "super_admin" } });
    mocks.userFindUnique.mockResolvedValue(target);
    mocks.roleOverrideFindMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation((work) => work({
      userCapabilityOverride: { findUnique: mocks.txOverrideFindUnique, upsert: mocks.txOverrideUpsert, update: mocks.txOverrideUpdate },
      user: { update: mocks.txUserUpdate }, auditLog: { create: mocks.txAuditCreate },
    }));
  });

  it("returns effective access metadata for a valid staff account", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/access/users/user-1/overrides"), params);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      userId: "user-1",
      role: "park_admin",
      isActive: true,
      roleOverrides: [],
    });
    expect(mocks.userFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        capabilityOverrides: expect.objectContaining({
          where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] },
        }),
      }),
    }));
  });

  it("denies non-Super-Admin callers before reading or changing access", async () => {
    mocks.requireRole.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await PUT(request("PUT", { capability: "attendance.mark", effect: "deny", reason: "Temporary absence" }), params);
    expect(response.status).toBe(403);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("requires named-user override capability before reading or changing access", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await PUT(request("PUT", { capability: "attendance.mark", effect: "deny", reason: "Temporary absence" }), params);
    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("access.user_overrides.manage");
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("rejects unsupported and protected capability codes before a transaction", async () => {
    for (const cap of ["access.scope.manage", "access.role_defaults.manage", "audit.view", "settings.manage"]) {
      const response = await PUT(request("PUT", { capability: cap, effect: "allow", reason: "Unsafe grant" }), params);
      expect(response.status).toBe(400);
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("writes an override, audit row, and session invalidation in one transaction", async () => {
    mocks.txOverrideFindUnique.mockResolvedValue(null);
    mocks.txOverrideUpsert.mockResolvedValue({ id: "override-1", capability: "attendance.mark", effect: "deny", reason: "Temporary absence", expiresAt: null, isActive: true, revokedAt: null, updatedAt: new Date() });
    const response = await PUT(request("PUT", { capability: "attendance.mark", effect: "deny", reason: "Temporary absence" }), params);
    expect(response.status).toBe(200);
    expect(mocks.txUserUpdate).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { tokenVersion: { increment: 1 } } });
    expect(mocks.txAuditCreate).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ override: { id: "override-1", effect: "deny" } });
  });

  it("persists a future expiry and includes it in the audit record", async () => {
    const expiresAt = "2099-08-01T12:00:00.000Z";
    const savedExpiry = new Date(expiresAt);
    mocks.txOverrideFindUnique.mockResolvedValue(null);
    mocks.txOverrideUpsert.mockResolvedValue({ id: "override-1", capability: "attendance.mark", effect: "deny", reason: "Temporary absence", expiresAt: savedExpiry, isActive: true, revokedAt: null, updatedAt: new Date() });

    const response = await PUT(request("PUT", { capability: "attendance.mark", effect: "deny", reason: "Temporary absence", expiresAt }), params);

    expect(response.status).toBe(200);
    expect(mocks.txOverrideUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ expiresAt: savedExpiry }),
      update: expect.objectContaining({ expiresAt: savedExpiry }),
    }));
    expect(mocks.createAuditLogData).toHaveBeenCalledWith(expect.objectContaining({
      newValues: expect.objectContaining({ expiresAt: savedExpiry }),
    }));
  });

  it("revokes an active override and invalidates existing sessions atomically", async () => {
    mocks.txOverrideFindUnique.mockResolvedValue({ id: "override-1", effect: "allow", isActive: true, expiresAt: null });
    mocks.txOverrideUpdate.mockResolvedValue({ id: "override-1", capability: "attendance.mark", effect: "allow", isActive: false, revokedAt: new Date(), updatedAt: new Date() });
    const response = await DELETE(request("DELETE", { capability: "attendance.mark", reason: "No longer required" }), params);
    expect(response.status).toBe(200);
    expect(mocks.txUserUpdate).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { tokenVersion: { increment: 1 } } });
    expect(mocks.txAuditCreate).toHaveBeenCalledTimes(1);
  });
});
