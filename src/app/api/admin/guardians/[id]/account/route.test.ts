import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  findGuardian: vi.fn(),
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
    guardian: { findUnique: mocks.findGuardian },
    user: { findUnique: mocks.findUser },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash } }));
vi.mock("crypto", () => ({ default: { randomBytes: mocks.randomBytes } }));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "guardian-1" }) };
const guardian = {
  id: "guardian-1",
  name: "Guardian One",
  phone: "+923001234568",
  isActive: true,
  userId: null,
  children: [{ participant: { group: { batch: { park: { cityId: "city-1" } } } } }],
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/guardians/guardian-1/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/guardians/[id]/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.findGuardian.mockResolvedValue(guardian);
    mocks.findUser.mockResolvedValue(null);
    mocks.randomBytes.mockReturnValue({ toString: () => "temporary-password" });
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      user: { create: vi.fn().mockResolvedValue({ id: "user-1", email: "guardian@example.com", name: "Guardian One", mustResetPwd: true, isActive: true }) },
      guardian: { update: vi.fn().mockResolvedValue({}) },
    }));
  });

  it("creates and links a guardian account with a forced reset", async () => {
    const response = await POST(request({ email: "guardian@example.com" }), params);

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store, no-cache, max-age=0, must-revalidate");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    await expect(response.json()).resolves.toMatchObject({
      temporaryPassword: "temporary-password",
      user: { id: "user-1", mustResetPwd: true },
    });
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "provision_guardian_login",
      newValues: { loginProvisioned: true },
    }));
  });

  it("denies before reading the guardian when the capability is missing", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(request({ email: "guardian@example.com" }), params);

    expect(response.status).toBe(403);
    expect(mocks.findGuardian).not.toHaveBeenCalled();
  });

  it("requires an existing single-city child link", async () => {
    mocks.findGuardian.mockResolvedValue({ ...guardian, children: [] });

    const response = await POST(request({ email: "guardian@example.com" }), params);

    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a foreign guardian city scope", async () => {
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await POST(request({ email: "guardian@example.com" }), params);

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid input before reading the guardian", async () => {
    const response = await POST(request({ email: "invalid" }), params);

    expect(response.status).toBe(400);
    expect(mocks.findGuardian).not.toHaveBeenCalled();
  });
});
