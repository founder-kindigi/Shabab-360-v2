import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auditLogCreate: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { auditLog: { create: mocks.auditLogCreate } },
}));

import { createAuditLogData, logAudit } from "./audit";

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the primary operation non-blocking but exposes a PII-safe structured failure", async () => {
    mocks.auditLogCreate.mockRejectedValue(new Error("database unavailable for guardian@example.test"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(logAudit({
      userId: "user-secret-id",
      action: "update",
      entityType: "guardian",
      entityId: "guardian-secret-id",
      oldValues: { email: "guardian@example.test" },
      newValues: { phone: "03001234567" },
    })).resolves.toBeUndefined();

    const event = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(event).toMatchObject({
      level: "error",
      event: "audit_write_failed",
      action: "update",
      entityType: "guardian",
      errorType: "Error",
    });
    expect(errorSpy.mock.calls[0][0]).not.toContain("guardian@example.test");
    expect(errorSpy.mock.calls[0][0]).not.toContain("guardian-secret-id");
    expect(errorSpy.mock.calls[0][0]).not.toContain("03001234567");
  });

  it("redacts personal and credential values before the audit record is persisted", async () => {
    mocks.auditLogCreate.mockResolvedValue({ id: "audit-1" });

    await logAudit({
      userId: "admin-1",
      action: "update",
      entityType: "guardian",
      entityId: "guardian-1",
      oldValues: {
        name: "Guardian Name",
        cnic: "35202-1234567-1",
        state: "active",
      },
      newValues: {
        email: "guardian@example.test",
        phone: "03001234567",
        temporaryPassword: "do-not-store-this",
        assignedParkId: "park-2",
      },
      reason: "Corrected guardian@example.test for 03001234567",
    });

    const persisted = mocks.auditLogCreate.mock.calls[0][0].data;
    expect(JSON.parse(persisted.oldValues)).toEqual({
      name: "[REDACTED]",
      cnic: "[REDACTED]",
      state: "active",
    });
    expect(JSON.parse(persisted.newValues)).toEqual({
      email: "[REDACTED]",
      phone: "[REDACTED]",
      temporaryPassword: "[REDACTED]",
      assignedParkId: "park-2",
    });
    expect(persisted.reason).toBe("Corrected [REDACTED] for [REDACTED]");
  });

  it("returns the same redacted payload for transactional audit writes", () => {
    const data = createAuditLogData({
      userId: "admin-1",
      action: "access_override_updated",
      entityType: "user_capability_override",
      entityId: "override-1",
      newValues: { capability: "attendance.mark", effect: "deny", email: "user@example.test" },
      reason: "Temporary restriction for user@example.test",
    });

    expect(JSON.parse(data.newValues!)).toEqual({
      capability: "attendance.mark",
      effect: "deny",
      email: "[REDACTED]",
    });
    expect(data.reason).toBe("Temporary restriction for [REDACTED]");
  });
});
