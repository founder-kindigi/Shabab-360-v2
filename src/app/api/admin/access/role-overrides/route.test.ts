import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  transaction: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  deleteOverride: vi.fn(),
  updateMany: vi.fn(),
  auditCreate: vi.fn(),
  findMany: vi.fn(),
  createAuditLogData: vi.fn((data) => data),
  sanitizeAuditReason: vi.fn((value) => value)
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability
}));

vi.mock("@/lib/audit", () => ({
  createAuditLogData: mocks.createAuditLogData,
  sanitizeAuditReason: mocks.sanitizeAuditReason
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mocks.transaction,
    roleCapabilityOverride: {
      findMany: mocks.findMany,
    }
  }
}));

import { DELETE, GET, PUT } from "./route";

const request = (method: "PUT" | "DELETE", body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/admin/access/role-overrides", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

describe("role capability overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({ user: { id: "super-admin" } });
    mocks.transaction.mockImplementation((work) =>
      work({
        roleCapabilityOverride: {
          findUnique: mocks.findUnique,
          upsert: mocks.upsert,
          delete: mocks.deleteOverride
        },
        user: { updateMany: mocks.updateMany },
        auditLog: { create: mocks.auditCreate }
      })
    );
  });

  describe("GET /api/admin/access/role-overrides", () => {
    it("rejects non-Super-Admin callers", async () => {
      mocks.requireRole.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const response = await GET();
      expect(response.status).toBe(403);
      expect(mocks.findMany).not.toHaveBeenCalled();
    });

    it("requires role-default administration capability", async () => {
      mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const response = await GET();
      expect(response.status).toBe(403);
      expect(mocks.requireCapability).toHaveBeenCalledWith("access.role_defaults.manage");
      expect(mocks.findMany).not.toHaveBeenCalled();
    });

    it("returns defaults and overrides", async () => {
      mocks.findMany.mockResolvedValue([{ id: "override-1", role: "park_admin", capability: "attendance.mark", effect: "deny", reason: "test" }]);
      const response = await GET();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.defaults).toBeDefined();
      expect(data.overrides).toHaveLength(1);
      expect(mocks.findMany).toHaveBeenCalled();
    });
  });

  describe("PUT /api/admin/access/role-overrides", () => {
    it("rejects non-Super-Admin callers before a mutation", async () => {
      mocks.requireRole.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const response = await PUT(request("PUT", { role: "park_admin", capability: "attendance.mark", effect: "deny", reason: "Pilot policy" }));
      expect(response.status).toBe(403);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("requires role-default administration capability before a mutation", async () => {
      mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const response = await PUT(request("PUT", { role: "park_admin", capability: "attendance.mark", effect: "deny", reason: "Pilot policy" }));
      expect(response.status).toBe(403);
      expect(mocks.requireCapability).toHaveBeenCalledWith("access.role_defaults.manage");
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("protects Super Admin default role capability configurations", async () => {
      const response = await PUT(request("PUT", { role: "super_admin", capability: "attendance.mark", effect: "deny", reason: "Should fail" }));
      expect(response.status).toBe(422);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("protects access-administration capability defaults (access.*) from changes by non-Super-Admin roles", async () => {
      const response = await PUT(request("PUT", { role: "program_admin", capability: "access.scope.manage", effect: "allow", reason: "Unsafe" }));
      expect(response.status).toBe(422);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("allows audit.view and settings.manage configurations for non-Super-Admin roles", async () => {
      mocks.findUnique.mockResolvedValue(null);
      mocks.upsert.mockResolvedValue({ id: "override-1", role: "program_admin", capability: "audit.view", effect: "allow" });

      const response = await PUT(request("PUT", { role: "program_admin", capability: "audit.view", effect: "allow", reason: "Audit access for program manager" }));
      expect(response.status).toBe(200);
      expect(mocks.transaction).toHaveBeenCalled();
    });

    it("updates a role exception and invalidates active staff accounts of that role", async () => {
      mocks.findUnique.mockResolvedValue(null);
      mocks.upsert.mockResolvedValue({ id: "role-override-1", role: "park_admin", capability: "attendance.mark", effect: "deny", reason: "Pilot policy", updatedAt: new Date() });
      const response = await PUT(request("PUT", { role: "park_admin", capability: "attendance.mark", effect: "deny", reason: "Pilot policy" }));
      expect(response.status).toBe(200);
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { isActive: true, staffMeta: { is: { role: "park_admin" } } },
        data: { tokenVersion: { increment: 1 } }
      });
      expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    });

    it("invalidates student sessions using correct query filter", async () => {
      mocks.findUnique.mockResolvedValue(null);
      mocks.upsert.mockResolvedValue({ id: "role-override-2", role: "student", capability: "dashboard.view", effect: "deny", reason: "Block students" });

      const response = await PUT(request("PUT", { role: "student", capability: "dashboard.view", effect: "deny", reason: "Block students" }));
      expect(response.status).toBe(200);
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { isActive: true, participant: { isNot: null } },
        data: { tokenVersion: { increment: 1 } }
      });
    });

    it("invalidates guardian sessions using correct query filter", async () => {
      mocks.findUnique.mockResolvedValue(null);
      mocks.upsert.mockResolvedValue({ id: "role-override-3", role: "guardian", capability: "dashboard.view", effect: "deny", reason: "Block guardians" });

      const response = await PUT(request("PUT", { role: "guardian", capability: "dashboard.view", effect: "deny", reason: "Block guardians" }));
      expect(response.status).toBe(200);
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { isActive: true, guardian: { isNot: null } },
        data: { tokenVersion: { increment: 1 } }
      });
    });
  });

  describe("DELETE /api/admin/access/role-overrides", () => {
    it("protects Super Admin and access-administration defaults", async () => {
      const response = await DELETE(request("DELETE", { role: "program_admin", capability: "access.scope.manage", reason: "Attempt revoke protected" }));
      expect(response.status).toBe(422);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("reverts an existing exception in the same transaction", async () => {
      mocks.findUnique.mockResolvedValue({ id: "role-override-1", effect: "deny" });
      const response = await DELETE(request("DELETE", { role: "park_admin", capability: "attendance.mark", reason: "Restored default" }));
      expect(response.status).toBe(200);
      expect(mocks.deleteOverride).toHaveBeenCalledWith({ where: { id: "role-override-1" } });
      expect(mocks.updateMany).toHaveBeenCalledTimes(1);
      expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    });
  });
});
