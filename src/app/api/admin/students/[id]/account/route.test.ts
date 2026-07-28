import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  findParticipant: vi.fn(),
  findUser: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
  hash: vi.fn(),
  randomBytes: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    participant: { findUnique: mocks.findParticipant },
    user: { findUnique: mocks.findUser },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash } }));
vi.mock("crypto", () => ({ default: { randomBytes: mocks.randomBytes } }));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "participant-1" }) };
const participant = {
  id: "participant-1",
  name: "Student One",
  phone: "+923001234567",
  state: "active",
  userId: null,
  group: { id: "group-1", batch: { park: { id: "park-1", cityId: "city-1" } } },
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/students/participant-1/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/students/[id]/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.findParticipant.mockResolvedValue(participant);
    mocks.findUser.mockResolvedValue(null);
    mocks.randomBytes.mockReturnValue({ toString: () => "temporary-password" });
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      user: { create: vi.fn().mockResolvedValue({ id: "user-1", email: "student@example.com", name: "Student One", mustResetPwd: true, isActive: true }) },
      participant: { update: vi.fn().mockResolvedValue({}) },
    }));
  });

  it("creates and links an account with a forced reset", async () => {
    const response = await POST(request({ email: "student@example.com" }), params);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      temporaryPassword: "temporary-password",
      user: { id: "user-1", mustResetPwd: true },
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "provision_student_login",
      newValues: { loginProvisioned: true },
    }));
  });

  it("denies before reading the participant when the capability is missing", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(request({ email: "student@example.com" }), params);

    expect(response.status).toBe(403);
    expect(mocks.findParticipant).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a foreign participant scope without creating an account", async () => {
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(request({ email: "student@example.com" }), params);

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a duplicate existing student login", async () => {
    mocks.findParticipant.mockResolvedValue({ ...participant, userId: "existing-user" });

    const response = await POST(request({ email: "student@example.com" }), params);

    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid input before reading a participant", async () => {
    const response = await POST(request({ email: "not-an-email", extra: true }), params);

    expect(response.status).toBe(400);
    expect(mocks.findParticipant).not.toHaveBeenCalled();
  });
});
