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
vi.mock("@/lib/db", () => ({ db: { participant: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { DELETE, PATCH } from "./route";

const params = { params: Promise.resolve({ id: "participant-1" }) };

describe("Shabab deactivation session revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.update.mockResolvedValue({ id: "participant-1", state: "inactive" });
  });

  it("revokes the linked session when a Shabab is set inactive through PATCH", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "participant-1", userId: "user-1", state: "active", name: "Shabab", phone: null, gender: null, groupId: "group-1",
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/students/participant-1", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: "inactive" }),
      }),
      params
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        state: "inactive",
        user: { update: { tokenVersion: { increment: 1 } } },
      }),
    }));
  });

  it("persists validated age and grade/class updates", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "participant-1", userId: null, state: "active", name: "Shabab", phone: null, gender: null, age: null, gradeClass: null, groupId: "group-1",
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/students/participant-1", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ age: "14", gradeClass: "9th" }),
      }),
      params
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ age: 14, gradeClass: "9th" }) }));
  });

  it("revokes the linked session when a Shabab is deactivated through DELETE", async () => {
    mocks.findUnique.mockResolvedValue({ id: "participant-1", userId: "user-1", state: "active", name: "Shabab" });

    const response = await DELETE(new NextRequest("http://localhost/api/admin/students/participant-1", { method: "DELETE" }), params);

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ user: { update: { tokenVersion: { increment: 1 } } } }),
    }));
  });

  it("denies student management before reading the participant", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await PATCH(new NextRequest("http://localhost/api/admin/students/participant-1", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: "inactive" }) }), params);
    expect(response.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
